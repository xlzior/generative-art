<script lang="ts">
import { ArrowLeft, Download, RefreshCw, RotateCcw, Save } from "lucide-svelte";
import { onMount } from "svelte";
import DimensionsControl from "./components/DimensionsControl.svelte";
import ParameterControls from "./components/ParameterControls.svelte";
import SketchGallery from "./components/SketchGallery.svelte";
import ThemeToggle from "./components/ThemeToggle.svelte";
import {
	lifecycle,
	mountSketch,
	regenerate,
	savePNG,
	unmountSketch,
} from "./sketch-lifecycle.svelte.js";
import {
	resetParams,
	saveDefaults,
	updateParam,
} from "./sketch-params.svelte.js";
import {
	initRouter,
	navigateToGallery,
	navigateToSketch,
} from "./sketch-router.svelte.js";
import { globalDefaults } from "./sketches/global-parameters.js";
import { sketches } from "./sketches/index.js";
import type { DimensionsValue, Theme } from "./types/sketch.js";

let currentTheme = $state<Theme>("dark");
let currentSketchId = $state<string | null>(null);
let lastMountedSketchId = $state<string | null>(null);
let isGallery = $derived(currentSketchId === null);

// --- Reactivity ---

$effect(() => {
	if (currentSketchId) {
		if (currentSketchId !== lastMountedSketchId) {
			lastMountedSketchId = currentSketchId;
			mountSketch(currentSketchId, currentTheme);
		}
	} else {
		lastMountedSketchId = null;
		unmountSketch();
	}
});

// --- Helper functions ---

function resolveInitialTheme(): Theme {
	const stored = window.localStorage.getItem("theme");
	if (stored === "light" || stored === "dark") {
		return stored;
	}
	return "dark";
}

function applyTheme(theme: Theme) {
	currentTheme = theme;
	document.documentElement.setAttribute("data-theme", theme);
}

function handleThemeToggle() {
	const nextTheme = currentTheme === "dark" ? "light" : "dark";
	applyTheme(nextTheme);
	window.localStorage.setItem("theme", nextTheme);
	if (currentSketchId) {
		mountSketch(currentSketchId, nextTheme);
	}
}

// --- Event handlers ---

function handleRegenerate() {
	if (!currentSketchId) return;
	regenerate(currentSketchId, currentTheme);
}

function handleResetParams() {
	if (!currentSketchId) return;
	resetParams(currentSketchId);
	mountSketch(currentSketchId, currentTheme);
}

async function handleSaveDefaults() {
	if (!currentSketchId) return;
	await saveDefaults(currentSketchId);
}

function handleSavePNG() {
	if (!currentSketchId) return;
	savePNG(currentSketchId);
}

function handleParamChange(key: string, value: unknown) {
	if (!currentSketchId) return;
	updateParam(currentSketchId, key, value);
	mountSketch(currentSketchId, currentTheme, { redrawControls: false });
}

onMount(() => {
	applyTheme(resolveInitialTheme());

	const cleanupRouter = initRouter((id: string | null) => {
		currentSketchId = id;
	});

	const handleKeyDown = (event: KeyboardEvent) => {
		if (
			currentSketchId &&
			(event.key.toLowerCase() === "r" || event.code === "Space")
		) {
			event.preventDefault();
			regenerate(currentSketchId, currentTheme);
		}
	};
	document.addEventListener("keydown", handleKeyDown);

	return () => {
		document.removeEventListener("keydown", handleKeyDown);
		cleanupRouter();
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
						onchange={(e: Event) => navigateToSketch((e.target as HTMLSelectElement).value)}
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
						{#if lifecycle.currentSketchModule && lifecycle.currentParams}
							<ParameterControls
								sketch={lifecycle.currentSketchModule}
								params={lifecycle.currentParams}
								onchange={handleParamChange}
								theme={currentTheme}
							/>
						{/if}

						{#if lifecycle.currentSketchModule}
							<DimensionsControl
								dimensions={(lifecycle.currentParams?.dimensions ?? globalDefaults.dimensions)}
								onchange={(d: DimensionsValue) => handleParamChange("dimensions", d)}
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
