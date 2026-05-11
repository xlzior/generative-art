<script>
import { ArrowLeft, Download, RefreshCw, RotateCcw, Save } from "lucide-svelte";
import p5 from "p5";
import { onMount } from "svelte";
import DimensionsControl from "./components/DimensionsControl.svelte";
import ParameterControls from "./components/ParameterControls.svelte";
import SketchGallery from "./components/SketchGallery.svelte";
import ThemeToggle from "./components/ThemeToggle.svelte";
import {
	globalDefaults,
	globalParameters,
} from "./sketches/global-parameters.js";
import { sketches } from "./sketches/index.js";
import { createAnimationController } from "./utils/animation-controller.js";
import { getSeedFromUrl } from "./utils/seed.js";
import { createRng } from "./utils/seeded-random.js";

let currentTheme = $state("dark");
let currentSketchId = $state(null);
let currentP5 = $state(null);
let currentController = $state(null);
let paramsBySketch = $state(new Map());
let currentParams = $state(null);
let currentSketchModule = $state(null);
let isGallery = $derived(currentSketchId === null);
let lastMountedSketchId = $state(null);

// --- Reactivity ---

$effect(() => {
	if (currentSketchId) {
		if (currentSketchId !== lastMountedSketchId) {
			lastMountedSketchId = currentSketchId;
			mountSketch(currentSketchId);
		}
	} else {
		lastMountedSketchId = null;
		unmountSketch();
	}
});

const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");

// --- Helper functions ---

function getSketchById(sketchId) {
	return sketches.find((entry) => entry.id === sketchId);
}

function resolveInitialTheme() {
	const stored = window.localStorage.getItem("theme");
	if (stored === "light" || stored === "dark") {
		return stored;
	}
	return "dark";
}

function applyTheme(theme) {
	currentTheme = theme;
	document.documentElement.setAttribute("data-theme", theme);
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

function resolveSketchFromUrl() {
	const params = new URLSearchParams(window.location.search);
	const sketchFromUrl = params.get("sketch");
	if (sketchFromUrl && getSketchById(sketchFromUrl)) {
		return sketchFromUrl;
	}
	return null;
}

// --- Navigation ---

function navigateToSketch(sketchId) {
	const url = new URL(window.location.href);
	url.searchParams.set("sketch", sketchId);
	window.history.pushState({}, "", url);
	currentSketchId = sketchId;
}

function navigateToGallery() {
	const url = new URL(window.location.href);
	url.searchParams.delete("sketch");
	window.history.pushState({}, "", url);
	currentSketchId = null;
}

function handleThemeToggle() {
	const nextTheme = currentTheme === "dark" ? "light" : "dark";
	applyTheme(nextTheme);
	window.localStorage.setItem("theme", nextTheme);
	if (currentSketchId) {
		mountSketch(currentSketchId, { updateUrl: false, redrawControls: false });
	}
}

// --- Sketch lifecycle ---

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

	const allParams = getParamsForSketch(sketch);

	const globalParams = {};
	for (const param of globalParameters) {
		globalParams[param.key] = allParams[param.key] ?? globalDefaults[param.key];
	}

	const sketchParams = {};
	for (const param of sketch.parameters) {
		sketchParams[param.key] = allParams[param.key];
	}

	unmountSketch();

	currentSketchModule = sketch;
	currentParams = allParams;

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
			params: sketchParams,
			global: globalParams,
			rng,
			animation: controller,
		});
	}, container);
	document.title = sketch.title;

	if (redrawControls && currentSketchModule && currentParams) {
		currentParams = { ...currentParams };
	}
}

// --- Event handlers ---

function handleRegenerate() {
	mountSketch(currentSketchId, { updateUrl: false });
}

function handleResetParams() {
	const sketch = getSketchById(currentSketchId);
	if (!sketch) return;
	paramsBySketch.set(sketch.id, cloneDefaults(sketch));
	paramsBySketch = new Map(paramsBySketch);
	mountSketch(currentSketchId, { updateUrl: false });
}

async function handleSaveDefaults() {
	const sketch = sketches.find((entry) => entry.id === currentSketchId);
	if (!sketch) return;

	const params = getParamsForSketch(sketch);
	const payload = {
		defaultsFile: `${currentSketchId}/defaults.json`,
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
		currentP5.saveCanvas(`sketch-${currentSketchId}-${stamp}`, "png");
	}
}

function handleSketchChange(sketchId) {
	navigateToSketch(sketchId);
}

function handleParamChange(key, value) {
	const sketch = getSketchById(currentSketchId);
	if (!sketch) return;
	const params = getParamsForSketch(sketch);
	params[key] = value;
	paramsBySketch.set(sketch.id, { ...params });
	paramsBySketch = new Map(paramsBySketch);
	mountSketch(currentSketchId, { updateUrl: false, redrawControls: false });
}

function handleGlobalParamChange(key, value) {
	const sketch = getSketchById(currentSketchId);
	if (!sketch) return;
	const params = getParamsForSketch(sketch);
	params[key] = value;
	paramsBySketch.set(sketch.id, { ...params });
	paramsBySketch = new Map(paramsBySketch);
	mountSketch(currentSketchId, { updateUrl: false, redrawControls: false });
}

// --- Reactivity ---
// Removed $effect - using explicit mount calls in navigateToSketch and popstate handler

onMount(() => {
	applyTheme(resolveInitialTheme());
	currentSketchId = resolveSketchFromUrl();

	function handlePopState() {
		currentSketchId = resolveSketchFromUrl();
	}
	window.addEventListener("popstate", handlePopState);

	const handleKeyDown = (event) => {
		if (
			currentSketchId &&
			(event.key.toLowerCase() === "r" || event.code === "Space")
		) {
			event.preventDefault();
			mountSketch(currentSketchId, { updateUrl: false });
		}
	};
	document.addEventListener("keydown", handleKeyDown);

	return () => {
		document.removeEventListener("keydown", handleKeyDown);
		window.removeEventListener("popstate", handlePopState);
		unmountSketch();
	};
});
</script>

<div class="app-shell">
	<!-- Left panel: always visible -->
	<div class="left-panel">
		<header>
			{#if !isGallery}
				<button id="back-to-gallery" type="button" onclick={navigateToGallery}>
					<span class="button-content">
						<ArrowLeft class="button-icon" aria-hidden="true" />
						<span>Back to gallery</span>
					</span>
				</button>
			{/if}
			<p class="eyebrow">Sketchbook</p>
			<h1>Generative Art Playground</h1>
			<p class="subtitle">
				Study pattern, noise, recursion, and emergence through small focused
				sketches.
			</p>
		</header>

		<div class="panel-actions">
			<ThemeToggle {currentTheme} ontoggle={handleThemeToggle} />

			{#if !isGallery}
				<!-- Sketch controls -->
				<div class="controls" aria-label="Sketch controls">
					<label for="sketch-select">Sketch</label>
					<select
						id="sketch-select"
						value={currentSketchId}
						onchange={(e) => handleSketchChange(e.target.value)}
					>
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
								theme={currentTheme}
							/>
						{/if}

						{#if currentSketchModule}
							<DimensionsControl
								dimensions={(currentParams?.dimensions ?? globalDefaults.dimensions)}
								onchange={(d) => handleGlobalParamChange("dimensions", d)}
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
				</div>
			{/if}
		</div>
	</div>

	<!-- Right panel: gallery grid or sketch canvas -->
	<div class="right-panel">
		{#if isGallery}
			<SketchGallery
				{sketches}
				{currentTheme}
				onnavigate={navigateToSketch}
			/>
		{:else}
			<main>
				<div id="canvas-container" aria-live="polite"></div>
			</main>
		{/if}
	</div>
</div>

<style>
	.app-shell {
		min-height: 100vh;
		display: grid;
		grid-template-columns: var(--sidebar-width) minmax(0, 1fr);
		grid-template-rows: 1fr;
		gap: 0.65rem;
		padding: var(--shell-pad);
	}

	.left-panel {
		grid-column: 1;
		grid-row: 1;
		display: grid;
		grid-template-rows: auto 1fr;
		gap: 0.65rem;
		min-height: 0;
		overflow: auto;
	}

	header {
		padding: 0.2rem 0;
	}

	#back-to-gallery {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0;
		margin-bottom: 0.55rem;
		border: none;
		background: none;
		font: inherit;
		font-size: 0.78rem;
		color: var(--eyebrow-ink);
		cursor: pointer;
		transition: color 150ms ease;
	}

	#back-to-gallery:hover {
		color: var(--accent);
	}

	.eyebrow {
		margin: 0;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		font-size: 0.7rem;
		color: var(--eyebrow-ink);
	}

	h1 {
		margin: 0.25rem 0 0;
		font-size: clamp(1.4rem, 3vw, 1.9rem);
	}

	.subtitle {
		max-width: 60ch;
		margin: 0.4rem 0 0;
		color: var(--muted-ink);
	}

	.panel-actions {
		display: grid;
		gap: 0.45rem;
		align-content: start;
	}

	.controls {
		padding: 0.65rem;
		border: 1px solid var(--stroke);
		border-radius: 12px;
		background: var(--panel);
		backdrop-filter: blur(6px);
		display: grid;
		grid-template-columns: 1fr;
		gap: 0.45rem;
	}

	label {
		font-weight: 500;
	}

	select,
	button {
		font: inherit;
		border-radius: 8px;
		border: 1px solid var(--stroke);
		padding: 0.5rem 0.65rem;
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
		gap: 0.35rem;
	}

	.button-icon {
		width: 0.82rem;
		height: 0.82rem;
		flex-shrink: 0;
	}

	button:hover {
		transform: translateY(-1px);
		border-color: var(--accent);
		background: var(--ui-surface-hover);
	}

	.params-panel {
		margin-top: 0.45rem;
		padding-top: 0.45rem;
		border-top: 1px solid var(--stroke);
		display: grid;
		gap: 0.5rem;
	}

	.params-heading {
		margin: 0;
		font-size: 0.82rem;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--eyebrow-ink);
	}

	.params-actions {
		display: grid;
		gap: 0.35rem;
	}

	#save-status {
		margin: 0;
		min-height: 0.9rem;
		font-size: 0.74rem;
		color: var(--eyebrow-ink);
	}

	.right-panel {
		grid-column: 2;
		grid-row: 1;
		min-height: 0;
		overflow: auto;
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

	@media (max-width: 740px) {
		.app-shell {
			grid-template-columns: 1fr;
			grid-template-rows: auto 1fr;
			height: auto;
		}

		.left-panel {
			grid-column: 1;
			grid-row: 1;
		}

		.right-panel {
			grid-column: 1;
			grid-row: 2;
		}

		main {
			height: min(72vh, 720px);
		}
	}
</style>
