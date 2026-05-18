import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SketchModuleWithDefaults } from "../types/sketch.js";

const mockSketch = {
	id: "test-sketch",
	title: "Test Sketch",
	date: "2026-01-01",
	description: "Test",
	parameters: [],
	defaults: {},
	filePath: "./test-sketch/sketch.ts",
	create: vi.fn(),
} as unknown as SketchModuleWithDefaults<Record<string, unknown>>;

vi.mock("../sketches/index.js", () => ({
	sketches: [mockSketch],
	getSketchById: (id: string) =>
		id === "test-sketch" ? mockSketch : undefined,
}));

const mod = await import("../sketch-router.svelte.js");

describe("sketch-router.svelte.ts", () => {
	beforeEach(() => {
		window.history.replaceState({}, "", "/");
		vi.restoreAllMocks();
	});

	describe("navigateToSketch()", () => {
		it("updates URL with sketch param", () => {
			mod.navigateToSketch("test-sketch");
			expect(window.location.href).toContain("?sketch=test-sketch");
		});

		it("calls navigation callback with sketch id", () => {
			const cb = vi.fn();
			mod.initRouter(cb);
			mod.navigateToSketch("test-sketch");
			expect(cb).toHaveBeenCalledWith("test-sketch");
		});

		it("updates URL without callback registered", () => {
			mod.navigateToSketch("test-sketch");
			expect(window.location.href).toContain("?sketch=test-sketch");
		});
	});

	describe("navigateToGallery()", () => {
		it("removes sketch param from URL", () => {
			window.history.replaceState({}, "", "/?sketch=test-sketch");
			mod.navigateToGallery();
			expect(window.location.href).not.toContain("sketch");
		});

		it("calls navigation callback with null", () => {
			const cb = vi.fn();
			mod.initRouter(cb);
			mod.navigateToGallery();
			expect(cb).toHaveBeenCalledWith(null);
		});
	});

	describe("initRouter()", () => {
		it("calls callback with sketch id from URL when sketch exists", () => {
			window.history.replaceState({}, "", "/?sketch=test-sketch");
			const cb = vi.fn();
			mod.initRouter(cb);
			expect(cb).toHaveBeenCalledWith("test-sketch");
		});

		it("calls callback with null when URL has no sketch param", () => {
			const cb = vi.fn();
			mod.initRouter(cb);
			expect(cb).toHaveBeenCalledWith(null);
		});

		it("calls callback with null when sketch id is unknown", () => {
			window.history.replaceState({}, "", "/?sketch=nonexistent");
			const cb = vi.fn();
			mod.initRouter(cb);
			expect(cb).toHaveBeenCalledWith(null);
		});

		it("returns a cleanup function", () => {
			const cleanup = mod.initRouter(vi.fn());
			expect(typeof cleanup).toBe("function");
		});

		it("cleanup removes popstate listener and callback", () => {
			const cb = vi.fn();
			const cleanup = mod.initRouter(cb);
			cleanup();
			window.dispatchEvent(new PopStateEvent("popstate"));
			expect(cb).toHaveBeenCalledTimes(1); // only the initial call, not popstate
		});

		it("popstate triggers callback with URL sketch id", () => {
			const cb = vi.fn();
			mod.initRouter(cb);
			cb.mockClear();
			window.history.pushState({}, "", "/?sketch=test-sketch");
			window.dispatchEvent(new PopStateEvent("popstate"));
			expect(cb).toHaveBeenCalledWith("test-sketch");
		});
	});

	describe("navigateToSketch after initRouter", () => {
		it("callback receives updates from navigation", () => {
			const cb = vi.fn();
			mod.initRouter(cb);
			cb.mockClear();
			mod.navigateToSketch("test-sketch");
			expect(cb).toHaveBeenCalledWith("test-sketch");
		});
	});
});
