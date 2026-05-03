<script lang="ts">
import p5 from "p5";
import { onMount } from "svelte";
import type { SketchModuleWithDefaults, Theme } from "../types/sketch.js";
import ParamControls from "./ParamControls.svelte";

let {
	sketch,
	theme,
	params,
	onRegenerate,
	onSaveFrame,
	onResetParams,
	onSaveDefaults,
} = $props<{
	sketch: SketchModuleWithDefaults<Record<string, unknown>>;
	theme: Theme;
	params: Record<string, unknown>;
	onRegenerate?: () => void;
	onSaveFrame?: () => void;
	onResetParams?: () => void;
	onSaveDefaults?: () => void;
}>();

let containerEl = $state<HTMLDivElement>();
let p5Instance: p5 | null = null;

function mountP5() {
	if (!containerEl || !sketch) {
		console.log("SketchView: Skipping mount - missing container or sketch");
		return;
	}

	// Check if container has dimensions
	const rect = containerEl.getBoundingClientRect();
	console.log("SketchView: Container dimensions:", rect.width, rect.height);

	if (rect.width === 0 || rect.height === 0) {
		console.log("SketchView: Container has no dimensions, retrying...");
		setTimeout(() => mountP5(), 100);
		return;
	}

	// Clean up previous instance
	if (p5Instance) {
		p5Instance.remove();
		p5Instance = null;
	}

	// Delay to ensure DOM is ready
	setTimeout(() => {
		if (!containerEl || !sketch) return;

		// Mount new p5 instance
		try {
			console.log("SketchView: Creating p5 instance for:", sketch.id);
			p5Instance = new p5(
				(p) => sketch.create({ p, theme, params }),
				containerEl,
			);
			console.log("SketchView: p5 instance created successfully");
		} catch (err) {
			console.error("SketchView: Failed to mount p5 instance:", err);
		}
	}, 50);
}

onMount(() => {
	mountP5();

	return () => {
		if (p5Instance) {
			p5Instance.remove();
			p5Instance = null;
		}
	};
});

// React to theme changes only
$effect(() => {
	if (theme !== prevTheme) {
		prevTheme = theme;
		mountP5();
	}
});

function handleParamChange() {
	mountP5();
}

function handleSaveFrameInternal() {
	if (p5Instance && sketch) {
		const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
		p5Instance.saveCanvas(`sketch-${sketch.id}-${stamp}`, "png");
	}
}
</script>

<div class="sketch-container">
  <div bind:this={containerEl} id="canvas-container" aria-live="polite"></div>

  <section class="params-panel" aria-label="Sketch parameters">
    <p class="params-heading">Parameters</p>
    <ParamControls {sketch} {params} onParamChange={handleParamChange} />
    <div class="params-actions">
      <button onclick={onResetParams}>
        <span class="button-content">
          <i class="button-icon" data-lucide="rotate-ccw" aria-hidden="true"></i>
          <span>Reset To Defaults</span>
        </span>
      </button>
      <button onclick={onSaveDefaults}>
        <span class="button-content">
          <i class="button-icon" data-lucide="save" aria-hidden="true"></i>
          <span>Save As Default</span>
        </span>
      </button>
    </div>
    <p id="save-status" aria-live="polite"></p>
  </section>

  <div class="sketch-actions">
    <button onclick={onRegenerate}>
      <span class="button-content">
        <i class="button-icon" data-lucide="refresh-cw" aria-hidden="true"></i>
        <span>Regenerate</span>
      </span>
    </button>
    <button onclick={handleSaveFrameInternal}>
      <span class="button-content">
        <i class="button-icon" data-lucide="download" aria-hidden="true"></i>
        <span>Save PNG</span>
      </span>
    </button>
  </div>
</div>

<style>
  .sketch-container {
    display: contents;
  }
</style>
