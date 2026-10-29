/* The model and camera are loaded only after an explicit Start click. */
export const MODEL_URL = "https://teachablemachine.withgoogle.com/models/zNyUtT5ED/";

export function classifyPose(predictions, pose) {
  const face = pose?.keypoints?.filter(p => /nose|eye/i.test(p.part) && p.score >= .3).length >= 2;
  if (!face || !predictions?.length) return { direction: 0, confident: false };
  const best = predictions.reduce((a, b) => a.probability > b.probability ? a : b);
  if (best.probability < .8) return { direction: 0, confident: false };
  const name = best.className.toLowerCase().trim().replace(/[\s-]+/g, "_");
  if (name.includes("straight") || name.includes("neutral")) return { direction: 0, confident: true };
  if (name.includes("down")) return { direction: 1, confident: true };
  if (name.includes("up")) return { direction: -1, confident: true };
  return { direction: 0, confident: false };
}

/* Neutral first; then a deliberate, sustained pose. Uncertainty always stops. */
export class PoseGate {
  constructor() { this.reset(); }
  reset() { this.armed = false; this.neutralSince = null; this.candidate = 0; this.candidateSince = 0; this.direction = 0; }
  update(sample, now) {
    if (!sample.confident) { this.direction = 0; this.candidate = 0; this.neutralSince = null; return 0; }
    if (!this.armed) {
      if (sample.direction === 0) {
        if (this.neutralSince === null) this.neutralSince = now;
        if (now - this.neutralSince >= 700) this.armed = true;
      } else this.neutralSince = null;
      return 0;
    }
    if (sample.direction === 0) { this.direction = 0; this.candidate = 0; return 0; }
    if (this.candidate !== sample.direction) {
      this.candidate = sample.direction; this.candidateSince = now; this.direction = 0;
    } else if (now - this.candidateSince >= 450) this.direction = sample.direction;
    return this.direction;
  }
}

export class HeadScroll {
  constructor({ onState = () => {}, environment = globalThis, onScroll = null } = {}) {
    this.env = environment; this.onState = onState; this.gate = new PoseGate();
    this.onScroll = onScroll || (delta => this.env.scrollBy({ top: delta, behavior: "instant" }));
    this.token = 0; this.running = false; this.starting = false; this.speed = 250;
    this.manualUntil = 0; this.lastPrediction = 0; this.lastMotion = 0;
    this.model = null; this.stream = null; this.video = null;
    this.timer = null; this.frame = null; this.errors = 0; this.lastStatus = "";
  }
  status(text, phase = "active", direction = 0) {
    const key = phase + text + direction;
    if (this.lastStatus === key) return;
    this.lastStatus = key;
    this.onState({ text, phase, direction, active: this.running, starting: this.starting });
  }
  pauseForManualInput() { this.manualUntil = this.env.performance.now() + 1500; }
  stop(announce = true) {
    this.token++; this.running = false; this.starting = false;
    this.env.clearTimeout(this.timer); this.env.cancelAnimationFrame(this.frame);
    this.timer = null; this.frame = null;
    if (this.stream) this.stream.getTracks().forEach(t => t.stop());
    if (this.video) { this.video.pause(); this.video.srcObject = null; }
    this.stream = null; this.video = null; this.gate.reset(); this.lastPrediction = 0;
    if (announce) this.status("Hands-free off. Use your mouse, keyboard, or touch.", "off");
  }
  async script(url) {
    return new Promise((resolve, reject) => {
      const s = this.env.document.createElement("script");
      s.src = url; s.async = true;
      const timeout = this.env.setTimeout(() => { s.remove(); reject(new Error("The AI download took too long. Please retry.")); }, 20000);
      s.onload = () => { this.env.clearTimeout(timeout); resolve(); };
      s.onerror = () => { this.env.clearTimeout(timeout); s.remove(); reject(new Error("The AI could not download. Check your connection and retry.")); };
      this.env.document.head.appendChild(s);
    });
  }
  async libraries() {
    if (!this.env.tf) await this.script("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@1.3.1/dist/tf.min.js");
    if (!this.env.tmPose) await this.script("https://cdn.jsdelivr.net/npm/@teachablemachine/pose@0.8.3/dist/teachablemachine-pose.min.js");
  }
  async start() {
    if (this.starting || this.running) return;
    this.stop(false);
    const token = ++this.token;
    this.starting = true; this.errors = 0;
    this.status("Allow the camera to try hands-free. You can cancel with Turn off.", "loading");
    try {
      if (!this.env.isSecureContext || !this.env.navigator.mediaDevices?.getUserMedia) throw new Error("Camera access needs HTTPS and a supported browser. Normal controls still work.");
      const stream = await this.env.navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 20 } } });
      if (token !== this.token) { stream.getTracks().forEach(t => t.stop()); return; }
      this.stream = stream;
      stream.getVideoTracks().forEach(t => t.addEventListener?.("ended", () => { if (this.running || this.starting) this.stop(); }, { once: true }));
      const video = this.env.document.createElement("video");
      video.autoplay = true; video.muted = true; video.playsInline = true; video.srcObject = stream;
      this.video = video;
      let timeout;
      try {
        await Promise.race([video.play(), new Promise((_, reject) => {
          timeout = this.env.setTimeout(() => reject(new Error("The camera opened but no video arrived. Close other camera apps and retry.")), 15000);
        })]);
      } finally { this.env.clearTimeout(timeout); }
      if (token !== this.token) return;
      if (!video.videoWidth || !video.videoHeight) throw new Error("The camera did not provide a usable image. Try another camera.");
      this.status("Camera ready. Loading the same trained model used by Headwind…", "loading");
      await this.libraries();
      if (token !== this.token) return;
      if (!this.model) {
        let modelTimeout;
        try {
          this.model = await Promise.race([
            this.env.tmPose.load(MODEL_URL + "model.json", MODEL_URL + "metadata.json"),
            new Promise((_, reject) => { modelTimeout = this.env.setTimeout(() => reject(new Error("The model download took too long. Please retry or use normal controls.")), 30000); })
          ]);
        } finally { this.env.clearTimeout(modelTimeout); }
      }
      if (token !== this.token) return;
      this.canvas = this.env.document.createElement("canvas");
      this.canvas.width = this.canvas.height = 200;
      this.context = this.canvas.getContext("2d");
      if (!this.context) throw new Error("This browser could not prepare camera images.");
      this.starting = false; this.running = true; this.gate.reset();
      this.status("Look straight and hold still for a moment to get ready.");
      this.lastMotion = this.env.performance.now();
      this.predict(token);
      this.animate(token);
    } catch (error) {
      if (token !== this.token) return;
      const messages = {
        NotAllowedError: "Camera access was not allowed. You can retry or use normal controls.",
        PermissionDeniedError: "Camera access was not allowed. You can retry or use normal controls.",
        NotFoundError: "No camera was found. Normal controls still work.",
        NotReadableError: "The camera is busy. Close other camera apps, then retry.",
        OverconstrainedError: "This camera could not use the requested settings. Try another camera."
      };
      this.stop(false);
      this.status(messages[error?.name] || error?.message || "Camera startup failed. Normal controls still work.", "error");
    }
  }
  async predict(token) {
    if (!this.running || token !== this.token) return;
    try {
      const video = this.video;
      if (video.readyState < 2) throw new Error("Waiting for video");
      const size = Math.min(video.videoWidth, video.videoHeight);
      const ctx = this.context;
      ctx.save(); ctx.translate(200, 0); ctx.scale(-1, 1);
      ctx.drawImage(video, (video.videoWidth - size) / 2, (video.videoHeight - size) / 2, size, size, 0, 0, 200, 200); ctx.restore();
      const result = await this.model.estimatePose(this.canvas);
      if (!this.running || token !== this.token) return;
      const predictions = await this.model.predict(result.posenetOutput);
      if (!this.running || token !== this.token) return;
      const now = this.env.performance.now();
      const sample = classifyPose(predictions, result.pose);
      const direction = this.gate.update(sample, now);
      this.lastPrediction = now; this.errors = 0;
      if (!sample.confident) this.status("Keep your face visible. Look straight to stay still.");
      else if (!this.gate.armed) this.status("Look straight and hold still for a moment to get ready.");
      else if (now < this.manualUntil) this.status("Normal controls in use. Head scrolling is briefly paused.");
      else if (direction === 1) this.status("Looking down · scrolling down", "active", 1);
      else if (direction === -1) this.status("Looking up · scrolling up", "active", -1);
      else this.status("Looking straight · stopped. Look down or up to scroll.");
    } catch {
      if (!this.running || token !== this.token) return;
      this.gate.update({ confident: false, direction: 0 }, this.env.performance.now());
      this.lastPrediction = 0;
      if (++this.errors >= 3) {
        this.stop(false);
        this.status("The AI lost the camera image. Please retry, or use normal controls.", "error");
        return;
      }
      this.status("Tracking paused. Keep your face visible.");
    }
    if (this.running && token === this.token) this.timer = this.env.setTimeout(() => this.predict(token), 120);
  }
  animate(token) {
    if (!this.running || token !== this.token) return;
    const now = this.env.performance.now();
    const dt = Math.min(50, Math.max(0, now - this.lastMotion)) / 1000;
    this.lastMotion = now;
    const modal = this.env.document.querySelector("dialog[open]");
    if (!modal && !this.env.document.hidden && now >= this.manualUntil && this.lastPrediction > 0 && now - this.lastPrediction < 750 && this.gate.direction) {
      this.onScroll(this.gate.direction * this.speed * dt);
    }
    this.frame = this.env.requestAnimationFrame(() => this.animate(token));
  }
}

