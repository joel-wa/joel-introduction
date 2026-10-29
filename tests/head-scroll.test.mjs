import test from "node:test";
import assert from "node:assert/strict";
import { classifyPose, PoseGate, HeadScroll } from "../head-scroll.js";

const face = { keypoints: [{ part: "nose", score: .95 }, { part: "leftEye", score: .95 }, { part: "rightEye", score: .95 }] };
const prediction = (className, probability = .95) => [{ className, probability }];
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return { promise, resolve, reject }; };
function fixture({ permission, play, modelLoad } = {}) {
  let clock = 1000, next = 1, modal = false;
  const timers = new Map(), frames = new Map(), states = [], scrolls = [], requests = [];
  const track = { stops: 0, stop() { this.stops++; }, addEventListener() {} };
  const stream = { getTracks: () => [track], getVideoTracks: () => [track] };
  const video = { videoWidth: 640, videoHeight: 480, readyState: 4, srcObject: null, paused: false, async play() { if (play) return play(); }, pause() { this.paused = true; } };
  const model = { async estimatePose() { return { pose: face, posenetOutput: [] }; }, async predict() { return prediction("head_straight"); } };
  const context = Object.fromEntries(["save","translate","scale","drawImage","restore"].map(k => [k, () => {}]));
  const env = {
    isSecureContext: true,
    performance: { now: () => clock },
    navigator: { mediaDevices: { getUserMedia(options) { requests.push(options); return permission ? permission(stream) : Promise.resolve(stream); } } },
    document: { hidden: false, querySelector: () => modal ? {} : null, createElement(tag) { if (tag === "video") return video; if (tag === "canvas") return { getContext: () => context }; throw Error("Unexpected external script"); } },
    tf: {}, tmPose: { load: (...args) => modelLoad ? modelLoad(...args) : Promise.resolve(model) },
    setTimeout(fn) { const id = next++; timers.set(id, fn); return id; }, clearTimeout(id) { timers.delete(id); },
    requestAnimationFrame(fn) { const id = next++; frames.set(id, fn); return id; }, cancelAnimationFrame(id) { frames.delete(id); },
    scrollBy(value) { scrolls.push(value); }
  };
  const head = new HeadScroll({ environment: env, onState: state => states.push(state) });
  return { head, env, states, scrolls, requests, timers, frames, stream, track, video, model,
    setClock(value) { clock = value; }, setModal(value) { modal = value; } };
}

test("trained head labels map to screen scroll directions", () => {
  assert.deepEqual(classifyPose(prediction("Head Down"), face), { direction: 1, confident: true });
  assert.deepEqual(classifyPose(prediction("head-up"), face), { direction: -1, confident: true });
  assert.deepEqual(classifyPose(prediction("Head Straight"), face), { direction: 0, confident: true });
});
test("missing face or uncertain model output never scrolls", () => {
  assert.equal(classifyPose(prediction("Head Down"), { keypoints: [] }).confident, false);
  assert.equal(classifyPose(prediction("Head Down", .7), face).confident, false);
});
test("neutral pose must be held before navigation can arm", () => {
  const gate = new PoseGate();
  gate.update({ direction: 1, confident: true }, 0);
  gate.update({ direction: 1, confident: true }, 1000);
  assert.equal(gate.armed, false);
  gate.update({ direction: 0, confident: true }, 1200);
  gate.update({ direction: 0, confident: true }, 1900);
  assert.equal(gate.armed, true);
});
test("a deliberate sustained pose is required; straight and uncertainty stop immediately", () => {
  const gate = new PoseGate();
  gate.update({ direction: 0, confident: true }, 0);
  gate.update({ direction: 0, confident: true }, 700);
  assert.equal(gate.update({ direction: 1, confident: true }, 800), 0);
  assert.equal(gate.update({ direction: 1, confident: true }, 1100), 0);
  assert.equal(gate.update({ direction: 1, confident: true }, 1250), 1);
  assert.equal(gate.update({ direction: 0, confident: true }, 1260), 0);
  gate.update({ direction: -1, confident: true }, 1300);
  assert.equal(gate.update({ direction: -1, confident: true }, 1750), -1);
  assert.equal(gate.update({ direction: 1, confident: false }, 1760), 0);
});
test("opening a website/controller requests no camera or external scripts", () => {
  const f = fixture();
  assert.equal(f.requests.length, 0); assert.equal(f.head.running, false);
});
test("camera permission denial leaves normal navigation available", async () => {
  const f = fixture({ permission: () => Promise.reject(Object.assign(new Error(), { name: "NotAllowedError" })) });
  await f.head.start();
  assert.equal(f.head.running, false); assert.equal(f.head.starting, false);
  assert.match(f.states.at(-1).text, /not allowed/i);
  assert.equal(f.states.at(-1).phase, "error");
});
test("camera request is video only and startup can be stopped", async () => {
  const f = fixture(); await f.head.start();
  assert.equal(f.requests[0].audio, false); assert.equal(f.head.running, true);
  f.head.stop();
  assert.equal(f.track.stops, 1); assert.equal(f.video.srcObject, null);
  assert.equal(f.head.running, false); assert.equal(f.frames.size, 0);
});
test("cancelled permission requests release any late-arriving camera stream", async () => {
  const pending = deferred();
  const f = fixture({ permission: () => pending.promise });
  const start = f.head.start(); f.head.stop(); pending.resolve(f.stream); await start;
  assert.equal(f.track.stops, 1); assert.equal(f.head.running, false); assert.equal(f.head.video, null);
});
test("a delayed model cannot re-enable navigation after Turn off", async () => {
  const pending = deferred();
  const f = fixture({ modelLoad: () => pending.promise });
  const start = f.head.start();
  for (let i=0;i<8;i++) await Promise.resolve();
  f.head.stop(); pending.resolve(f.model); await start;
  assert.equal(f.head.running, false); assert.equal(f.track.stops, 1); assert.equal(f.head.stream, null);
});
test("video playback failure releases the camera", async () => {
  const f = fixture({ play: () => Promise.reject(new Error("No video frame")) });
  await f.head.start();
  assert.equal(f.track.stops, 1); assert.equal(f.head.running, false);
  assert.equal(f.states.at(-1).phase, "error");
});
test("model download failure releases the camera and offers a retry", async () => {
  const f = fixture({ modelLoad: () => Promise.reject(new Error("Offline")) });
  await f.head.start();
  assert.equal(f.track.stops, 1); assert.equal(f.head.starting, false);
  assert.equal(f.states.at(-1).phase, "error");
});
test("fresh predictions scroll; stale predictions, modals, manual input and hidden tabs do not", () => {
  const f = fixture(), h = f.head;
  h.running = true; h.token = 3; h.gate.direction = 1; h.lastPrediction = 1000; h.lastMotion = 1000;
  f.setClock(1040); h.animate(3); assert.equal(f.scrolls.length, 1);
  f.setModal(true); f.setClock(1080); h.animate(3); assert.equal(f.scrolls.length, 1);
  f.setModal(false); h.pauseForManualInput(); f.setClock(1120); h.animate(3); assert.equal(f.scrolls.length, 1);
  h.manualUntil = 0; f.setClock(2000); h.animate(3); assert.equal(f.scrolls.length, 1);
  h.lastPrediction = 2000; f.env.document.hidden = true; f.setClock(2040); h.animate(3); assert.equal(f.scrolls.length, 1);
  h.stop();
});
test("rapid repeated Start clicks do not create duplicate camera requests", async () => {
  const pending = deferred(), f = fixture({ permission: () => pending.promise });
  const first = f.head.start(); await f.head.start(); assert.equal(f.requests.length, 1);
  f.head.stop(); pending.resolve(f.stream); await first;
});

