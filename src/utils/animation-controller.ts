import type p5 from "p5";
import type { SketchAnimationController } from "../types/sketch.js";

const TICK_DURATION = 1000 / 60; // ~16.67ms, matching 60fps
const MAX_TICKS_PER_FRAME = 5; // safety cap to prevent spiral of death

/**
 * Create an animation controller driven by requestAnimationFrame.
 * Uses a fixed-timestep accumulator to decouple animation ticks from rAF callbacks,
 * enabling per-controller speed control.
 */
export function createAnimationController(): SketchAnimationController & {
	attachToP5(p: p5): void;
	stop(): void;
	destroy(): void;
} {
	let frameCount = -1; // Starts at -1 so first increment gives 0
	let renderer: ((frameCount: number) => void) | null = null;
	let animating = false;
	let rafId: number | null = null;
	let _speed = 1;
	let lastTime: number | null = null;
	let accumulator = 0;

	function loop(timestamp: number) {
		if (!animating) return;

		if (lastTime === null) {
			lastTime = timestamp;
			rafId = requestAnimationFrame(loop);
			return;
		}

		const elapsed = timestamp - lastTime;
		lastTime = timestamp;

		accumulator += elapsed * _speed;

		let ticks = 0;
		while (accumulator >= TICK_DURATION && ticks < MAX_TICKS_PER_FRAME) {
			frameCount++;
			renderer?.(frameCount);
			accumulator -= TICK_DURATION;
			ticks++;
		}

		rafId = requestAnimationFrame(loop);
	}

	const controller = {
		get speed() {
			return _speed;
		},
		set speed(value: number) {
			_speed = Math.max(0.01, value);
		},
		onFrame: (cb: (frameCount: number) => void) => {
			renderer = cb;
			if (!animating) {
				animating = true;
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
			p.noLoop();
		},
	};

	return controller;
}
