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

	// Mock animation controller matching SketchAnimationController interface
	const mockAnimation = {
		onFrame: () => {},
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
