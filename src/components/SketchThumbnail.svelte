<script>
import p5 from "p5";
import { createRng } from "../utils/seeded-random.js";

let { sketch, theme } = $props();

let container;
let instance;

const THUMBNAIL_FRAMES = 10;

$effect(() => {
	sketch;
	theme;

	instance?.remove();
	instance = null;

	if (!container) return;

	const rng = createRng(42);
	const params = sketch.defaults;
	const size = Math.floor(container.getBoundingClientRect().width);
	let frameRenderer = null;

	const mockAnimation = {
		onFrame: (renderer) => {
			frameRenderer = renderer;
		},
		stop: () => {},
	};

	instance = new p5((p) => {
		const originalCreateCanvas = p.createCanvas.bind(p);
		p.createCanvas = (_w, _h, ...args) =>
			originalCreateCanvas(size, size, ...args);

		sketch.create({
			p,
			theme,
			params,
			rng,
			animation: mockAnimation,
		});

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

		p.noLoop();
	}, container);

	return () => {
		instance?.remove();
		instance = null;
	};
});
</script>

<div class="thumbnail-container" bind:this={container}></div>

<style>
	.thumbnail-container {
		width: 100%;
		aspect-ratio: 1;
		overflow: hidden;
		background: var(--panel);
	}

	.thumbnail-container :global(canvas) {
		display: block;
	}
</style>
