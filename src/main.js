import p5 from "p5";
import { sketches } from "./sketches/index.js";

const selectEl = document.getElementById("sketch-select");
const regenerateEl = document.getElementById("regenerate");
const saveFrameEl = document.getElementById("save-frame");
const canvasContainerEl = document.getElementById("canvas-container");

let currentSketch = sketches[0].id;
let currentP5 = null;

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
  currentP5 = new p5(sketch.factory, canvasContainerEl);
  document.title = `Generative Art - ${sketch.title}`;
}

populateSketches();
mountSketch(currentSketch);

selectEl.value = currentSketch;

selectEl.addEventListener("change", (event) => {
  mountSketch(event.target.value);
});

regenerateEl.addEventListener("click", () => {
  mountSketch(currentSketch);
});

saveFrameEl.addEventListener("click", () => {
  if (currentP5) {
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    currentP5.saveCanvas(`sketch-${currentSketch}-${stamp}`, "png");
  }
});
