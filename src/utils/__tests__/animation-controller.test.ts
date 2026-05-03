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

		// Trigger the scheduled RAF callback
		expect(global.requestAnimationFrame).toHaveBeenCalled();
		expect(rafCallbacks.length).toBeGreaterThan(0);
	});

	it("calls callback with incrementing frameCount starting at 0", () => {
		const controller = createAnimationController();
		const frames: number[] = [];
		controller.onFrame((fc) => frames.push(fc));

		// Simulate multiple animation frames
		rafCallbacks[0]?.(0);
		rafCallbacks[1]?.(1);
		rafCallbacks[2]?.(2);

		expect(frames[0]).toBe(0);
		expect(frames[1]).toBe(1);
		expect(frames[2]).toBe(2);
	});

	it("stop() stops calling callback", () => {
		const controller = createAnimationController();
		const callback = vi.fn();
		controller.onFrame(callback);

		// First frame
		rafCallbacks[0]?.(0);
		expect(callback).toHaveBeenCalledTimes(1);

		controller.stop();
		expect(global.cancelAnimationFrame).toHaveBeenCalled();
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

		// Reset mock and call destroy again - should not throw
		vi.clearAllMocks();
		controller.destroy();
		// Second destroy should not call cancelAnimationFrame again (rafId is null)
		expect(global.cancelAnimationFrame).not.toHaveBeenCalled();
	});

	it("attachToP5() calls p.noLoop()", () => {
		const controller = createAnimationController();
		const p = { noLoop: vi.fn() };

		controller.attachToP5(p as unknown as p5);
		expect(p.noLoop).toHaveBeenCalled();
	});
});
