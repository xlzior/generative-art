<script>
import p5 from "p5";
import { onMount } from "svelte";
import { createRng } from "../utils/seeded-random.js";

let { sketch, theme } = $props();

let container;

onMount(() => {
	const rng = createRng(42);
	const params = sketch.defaults;

	// Mock animation controller matching SketchAnimationController interface
	const mockAnimation = {
		onFrame: () => {},
		stop: () => {},
	};

	const instance = new p5((p) => {
		// Force 300x300 canvas regardless of what the sketch calls
		const originalCreateCanvas = p.createCanvas.bind(p);
		p.createCanvas = (_w, _h, ...args) =>
			originalCreateCanvas(300, 300, ...args);

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
		aspect-ratio: 1;
		overflow: hidden;
		background: rgba(255, 255, 255, 0.65);
	}

	.thumbnail-container :global(canvas) {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}
</style>
