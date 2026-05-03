import type p5 from "p5";
import type { SketchAnimationController } from "../types/sketch.js";

/**
 * Create an animation controller driven by requestAnimationFrame.
 * Used by the main app to drive animated sketches.
 */
export function createAnimationController(): SketchAnimationController & {
	attachToP5(p: p5): void;
	stop(): void;
	destroy(): void;
} {
	let frameCount = -1; // Starts at -1 so first increment gives 0, matching p5's frameCount
	let renderer: ((frameCount: number) => void) | null = null;
	let animating = false;
	let rafId: number | null = null;

	function loop() {
		if (!animating) return;
		frameCount++;
		renderer?.(frameCount);
		rafId = requestAnimationFrame(loop);
	}

	const controller = {
		onFrame: (cb: (frameCount: number) => void) => {
			renderer = cb;
			if (!animating) {
				animating = true;
				// Use requestAnimationFrame to give p5 time to call setup() and create the canvas
				rafId = requestAnimationFrame(loop);
			}
		},
		stop: () => {
			animating = false;
			if (rafId !== null) {
				cancelAnimationFrame(rafId);
				rafId = null;
			}
		},
		destroy: () => {
			animating = false;
			if (rafId !== null) {
				cancelAnimationFrame(rafId);
				rafId = null;
			}
			renderer = null;
		},
		attachToP5(p: p5) {
			// Stop p5's default draw loop - we drive animation externally
			// MUST be called before sketch.create() to prevent p5 from starting its draw loop
			p.noLoop();
		},
	};

	return controller;
}
