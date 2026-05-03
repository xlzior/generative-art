<script>
import { Download, RefreshCw, RotateCcw, Save } from "lucide-svelte";
import p5 from "p5";
import { onMount } from "svelte";
import ParameterControls from "./components/ParameterControls.svelte";
import SketchSelector from "./components/SketchSelector.svelte";
import ThemeToggle from "./components/ThemeToggle.svelte";
import { sketches } from "./sketches/index.js";
import { createAnimationController } from "./utils/animation-controller.js";
import { getSeedFromUrl } from "./utils/seed.js";
import { createRng } from "./utils/seeded-random.js";

let currentSketch = $state(sketches[0].id);
let currentTheme = $state("light");
let currentP5 = $state(null);
let currentController = $state(null);
let paramsBySketch = $state(new Map());
let currentParams = $state(null);
let currentSketchModule = $state(null);
let currentRng = $state(
	getSeedFromUrl() !== undefined
		? createRng(getSeedFromUrl())
		: () => Math.random(),
);

const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");

function getSketchById(sketchId) {
	return sketches.find((entry) => entry.id === sketchId);
}

function resolveInitialSketch() {
	const params = new URLSearchParams(window.location.search);
	const sketchFromUrl = params.get("sketch");
	if (sketchFromUrl && getSketchById(sketchFromUrl)) {
		return sketchFromUrl;
	}
	return sketches[0].id;
}

function writeSketchToUrl(sketchId) {
	const url = new URL(window.location.href);
	url.searchParams.set("sketch", sketchId);
	window.history.replaceState({}, "", url);
}

function cloneDefaults(sketch) {
	return { ...sketch.defaults };
}

function getParamsForSketch(sketch) {
	if (!paramsBySketch.has(sketch.id)) {
		paramsBySketch.set(sketch.id, cloneDefaults(sketch));
		paramsBySketch = new Map(paramsBySketch);
	}
	return paramsBySketch.get(sketch.id);
}

function resolveInitialTheme() {
	const stored = window.localStorage.getItem("theme");
	if (stored === "light" || stored === "dark") {
		return stored;
	}
	return prefersDark.matches ? "dark" : "light";
}

function applyTheme(theme) {
	currentTheme = theme;
	document.documentElement.setAttribute("data-theme", theme);
}

function unmountSketch() {
	if (currentController) {
		currentController.destroy();
		currentController = null;
	}
	if (currentP5) {
		currentP5.remove();
		currentP5 = null;
	}
}

function mountSketch(sketchId, options = {}) {
	const { redrawControls = true, updateUrl = true } = options;
	const sketch = getSketchById(sketchId);
	if (!sketch) return;

	const params = getParamsForSketch(sketch);

	unmountSketch(); // Clean up previous sketch/controller first

	currentSketch = sketch.id;
	currentSketchModule = sketch;
	currentParams = params;

	if (updateUrl) {
		writeSketchToUrl(currentSketch);
	}

	const container = document.getElementById("canvas-container");
	if (!container) return;

	const seed = getSeedFromUrl();
	const rng = seed !== undefined ? createRng(seed) : () => Math.random();
	const isTest = !!window.__CREATE_TEST_CTRL__;
	const controller = isTest
		? window.__CREATE_TEST_CTRL__()
		: createAnimationController();

	if (!isTest) {
		currentController = controller;
	}

	currentP5 = new p5((p) => {
		// Attach to p5 FIRST to prevent default draw loop
		if (!isTest) {
			controller.attachToP5(p);
		}
		// Then initialize sketch with controller
		sketch.create({
			p,
			theme: currentTheme,
			params,
			rng,
			animation: controller,
		});
	}, container);
	document.title = sketch.title;

	if (redrawControls && currentSketchModule && currentParams) {
		// Trigger re-render of parameter controls
		currentParams = { ...currentParams };
	}
}

function handleRegenerate() {
	mountSketch(currentSketch, { updateUrl: false });
}

function handleResetParams() {
	const sketch = getSketchById(currentSketch);
	if (!sketch) return;
	paramsBySketch.set(sketch.id, cloneDefaults(sketch));
	paramsBySketch = new Map(paramsBySketch);
	mountSketch(currentSketch, { updateUrl: false });
}

async function handleSaveDefaults() {
	const sketch = sketches.find((entry) => entry.id === currentSketch);
	if (!sketch) return;

	const params = getParamsForSketch(sketch);
	const payload = {
		defaultsFile: sketch.defaultsFile,
		defaults: params,
	};

	try {
		const response = await fetch("/__sketch-defaults", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			let message = "Failed to persist defaults";
			const contentType = response.headers.get("content-type") || "";
			if (contentType.includes("application/json")) {
				const data = await response.json();
				message = data.message || message;
			}
			throw new Error(message);
		}

		sketch.defaults = { ...params };
	} catch (error) {
		console.error("Failed to save defaults:", error);
	}
}

function handleSavePNG() {
	if (currentP5) {
		const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
		currentP5.saveCanvas(`sketch-${currentSketch}-${stamp}`, "png");
	}
}

function handleSketchChange(sketchId) {
	mountSketch(sketchId);
}

function handleThemeToggle() {
	const nextTheme = currentTheme === "dark" ? "light" : "dark";
	applyTheme(nextTheme);
	window.localStorage.setItem("theme", nextTheme);
	mountSketch(currentSketch, { updateUrl: false, redrawControls: false });
}

function handleParamChange(key, value) {
	const sketch = getSketchById(currentSketch);
	if (!sketch) return;
	const params = getParamsForSketch(sketch);
	params[key] = value;
	paramsBySketch.set(sketch.id, { ...params });
	paramsBySketch = new Map(paramsBySketch);
	mountSketch(currentSketch, { updateUrl: false, redrawControls: false });
}

onMount(() => {
	applyTheme(resolveInitialTheme());
	currentSketch = resolveInitialSketch();
	mountSketch(currentSketch);

	const handleKeyDown = (event) => {
		if (event.key.toLowerCase() === "r" || event.code === "Space") {
			event.preventDefault();
			mountSketch(currentSketch, { updateUrl: false });
		}
	};
	document.addEventListener("keydown", handleKeyDown);

	return () => {
		document.removeEventListener("keydown", handleKeyDown);
		unmountSketch();
	};
});
</script>

<div class="app-shell">
  <header>
    <p class="eyebrow">Sketchbook</p>
    <h1>Generative Art Playground</h1>
    <p class="subtitle">
      Study pattern, noise, recursion, and emergence through small focused
      sketches.
    </p>
  </header>

  <section class="controls" aria-label="Sketch controls">
    <label for="sketch-select">Sketch</label>
    <SketchSelector
      {sketches}
      {currentSketch}
      onchange={handleSketchChange}
    />

    <button id="regenerate" type="button" onclick={handleRegenerate}>
      <span class="button-content">
        <RefreshCw class="button-icon" aria-hidden="true" />
        <span>Regenerate</span>
      </span>
    </button>

    <button id="save-frame" type="button" onclick={handleSavePNG}>
      <span class="button-content">
        <Download class="button-icon" aria-hidden="true" />
        <span>Save PNG</span>
      </span>
    </button>

    <ThemeToggle {currentTheme} ontoggle={handleThemeToggle} />

    <section class="params-panel" aria-label="Sketch parameters">
      <p class="params-heading">Parameters</p>
      {#if currentSketchModule && currentParams}
        <ParameterControls
          sketch={currentSketchModule}
          params={currentParams}
          onchange={handleParamChange}
        />
      {/if}

      <div class="params-actions">
        <button id="reset-params" type="button" onclick={handleResetParams}>
          <span class="button-content">
            <RotateCcw class="button-icon" aria-hidden="true" />
            <span>Reset To Defaults</span>
          </span>
        </button>
        <button id="save-defaults" type="button" onclick={handleSaveDefaults}>
          <span class="button-content">
            <Save class="button-icon" aria-hidden="true" />
            <span id="save-defaults-label">Save As Default</span>
          </span>
        </button>
      </div>
      <p id="save-status" aria-live="polite"></p>
    </section>
  </section>

  <main>
    <div id="canvas-container" aria-live="polite"></div>
  </main>
</div>
