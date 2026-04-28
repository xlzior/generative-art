import p5 from "p5";
import {
  createIcons,
  Download,
  Moon,
  RefreshCw,
  RotateCcw,
  Save,
} from "lucide";
import { sketches } from "./sketches/index.js";
import type { SketchModuleWithDefaults, Theme } from "./types/sketch.js";

const selectEl = document.getElementById("sketch-select") as HTMLSelectElement;
const regenerateEl = document.getElementById("regenerate") as HTMLButtonElement;
const saveFrameEl = document.getElementById("save-frame") as HTMLButtonElement;
const themeToggleEl = document.getElementById(
  "theme-toggle",
) as HTMLButtonElement;
const themeToggleLabelEl = document.getElementById(
  "theme-toggle-label",
) as HTMLElement;
const resetParamsEl = document.getElementById(
  "reset-params",
) as HTMLButtonElement;
const saveDefaultsEl = document.getElementById(
  "save-defaults",
) as HTMLButtonElement;
const saveDefaultsLabelEl = document.getElementById(
  "save-defaults-label",
) as HTMLElement;
const saveStatusEl = document.getElementById(
  "save-status",
) as HTMLElement;
const paramsListEl = document.getElementById("params-list") as HTMLElement;
const canvasContainerEl = document.getElementById(
  "canvas-container",
) as HTMLElement;
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
const rootEl = document.documentElement;

createIcons({
  icons: {
    Download,
    Moon,
    RefreshCw,
    RotateCcw,
    Save,
  },
});

let currentSketch = sketches[0].id;
let currentP5: p5 | null = null;
let currentTheme: Theme = "light";
const paramsBySketch = new Map<string, Record<string, number>>();

function getSketchById(sketchId: string): SketchModuleWithDefaults | undefined {
  return sketches.find((entry) => entry.id === sketchId);
}

function resolveInitialSketch(): string {
  const params = new URLSearchParams(window.location.search);
  const sketchFromUrl = params.get("sketch");

  if (sketchFromUrl && getSketchById(sketchFromUrl)) {
    return sketchFromUrl;
  }

  return sketches[0].id;
}

function writeSketchToUrl(sketchId: string): void {
  const url = new URL(window.location.href);
  url.searchParams.set("sketch", sketchId);
  window.history.replaceState({}, "", url);
}

function cloneDefaults(
  sketch: SketchModuleWithDefaults,
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(sketch.defaults).map(([key, value]) => [key, Number(value)]),
  );
}

function getParamsForSketch(
  sketch: SketchModuleWithDefaults,
): Record<string, number> {
  if (!paramsBySketch.has(sketch.id)) {
    paramsBySketch.set(sketch.id, cloneDefaults(sketch));
  }

  return paramsBySketch.get(sketch.id)!;
}

function formatParamValue(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return value
    .toFixed(3)
    .replace(/\.0+$/, "")
    .replace(/(\.\d*?)0+$/, "$1");
}

function renderSketchParameters(sketch: SketchModuleWithDefaults): void {
  const params = getParamsForSketch(sketch);
  paramsListEl.innerHTML = "";

  for (const parameter of sketch.parameters) {
    const row = document.createElement("div");
    row.className = "param-control";

    const label = document.createElement("label");
    label.setAttribute("for", `param-${sketch.id}-${parameter.key}`);
    label.textContent = parameter.label;

    const valueEl = document.createElement("span");
    valueEl.className = "param-value";
    valueEl.textContent = formatParamValue(params[parameter.key]);

    const input = document.createElement("input");
    input.type = "range";
    input.id = `param-${sketch.id}-${parameter.key}`;
    input.min = String(parameter.min);
    input.max = String(parameter.max);
    input.step = String(parameter.step ?? 1);
    input.value = String(params[parameter.key]);

    input.addEventListener("input", (event) => {
      const target = event.target as HTMLInputElement;
      params[parameter.key] = Number(target.value);
      valueEl.textContent = formatParamValue(params[parameter.key]);
      mountSketch(currentSketch, { redrawControls: false });
    });

    row.append(label, valueEl, input);
    paramsListEl.append(row);
  }
}

function resolveInitialTheme(): Theme {
  const stored = window.localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") {
    return stored;
  }
  return prefersDark.matches ? "dark" : "light";
}

function applyTheme(theme: Theme): void {
  currentTheme = theme;
  rootEl.setAttribute("data-theme", theme);

  if (themeToggleEl) {
    const isDark = theme === "dark";
    if (themeToggleLabelEl) {
      themeToggleLabelEl.textContent = isDark ? "Light Mode" : "Dark Mode";
    }
    themeToggleEl.setAttribute("aria-pressed", String(isDark));
  }
}

function populateSketches(): void {
  for (const sketch of sketches) {
    const option = document.createElement("option");
    option.value = sketch.id;
    option.textContent = sketch.title;
    selectEl.append(option);
  }
}

interface MountSketchOptions {
  redrawControls?: boolean;
  updateUrl?: boolean;
}

function mountSketch(
  sketchId: string,
  options: MountSketchOptions = {},
): void {
  const { redrawControls = true, updateUrl = true } = options;
  const sketch = getSketchById(sketchId);
  if (!sketch) {
    return;
  }

  const params = getParamsForSketch(sketch);

  if (redrawControls) {
    renderSketchParameters(sketch);
  }

  if (currentP5) {
    currentP5.remove();
  }

  currentSketch = sketch.id;
  if (updateUrl) {
    writeSketchToUrl(currentSketch);
  }
  currentP5 = new p5(
    (p) => sketch.create({ p, theme: currentTheme, params }),
    canvasContainerEl,
  );
  document.title = sketch.title;
}

async function saveCurrentParamsAsDefaults(): Promise<void> {
  const sketch = sketches.find((entry) => entry.id === currentSketch);
  if (!sketch) {
    return;
  }

  const params = getParamsForSketch(sketch);
  const payload = {
    defaultsFile: sketch.defaultsFile,
    defaults: params,
  };

  saveDefaultsEl.disabled = true;
  const previousLabel = saveDefaultsLabelEl
    ? saveDefaultsLabelEl.textContent
    : saveDefaultsEl.textContent;
  const previousTitle = saveDefaultsEl.title;
  if (saveDefaultsLabelEl) {
    saveDefaultsLabelEl.textContent = "Saving...";
  } else {
    saveDefaultsEl.textContent = "Saving...";
  }
  saveDefaultsEl.title = "";
  if (saveStatusEl) {
    saveStatusEl.textContent = "Saving defaults...";
  }

  try {
    const response = await fetch("/__sketch-defaults", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let message = "Failed to persist defaults";
      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        const data = await response.json() as { message?: string };
        message = data.message || message;
      } else {
        const text = await response.text();
        if (text) {
          message = text;
        }
      }

      if (response.status === 404) {
        message =
          "Save endpoint not available. Run with pnpm dev or pnpm preview.";
      }

      throw new Error(message);
    }

    sketch.defaults = { ...params };
    if (saveDefaultsLabelEl) {
      saveDefaultsLabelEl.textContent = "Saved";
    } else {
      saveDefaultsEl.textContent = "Saved";
    }
    saveDefaultsEl.title = "";
    if (saveStatusEl) {
      saveStatusEl.textContent = `Saved ${sketch.defaultsFile}`;
    }
    window.setTimeout(() => {
      if (saveDefaultsLabelEl) {
        saveDefaultsLabelEl.textContent = previousLabel;
      } else {
        saveDefaultsEl.textContent = previousLabel;
      }
      saveDefaultsEl.title = previousTitle;
      if (saveStatusEl) {
        saveStatusEl.textContent = "";
      }
    }, 1000);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Save Failed";
    if (saveDefaultsLabelEl) {
      saveDefaultsLabelEl.textContent = "Save Failed";
    } else {
      saveDefaultsEl.textContent = "Save Failed";
    }
    saveDefaultsEl.title = message;
    if (saveStatusEl) {
      saveStatusEl.textContent = message;
    }
    window.setTimeout(() => {
      if (saveDefaultsLabelEl) {
        saveDefaultsLabelEl.textContent = previousLabel;
      } else {
        saveDefaultsEl.textContent = previousLabel;
      }
      saveDefaultsEl.title = previousTitle;
    }, 1600);
  } finally {
    window.setTimeout(() => {
      saveDefaultsEl.disabled = false;
    }, 200);
  }
}

// Initialize
applyTheme(resolveInitialTheme());
populateSketches();
currentSketch = resolveInitialSketch();
mountSketch(currentSketch);

selectEl.value = currentSketch;

selectEl.addEventListener("change", (event) => {
  const target = event.target as HTMLSelectElement;
  mountSketch(target.value);
});

regenerateEl.addEventListener("click", () => {
  mountSketch(currentSketch);
});

document.addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() === "r" || event.code === "Space") {
    event.preventDefault();
    mountSketch(currentSketch);
  }
});

resetParamsEl.addEventListener("click", () => {
  const sketch = sketches.find((entry) => entry.id === currentSketch);
  if (!sketch) {
    return;
  }

  paramsBySketch.set(sketch.id, cloneDefaults(sketch));
  mountSketch(currentSketch);
});

saveDefaultsEl.addEventListener("click", async () => {
  await saveCurrentParamsAsDefaults();
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
