import p5 from "p5";
import { sketches } from "./sketches/index.js";

const selectEl = document.getElementById("sketch-select");
const regenerateEl = document.getElementById("regenerate");
const saveFrameEl = document.getElementById("save-frame");
const themeToggleEl = document.getElementById("theme-toggle");
const canvasContainerEl = document.getElementById("canvas-container");
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
const rootEl = document.documentElement;

let currentSketch = sketches[0].id;
let currentP5 = null;
let currentTheme = "light";

function resolveInitialTheme() {
  const stored = window.localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") {
    return stored;
  }
  return prefersDark.matches ? "dark" : "light";
}

function applyTheme(theme) {
  currentTheme = theme;
  rootEl.setAttribute("data-theme", theme);

  if (themeToggleEl) {
    const isDark = theme === "dark";
    themeToggleEl.textContent = isDark ? "Light Mode" : "Dark Mode";
    themeToggleEl.setAttribute("aria-pressed", String(isDark));
  }
}

function populateSketches() {
  for (const sketch of sketches) {
    const option = document.createElement("option");
    option.value = sketch.id;
    option.textContent = sketch.title;
    selectEl.append(option);
  }
}

function mountSketch(sketchId) {
  const sketch = sketches.find((entry) => entry.id === sketchId);
  if (!sketch) {
    return;
  }

  if (currentP5) {
    currentP5.remove();
  }

  currentSketch = sketch.id;
  currentP5 = new p5(
    (p) => sketch.create({ p, theme: currentTheme }),
    canvasContainerEl,
  );
  document.title = `Generative Art - ${sketch.title}`;
}

applyTheme(resolveInitialTheme());
populateSketches();
mountSketch(currentSketch);

selectEl.value = currentSketch;

selectEl.addEventListener("change", (event) => {
  mountSketch(event.target.value);
});

regenerateEl.addEventListener("click", () => {
  mountSketch(currentSketch);
});

if (themeToggleEl) {
  themeToggleEl.addEventListener("click", () => {
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
    window.localStorage.setItem("theme", nextTheme);
    mountSketch(currentSketch);
  });
}

saveFrameEl.addEventListener("click", () => {
  if (currentP5) {
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    currentP5.saveCanvas(`sketch-${currentSketch}-${stamp}`, "png");
  }
});
