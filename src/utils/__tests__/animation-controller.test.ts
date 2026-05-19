import type p5 from "p5";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAnimationController } from "../animation-controller.js";

describe("animation-controller", () => {
	let rafCallbacks: FrameRequestCallback[] = [];
	let rafId = 0;

	beforeEach(() => {
		rafCallbacks = [];
		rafId = 0;

		global.requestAnimationFrame = vi.fn((cb) => {
			rafCallbacks.push(cb);
			return ++rafId;
		}) as unknown as typeof requestAnimationFrame;

		global.cancelAnimationFrame = vi.fn();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("starts animation loop on onFrame", () => {
		const controller = createAnimationController();
		const callback = vi.fn();
		controller.onFrame(callback);

		expect(global.requestAnimationFrame).toHaveBeenCalled();
		expect(rafCallbacks.length).toBeGreaterThan(0);
	});

	it("calls callback with incrementing frameCount starting at 0", () => {
		const controller = createAnimationController();
		const frames: number[] = [];
		controller.onFrame((fc) => frames.push(fc));

		// First rAF initializes lastTime, no renderer call
		rafCallbacks[0]?.(0);
		// Second rAF with sufficient elapsed time triggers first tick
		rafCallbacks[1]?.(20);
		// Third rAF triggers second tick
		rafCallbacks[2]?.(40);

		expect(frames[0]).toBe(0);
		expect(frames[1]).toBe(1);
		expect(frames[2]).toBeUndefined(); // only 2 ticks with these timestamps
	});

	it("respects speed < 1 (fewer ticks per real time)", () => {
		const controller = createAnimationController();
		const frames: number[] = [];
		controller.speed = 0.5;
		controller.onFrame((fc) => frames.push(fc));

		// First rAF initializes lastTime
		rafCallbacks[0]?.(0);
		// With speed=0.5, 20ms accumulates to 10 — below TICK_DURATION
		rafCallbacks[1]?.(20);
		expect(frames.length).toBe(0);

		// Another 20ms = 20 accumulated → triggers tick
		rafCallbacks[2]?.(40);
		expect(frames[0]).toBe(0);
	});

	it("respects speed > 1 (more ticks per real time)", () => {
		const controller = createAnimationController();
		const frames: number[] = [];
		controller.speed = 2;
		controller.onFrame((fc) => frames.push(fc));

		// First rAF initializes lastTime
		rafCallbacks[0]?.(0);
		// 10ms * 2 = 20 accumulated → triggers 1 tick
		rafCallbacks[1]?.(10);
		expect(frames[0]).toBe(0);

		// Another 10ms * 2 = 20 accumulated → triggers another tick
		rafCallbacks[2]?.(20);
		expect(frames[1]).toBe(1);
	});

	it("stop() stops calling callback", () => {
		const controller = createAnimationController();
		const callback = vi.fn();
		controller.onFrame(callback);

		// First rAF initializes lastTime
		rafCallbacks[0]?.(0);
		// Second rAF triggers first tick
		rafCallbacks[1]?.(20);
		expect(callback).toHaveBeenCalledTimes(1);

		controller.stop();
		expect(global.cancelAnimationFrame).toHaveBeenCalled();

		// Further rAF callbacks should not fire (animating = false)
		rafCallbacks[2]?.(40);
		expect(callback).toHaveBeenCalledTimes(1);
	});

	it("destroy() stops animation and nulls callback", () => {
		const controller = createAnimationController();
		const callback = vi.fn();
		controller.onFrame(callback);

		controller.destroy();
		expect(global.cancelAnimationFrame).toHaveBeenCalled();

		// After destroy, callback should not be called
		for (const cb of [...rafCallbacks]) {
			cb(100);
		}
		expect(callback).not.toHaveBeenCalled();
	});

	it("destroy() is safe to call multiple times", () => {
		const controller = createAnimationController();
		const callback = vi.fn();
		controller.onFrame(callback);

		controller.destroy();
		expect(global.cancelAnimationFrame).toHaveBeenCalled();

		vi.clearAllMocks();
		controller.destroy();
		expect(global.cancelAnimationFrame).not.toHaveBeenCalled();
	});

	it("attachToP5() calls p.noLoop()", () => {
		const controller = createAnimationController();
		const p = { noLoop: vi.fn() };

		controller.attachToP5(p as unknown as p5);
		expect(p.noLoop).toHaveBeenCalled();
	});

	it("speed defaults to 1", () => {
		const controller = createAnimationController();
		expect(controller.speed).toBe(1);
	});

	it("speed is clamped to minimum of 0.01", () => {
		const controller = createAnimationController();
		controller.speed = 0;
		expect(controller.speed).toBe(0.01);
	});

	it("speed accepts valid values", () => {
		const controller = createAnimationController();
		controller.speed = 0.5;
		expect(controller.speed).toBe(0.5);
		controller.speed = 2;
		expect(controller.speed).toBe(2);
	});
});
