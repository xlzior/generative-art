<script>
import { Download, RefreshCw, RotateCcw, Save } from "lucide-svelte";
import p5 from "p5";
import { onMount } from "svelte";
import { sketches } from "../sketches/index.js";
import { createAnimationController } from "../utils/animation-controller.js";
import { getSeedFromUrl } from "../utils/seed.js";
import { createRng } from "../utils/seeded-random.js";
import ParameterControls from "./ParameterControls.svelte";

let { sketchId, currentTheme } = $props();

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

function getSketchById(sketchId) {
	return sketches.find((entry) => entry.id === sketchId);
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

	unmountSketch();

	currentSketchModule = sketch;
	currentParams = params;

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
		if (!isTest) {
			controller.attachToP5(p);
		}
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
		currentParams = { ...currentParams };
	}
}

function handleRegenerate() {
	mountSketch(sketchId, { updateUrl: false });
}

function handleResetParams() {
	const sketch = getSketchById(sketchId);
	if (!sketch) return;
	paramsBySketch.set(sketch.id, cloneDefaults(sketch));
	paramsBySketch = new Map(paramsBySketch);
	mountSketch(sketchId, { updateUrl: false });
}

async function handleSaveDefaults() {
	const sketch = sketches.find((entry) => entry.id === sketchId);
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
		currentP5.saveCanvas(`sketch-${sketchId}-${stamp}`, "png");
	}
}

function handleSketchChange(newSketchId) {
	sketchId = newSketchId;
	mountSketch(sketchId);
}

function handleParamChange(key, value) {
	const sketch = getSketchById(sketchId);
	if (!sketch) return;
	const params = getParamsForSketch(sketch);
	params[key] = value;
	paramsBySketch.set(sketch.id, { ...params });
	paramsBySketch = new Map(paramsBySketch);
	mountSketch(sketchId, { updateUrl: false, redrawControls: false });
}

onMount(() => {
	mountSketch(sketchId);

	const handleKeyDown = (event) => {
		if (event.key.toLowerCase() === "r" || event.code === "Space") {
			event.preventDefault();
			mountSketch(sketchId, { updateUrl: false });
		}
	};
	document.addEventListener("keydown", handleKeyDown);

	return () => {
		document.removeEventListener("keydown", handleKeyDown);
		unmountSketch();
	};
});
</script>

<section class="controls" aria-label="Sketch controls">
	<label for="sketch-select">Sketch</label>
	<select id="sketch-select" value={sketchId} onchange={(e) => handleSketchChange(e.target.value)}>
		{#each sketches as sketch (sketch.id)}
			<option value={sketch.id}>{sketch.title}</option>
		{/each}
	</select>

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

<style>
	.controls {
		display: grid;
		grid-template-columns: 1fr;
		gap: 0.55rem;
	}

	label {
		font-weight: 500;
	}

	select,
	button {
		font: inherit;
		border-radius: 10px;
		border: 1px solid var(--stroke);
		padding: 0.6rem 0.8rem;
		color: var(--ink);
		background: var(--ui-surface);
	}

	button {
		cursor: pointer;
		transition: transform 120ms ease, border-color 120ms ease;
	}

	.button-content {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.45rem;
	}

	.button-icon {
		width: 0.95rem;
		height: 0.95rem;
		flex-shrink: 0;
	}

	button:hover {
		transform: translateY(-1px);
		border-color: var(--accent);
		background: var(--ui-surface-hover);
	}

	.params-panel {
		margin-top: 0.55rem;
		padding-top: 0.55rem;
		border-top: 1px solid var(--stroke);
		display: grid;
		gap: 0.6rem;
	}

	.params-heading {
		margin: 0;
		font-size: 0.88rem;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--eyebrow-ink);
	}

	.params-actions {
		display: grid;
		gap: 0.45rem;
	}

	#save-status {
		margin: 0;
		min-height: 1.1rem;
		font-size: 0.78rem;
		color: var(--eyebrow-ink);
	}

	main {
		width: min(80vw, 100%);
		height: 100%;
	}

	#canvas-container {
		width: 100%;
		height: 100%;
		border-radius: 16px;
		overflow: hidden;
		border: 1px solid var(--stroke);
		background: rgba(255, 255, 255, 0.65);
		min-height: 0;
	}

	:global(canvas) {
		display: block;
	}
</style>
