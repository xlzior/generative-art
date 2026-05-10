<script>
import p5 from "p5";
import { onMount } from "svelte";
import { createRng } from "../utils/seeded-random.js";

let { sketch, theme } = $props();

let container;

onMount(() => {
	const rng = createRng(42);
	const params = sketch.defaults;

	// Get container size after layout
	const size = Math.floor(container.getBoundingClientRect().width);

	// Render a few frames for animated sketches to settle
	const THUMBNAIL_FRAMES = 10;
	let frameRenderer = null;

	const mockAnimation = {
		onFrame: (renderer) => {
			frameRenderer = renderer;
		},
		stop: () => {},
	};

	const instance = new p5((p) => {
		// Create canvas to match container size
		const originalCreateCanvas = p.createCanvas.bind(p);
		p.createCanvas = (_w, _h, ...args) =>
			originalCreateCanvas(size, size, ...args);

		// Initialize sketch
		sketch.create({
			p,
			theme,
			params,
			rng,
			animation: mockAnimation,
		});

		// After canvas is created by setup(), render thumbnail frames
		const origSetup = p.setup;
		if (origSetup) {
			p.setup = () => {
				origSetup();
				if (frameRenderer) {
					let count = 0;
					function tick() {
						frameRenderer(count);
						count++;
						if (count < THUMBNAIL_FRAMES) {
							requestAnimationFrame(tick);
						}
					}
					requestAnimationFrame(tick);
				}
			};
		}

		// Prevent any draw loop
		p.noLoop();
	}, container);

	return () => {
		instance.remove();
	};
});
</script>

<div class="thumbnail-container" bind:this={container}></div>

<style>
	.thumbnail-container {
		width: 100%;
		aspect-ratio: 1;
		overflow: hidden;
		background: rgba(255, 255, 255, 0.65);
	}

	.thumbnail-container :global(canvas) {
		display: block;
	}
</style>
