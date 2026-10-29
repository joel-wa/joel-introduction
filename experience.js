import { HeadScroll } from "./head-scroll.js";

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
document.documentElement.classList.add("js-ready");
const storage = {
  get(key) { try { return sessionStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { sessionStorage.setItem(key, value); } catch {} }
};
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
let calm = reduced.matches || storage.get("joel-motion") === "off";
let pendingFrame = 0;
let pinned = false;
let galleryDistance = 0;
let selectedPhoto = 0;
let galleryAtIntro = true;
let original = false;
let setupInProgress = false;
let setupReadyTimer = 0;
let setupCloseTimer = 0;
let setupStep = 0;
const entrance = $("#entrance");
const photoDialog = $("#photo-dialog");
const gallery = $(".kitchen-scroll");
const galleryWindow = $(".gallery-window");
const track = $(".food-track");
const dishes = $$(".dish");
const photos = [
  { key: "pasta", title: "Egg-topped pasta", alt: "Golden swirled omelette over tomato-sauce spaghetti on a beige plate." },
  { key: "breakfast", title: "Omelette & cereal", alt: "Folded omelette and cereal with milk, on a wooden table." },
  { key: "noodles", title: "Noodles & chicken", alt: "Vegetable noodles with browned chicken in a beige bowl." }
];
const chapters = $$("[data-chapter]");
const navLinks = $$(".chapter-nav a");

function schedule() {
  if (!pendingFrame) pendingFrame = requestAnimationFrame(render);
}
function layout() {
  pinned = !calm && innerWidth > 900 && innerHeight > 620;
  gallery.classList.toggle("is-pinned", pinned);
  track.style.transform = "";
  galleryDistance = Math.max(0, track.scrollWidth - galleryWindow.clientWidth);
  gallery.style.setProperty("--pin-height", (innerHeight + galleryDistance * 1.1) + "px");
  if (pinned) galleryWindow.scrollLeft = 0;
  schedule();
}
function setMotion() {
  document.documentElement.classList.toggle("motion-off", calm);
  $("#motion-toggle").textContent = calm ? "Motion off" : "Motion on";
  $("#motion-toggle").setAttribute("aria-pressed", String(calm));
  $("#motion-toggle").title = calm ? "Turn on decorative motion" : "Turn off decorative motion";
  layout();
}
$("#motion-toggle").addEventListener("click", () => { calm = !calm; storage.set("joel-motion", calm ? "off" : "on"); setMotion(); });
reduced.addEventListener("change", () => { calm = reduced.matches || storage.get("joel-motion") === "off"; setMotion(); });

function render() {
  pendingFrame = 0;
  const total = document.documentElement.scrollHeight - innerHeight;
  document.documentElement.style.setProperty("--page-progress", total > 0 ? scrollY / total : 0);
  let active = "about";
  for (const section of chapters) if (section.getBoundingClientRect().top <= innerHeight * .36) active = section.dataset.chapter;
  for (const link of navLinks) {
    if (link.hash === "#" + active) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  }
  const hero = $(".hero");
  const heroProgress = Math.min(1, Math.max(0, -hero.getBoundingClientRect().top / hero.offsetHeight));
  hero.style.setProperty("--hero-p", calm ? 0 : heroProgress);
  const life = $(".life");
  const lifeProgress = Math.max(-1, Math.min(1, life.getBoundingClientRect().top / innerHeight));
  life.style.setProperty("--life-drift", calm ? "0px" : (lifeProgress * 42) + "px");
  let x = galleryWindow.scrollLeft;
  if (pinned) {
    const p = Math.min(1, Math.max(0, -gallery.getBoundingClientRect().top / Math.max(1, gallery.offsetHeight - innerHeight)));
    x = p * galleryDistance;
    track.style.transform = "translate3d(" + -x + "px,0,0)";
  }
  let nearest = 0, nearDistance = Infinity;
  dishes.forEach((dish, index) => {
    const relative = (dish.offsetLeft + dish.offsetWidth / 2 - x - galleryWindow.clientWidth / 2) / galleryWindow.clientWidth;
    const d = Math.abs(relative);
    if (d < nearDistance) { nearDistance = d; nearest = index; }
    const bend = calm ? 0 : Math.max(-1, Math.min(1, relative));
    dish.style.setProperty("--wrap-y", (-bend * 13) + "deg");
    dish.style.setProperty("--wrap-z", (bend * 2.8) + "deg");
    dish.style.setProperty("--wrap-lift", (Math.abs(bend) * 13) + "px");
    dish.style.setProperty("--photo-drift", (-bend * 12) + "px");
  });
  selectedPhoto = nearest;
  galleryAtIntro = x < dishes[0].offsetLeft - (galleryWindow.clientWidth - dishes[0].offsetWidth) / 2 - 40;
  $(".photo-counter").textContent = galleryAtIntro ? "3 photos" : "0" + (nearest + 1) + " / 03";
}
addEventListener("scroll", schedule, { passive: true });
addEventListener("resize", layout);
galleryWindow.addEventListener("scroll", schedule, { passive: true });
for (const image of document.images) image.addEventListener("load", layout, { once: true });

function goPhoto(index) {
  index = Math.max(0, Math.min(photos.length - 1, index));
  const dish = dishes[index];
  const x = Math.max(0, Math.min(galleryDistance, dish.offsetLeft - (galleryWindow.clientWidth - dish.offsetWidth) / 2));
  if (pinned) {
    const sectionTop = gallery.getBoundingClientRect().top + scrollY;
    scrollTo({ top: sectionTop + (galleryDistance ? x / galleryDistance : 0) * (gallery.offsetHeight - innerHeight), behavior: calm ? "instant" : "smooth" });
  } else galleryWindow.scrollTo({ left: x, behavior: calm ? "instant" : "smooth" });
  head.pauseForManualInput();
}
$(".photo-prev").addEventListener("click", () => goPhoto(selectedPhoto - 1));
$(".photo-next").addEventListener("click", () => goPhoto(galleryAtIntro ? 0 : selectedPhoto + 1));
galleryWindow.addEventListener("keydown", event => {
  if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
    event.preventDefault(); goPhoto(selectedPhoto + (event.key === "ArrowRight" ? 1 : -1));
  }
});

let dialogIndex = 0;
function showPhoto(index) {
  dialogIndex = (index + photos.length) % photos.length;
  const photo = photos[dialogIndex];
  $("#photo-title").textContent = photo.title;
  $("#dialog-photo").src = "assets/food/" + (original ? "originals/" : "") + photo.key + ".jpg";
  $("#dialog-photo").alt = photo.alt + (original ? " Original photograph." : " Photo refined with AI.");
  $("#photo-version").textContent = original ? "Original photograph" : "AI-refined photo";
  $("#toggle-original").textContent = original ? "Show refined photo" : "Show original";
}
$$(".photo-open").forEach(link => link.addEventListener("click", event => {
  if (!photoDialog.showModal) return;
  event.preventDefault(); original = false; showPhoto(Number(link.dataset.food)); photoDialog.showModal();
}));
$("#close-photo").addEventListener("click", () => photoDialog.close());
$("#toggle-original").addEventListener("click", () => { original = !original; showPhoto(dialogIndex); });
$("#dialog-prev").addEventListener("click", () => { original = false; showPhoto(dialogIndex - 1); });
$("#dialog-next").addEventListener("click", () => { original = false; showPhoto(dialogIndex + 1); });
photoDialog.addEventListener("keydown", event => {
  if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
    event.preventDefault(); original = false; showPhoto(dialogIndex + (event.key === "ArrowRight" ? 1 : -1));
  }
});
photoDialog.addEventListener("click", event => { if (event.target === photoDialog && event.clientY > photoDialog.getBoundingClientRect().bottom) photoDialog.close(); });
photoDialog.addEventListener("close", () => head.pauseForManualInput());

/* Clear choices first. Choosing normal controls is never a second-class route. */
function resetEntrance() {
  entrance.classList.remove("is-loading", "is-ready", "is-error", "is-minimizing");
  $("#head-panel").style.visibility = "";
  $("#entrance-title").innerHTML = "Look around.<br><em>Literally.</em>";
  $("#entrance-description").textContent = "Explore with your head, or make yourself at home with your mouse, keyboard, or touch.";
  $(".head-directions").hidden = false;
  $("#setup-status").hidden = true; $("#setup-steps").hidden = true;
  $("#start-head").hidden = false;
  $("#start-head").innerHTML = 'Try hands-free <span aria-hidden="true">↕</span>';
  $("#normal-entry").textContent = "Use mouse or touch →";
}
function closeEntrance() {
  clearTimeout(setupReadyTimer); clearTimeout(setupCloseTimer); setupReadyTimer = 0; setupCloseTimer = 0;
  const wasSettingUp = setupInProgress; setupInProgress = false;
  if (wasSettingUp) head.stop();
  entrance.close(); resetEntrance(); storage.set("joel-entered", "yes");
}
function setupProgress(step, text, phase) {
  setupStep = step;
  entrance.classList.toggle("is-loading", phase === "loading");
  entrance.classList.toggle("is-ready", phase === "ready");
  entrance.classList.toggle("is-error", phase === "error");
  $(".head-directions").hidden = true;
  $("#setup-status").hidden = false; $("#setup-steps").hidden = false;
  $("#start-head").hidden = phase !== "error";
  $("#normal-entry").textContent = phase === "error" ? "Use mouse or touch →" : "Cancel and use mouse / touch →";
  $("#entrance-title").innerHTML = phase === "ready" ? "You're ready.<br><em>Look around.</em>" : phase === "error" ? "A little pause.<br><em>Let's try again.</em>" : "Getting<br><em>ready.</em>";
  $("#entrance-description").textContent = phase === "ready" ? "Face the camera and look straight for a moment. Your small control panel is ready." : phase === "error" ? "Your usual controls are ready whenever you are." : "Stay here while your camera and AI get ready. Your camera images stay in this browser.";
  $("#setup-title").textContent = phase === "ready" ? "Hands-free is ready" : phase === "error" ? "Setup paused" : step === 0 ? "Opening your camera" : "Loading the AI model";
  $("#setup-message").textContent = text;
  $$("#setup-steps li").forEach((item, index) => {
    item.classList.toggle("is-done", index < step || phase === "ready");
    if (index === step) item.setAttribute("aria-current", "step"); else item.removeAttribute("aria-current");
  });
  if (phase === "error") $("#start-head").textContent = "Try again ↗";
}
function startWithOnboarding() {
  clearTimeout(setupReadyTimer); clearTimeout(setupCloseTimer); setupReadyTimer = 0; setupCloseTimer = 0;
  resetEntrance(); setupInProgress = true; setupStep = 0;
  if (!entrance.open) entrance.showModal();
  head.start();
}
$$("[data-close-entrance]").forEach(button => button.addEventListener("click", closeEntrance));
entrance.addEventListener("cancel", event => { event.preventDefault(); closeEntrance(); });

const head = new HeadScroll({
  onScroll(delta) {
    const r = gallery.getBoundingClientRect();
    const nativeGalleryVisible = !pinned && r.top <= 85 && r.bottom >= innerHeight * .6;
    const canBrowse = delta > 0 ? galleryWindow.scrollLeft < galleryDistance - 2 : galleryWindow.scrollLeft > 2;
    if (nativeGalleryVisible && canBrowse) galleryWindow.scrollBy({ left: delta, behavior: "instant" });
    else scrollBy({ top: delta, behavior: "instant" });
  },
  onState(state) {
    const panel = $("#head-panel");
    panel.hidden = state.phase === "off" || setupInProgress;
    panel.classList.toggle("is-active", state.active);
    $("#head-status").textContent = state.text;
    $("#head-arrow").textContent = state.direction > 0 ? "↓" : state.direction < 0 ? "↑" : "—";
    $("#head-control").setAttribute("aria-pressed", String(state.active || state.starting));
    $("#head-control").innerHTML = state.starting ? '<span aria-hidden="true">↕</span> Starting…' : state.active ? '<span aria-hidden="true">↕</span> Camera on' : '<span aria-hidden="true">↕</span> Hands-free';
    $("#retry-head").hidden = state.phase !== "error";
    $("#head-speed").disabled = state.starting;
    if (setupInProgress && state.phase === "loading") {
      setupProgress(state.text.includes("Loading") ? 1 : 0, state.text, "loading");
    } else if (setupInProgress && state.phase === "error") {
      clearTimeout(setupReadyTimer); clearTimeout(setupCloseTimer); setupReadyTimer = 0; setupCloseTimer = 0;
      setupProgress(setupStep, state.text, "error");
    } else if (setupInProgress && state.phase === "off") {
      clearTimeout(setupReadyTimer); clearTimeout(setupCloseTimer); setupReadyTimer = 0; setupCloseTimer = 0;
      setupInProgress = false; entrance.close(); resetEntrance();
    } else if (setupInProgress && state.active && !setupReadyTimer) {
      setupProgress(2, "Look straight to stay still. Look down or up when you want to move.", "ready");
      setupReadyTimer = setTimeout(() => {
        if (!head.running) return;
        panel.hidden = false; panel.style.visibility = "hidden";
        const dock = panel.getBoundingClientRect(), box = entrance.getBoundingClientRect();
        entrance.style.setProperty("--dock-x", (dock.x + dock.width / 2 - box.x - box.width / 2) + "px");
        entrance.style.setProperty("--dock-y", (dock.y + dock.height / 2 - box.y - box.height / 2) + "px");
        entrance.style.setProperty("--dock-sx", dock.width / box.width);
        entrance.style.setProperty("--dock-sy", dock.height / box.height);
        entrance.classList.add("is-minimizing");
        setupCloseTimer = setTimeout(() => {
          if (!head.running) return;
          setupInProgress = false; entrance.close(); resetEntrance(); panel.hidden = false;
          storage.set("joel-entered", "yes");
        }, calm ? 0 : 360);
      }, 600);
    }
  }
});
$("#head-control").addEventListener("click", () => {
  if (head.running || head.starting) head.stop();
  else { resetEntrance(); entrance.showModal(); }
});
$("#start-head").addEventListener("click", startWithOnboarding);
$("#stop-head").addEventListener("click", () => head.stop());
$("#retry-head").addEventListener("click", startWithOnboarding);
$("#head-speed").addEventListener("change", event => { head.speed = Number(event.target.value); head.pauseForManualInput(); });
["wheel", "touchstart", "pointerdown", "keydown"].forEach(type => addEventListener(type, () => head.pauseForManualInput(), { passive: true }));
document.addEventListener("visibilitychange", () => { if (document.hidden) head.stop(); });
addEventListener("pagehide", () => head.stop(false));
setMotion();
// Native fragment positioning runs before the pinned gallery is measured.
// Restore the requested chapter once its final document position is known.
if (location.hash) requestAnimationFrame(() => requestAnimationFrame(() => {
  const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (target) target.scrollIntoView({ behavior: "instant", block: "start" });
}));
if (!storage.get("joel-entered") && entrance.showModal) entrance.showModal();

