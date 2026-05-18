// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SketchModuleWithDefaults } from "../types/sketch.js";

vi.setConfig({ testTimeout: 15_000 });

const createMock = vi.fn();

const testSketch = {
	id: "test-sketch",
	title: "Test Sketch",
	date: "2026-01-01",
	description: "Test",
	parameters: [],
	defaults: {},
	filePath: "./test-sketch/sketch.ts",
	create: createMock,
} as unknown as SketchModuleWithDefaults<Record<string, unknown>>;

const mockController = {
	onFrame: vi.fn(),
	stop: vi.fn(),
	destroy: vi.fn(),
	attachToP5: vi.fn(),
};

// --- Mocks ---

vi.mock("p5", () => {
	class MockP5 {
		setup: (() => void) | null = null;
		draw: (() => void) | null = null;
		noLoop = vi.fn();
		createCanvas = vi.fn();
		resizeCanvas = vi.fn();
		remove = vi.fn();
		saveCanvas = vi.fn();

		constructor(sketchFn: (p: MockP5) => void) {
			if (sketchFn) {
				sketchFn(this);
			}
		}
	}
	return { default: MockP5 };
});

vi.mock("../sketches/index.js", () => ({
	getSketchById: (id: string) =>
		id === "test-sketch" ? testSketch : undefined,
}));

vi.mock("../sketch-params.svelte.js", () => ({
	getParamsForSketch: vi.fn().mockReturnValue({ x: 1, y: "hello" }),
}));

vi.mock("../utils/seed.js", () => ({
	getSeedFromUrl: vi.fn().mockReturnValue(undefined),
}));

vi.mock("../utils/seeded-random.js", () => ({
	createRng: vi.fn().mockReturnValue(Math.random),
}));

vi.mock("../utils/animation-controller.js", () => ({
	createAnimationController: vi.fn().mockReturnValue(mockController),
}));

describe("sketch-lifecycle", () => {
	beforeEach(() => {
		document.body.innerHTML = '<div id="canvas-container"></div>';
		vi.clearAllMocks();
	});

	describe("mountSketch", () => {
		it("creates a new p5 instance and calls sketch.create", async () => {
			const { mountSketch, unmountSketch } = await import(
				"../sketch-lifecycle.svelte.js"
			);
			mountSketch("test-sketch", "dark");
			expect(createMock).toHaveBeenCalledTimes(1);
			unmountSketch();
		});

		it("passes theme in context", async () => {
			const { mountSketch, unmountSketch } = await import(
				"../sketch-lifecycle.svelte.js"
			);
			mountSketch("test-sketch", "light");
			expect(createMock).toHaveBeenCalledWith(
				expect.objectContaining({ theme: "light" }),
			);
			unmountSketch();
		});

		it("passes split params (global + sketch)", async () => {
			const { mountSketch, unmountSketch } = await import(
				"../sketch-lifecycle.svelte.js"
			);
			mountSketch("test-sketch", "dark");
			const context = createMock.mock.lastCall as unknown as [
				{ params: unknown; global: unknown },
			];
			expect(context[0]).toHaveProperty("params");
			expect(context[0]).toHaveProperty("global");
			unmountSketch();
		});

		it("wires animation controller via attachToP5", async () => {
			const { mountSketch, unmountSketch } = await import(
				"../sketch-lifecycle.svelte.js"
			);
			mountSketch("test-sketch", "dark");
			expect(mockController.attachToP5).toHaveBeenCalled();
			unmountSketch();
		});

		it("sets document.title", async () => {
			const { mountSketch, unmountSketch } = await import(
				"../sketch-lifecycle.svelte.js"
			);
			mountSketch("test-sketch", "dark");
			expect(document.title).toBe("Test Sketch");
			unmountSketch();
		});

		it("returns early when container is missing", async () => {
			document.body.innerHTML = "";
			const { mountSketch, lifecycle } = await import(
				"../sketch-lifecycle.svelte.js"
			);
			mountSketch("test-sketch", "dark");
			expect(lifecycle.currentP5).toBeNull();
		});

		it("returns early for unknown sketch id", async () => {
			const { mountSketch, lifecycle } = await import(
				"../sketch-lifecycle.svelte.js"
			);
			mountSketch("non-existent", "dark");
			expect(lifecycle.currentP5).toBeNull();
		});
	});

	describe("mountSketch with seed", () => {
		it("uses seed-based rng when seed is present", async () => {
			const seedMock = (await import("../utils/seed.js"))
				.getSeedFromUrl as ReturnType<typeof vi.fn>;
			seedMock.mockReturnValue(42);

			const { mountSketch, unmountSketch } = await import(
				"../sketch-lifecycle.svelte.js"
			);
			mountSketch("test-sketch", "dark");

			const createRngMock = (await import("../utils/seeded-random.js"))
				.createRng as ReturnType<typeof vi.fn>;
			expect(createRngMock).toHaveBeenCalledWith(42);
			unmountSketch();
			seedMock.mockReturnValue(undefined);
		});
	});

	describe("unmountSketch", () => {
		it("calls p5.remove() and controller.destroy()", async () => {
			const { mountSketch, unmountSketch, lifecycle } = await import(
				"../sketch-lifecycle.svelte.js"
			);
			mountSketch("test-sketch", "dark");

			const p5Instance = lifecycle.currentP5;
			const ctrl = lifecycle.currentController;

			unmountSketch();

			if (p5Instance) {
				expect(p5Instance.remove).toHaveBeenCalled();
			}
			if (ctrl) {
				expect(ctrl.destroy).toHaveBeenCalled();
			}
		});

		it("nulls out state", async () => {
			const { mountSketch, unmountSketch, lifecycle } = await import(
				"../sketch-lifecycle.svelte.js"
			);
			mountSketch("test-sketch", "dark");
			unmountSketch();
			expect(lifecycle.currentP5).toBeNull();
			expect(lifecycle.currentController).toBeNull();
		});

		it("is a no-op when nothing mounted (idempotent)", async () => {
			const { unmountSketch } = await import("../sketch-lifecycle.svelte.js");
			expect(() => unmountSketch()).not.toThrow();
		});
	});

	describe("regenerate", () => {
		it("remounts with same id and theme", async () => {
			const { mountSketch, regenerate, unmountSketch } = await import(
				"../sketch-lifecycle.svelte.js"
			);
			mountSketch("test-sketch", "dark");
			const firstCallCount = createMock.mock.calls.length;

			regenerate("test-sketch", "dark");

			expect(createMock.mock.calls.length).toBeGreaterThan(firstCallCount);
			unmountSketch();
		});
	});

	describe("savePNG", () => {
		it("calls currentP5.saveCanvas when p5 exists", async () => {
			const { mountSketch, savePNG, unmountSketch, lifecycle } = await import(
				"../sketch-lifecycle.svelte.js"
			);
			mountSketch("test-sketch", "dark");
			const spy = vi.spyOn(
				lifecycle.currentP5 as unknown as {
					saveCanvas: ReturnType<typeof vi.fn>;
				},
				"saveCanvas",
			);
			savePNG("test-sketch");
			expect(spy).toHaveBeenCalled();
			unmountSketch();
		});

		it("is a no-op when currentP5 is null", async () => {
			const { savePNG } = await import("../sketch-lifecycle.svelte.js");
			expect(() => savePNG("test-sketch")).not.toThrow();
		});
	});
});
