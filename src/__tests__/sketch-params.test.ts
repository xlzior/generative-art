import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SketchModuleWithDefaults } from "../types/sketch.js";

vi.setConfig({ testTimeout: 15_000 });

const testSketch = {
	id: "test-sketch",
	title: "Test Sketch",
	date: "2026-01-01",
	description: "Test",
	parameters: [],
	defaults: { x: 1, y: "hello" },
	filePath: "./test-sketch/sketch.ts",
	create: vi.fn(),
} as unknown as SketchModuleWithDefaults<Record<string, unknown>>;

const secondSketch = {
	id: "second-sketch",
	title: "Second Sketch",
	date: "2026-02-01",
	description: "Second",
	parameters: [],
	defaults: { a: 10, b: 20 },
	filePath: "./second-sketch/sketch.ts",
	create: vi.fn(),
} as unknown as SketchModuleWithDefaults<Record<string, unknown>>;

const mockStore = new Map<string, Record<string, unknown>>();

vi.mock("../sketches/index.js", () => ({
	getSketchById: (id: string) => {
		if (id === "test-sketch") return testSketch;
		if (id === "second-sketch") return secondSketch;
		return undefined;
	},
}));

vi.mock("../utils/defaults-store.js", () => ({
	store: {
		load: (id: string) => mockStore.get(id) ?? null,
		save: async (id: string, defaults: Record<string, unknown>) => {
			mockStore.set(id, { ...defaults });
		},
	},
}));

function loadModule() {
	vi.resetModules();
	return import("../sketch-params.svelte.js");
}

beforeEach(() => {
	mockStore.clear();
});

describe("sketch-params", () => {
	describe("getParamsForSketch", () => {
		it("creates entry from defaults when store returns null", async () => {
			const { getParamsForSketch } = await loadModule();
			const params = getParamsForSketch("test-sketch");
			expect(params).toEqual({ x: 1, y: "hello" });
		});

		it("loads from store when available", async () => {
			mockStore.set("test-sketch", { x: 99, y: "stored" });
			const { getParamsForSketch } = await loadModule();
			const params = getParamsForSketch("test-sketch");
			expect(params).toEqual({ x: 99, y: "stored" });
		});

		it("returns same reference on repeated calls (caching)", async () => {
			const { getParamsForSketch } = await loadModule();
			const a = getParamsForSketch("test-sketch");
			const b = getParamsForSketch("test-sketch");
			expect(a).toBe(b);
		});
	});

	describe("updateParam", () => {
		it("sets value and triggers new Map reference for reactivity", async () => {
			const { getParamsForSketch, updateParam } = await loadModule();
			getParamsForSketch("test-sketch");
			updateParam("test-sketch", "x", 42);
			const after = getParamsForSketch("test-sketch");
			expect(after.x).toBe(42);
		});

		it("preserves other params (spread integrity)", async () => {
			const { getParamsForSketch, updateParam } = await loadModule();
			getParamsForSketch("test-sketch");
			updateParam("test-sketch", "x", 99);
			const params = getParamsForSketch("test-sketch");
			expect(params).toEqual({ x: 99, y: "hello" });
		});

		it("auto-initialises params for sketch if missing", async () => {
			const { getParamsForSketch, updateParam } = await loadModule();
			updateParam("test-sketch", "x", 77);
			const params = getParamsForSketch("test-sketch");
			expect(params.x).toBe(77);
			expect(params.y).toBe("hello");
		});
	});

	describe("resetParams", () => {
		it("restores original defaults", async () => {
			const { getParamsForSketch, updateParam, resetParams } =
				await loadModule();
			getParamsForSketch("test-sketch");
			updateParam("test-sketch", "x", 999);
			resetParams("test-sketch");
			const params = getParamsForSketch("test-sketch");
			expect(params).toEqual({ x: 1, y: "hello" });
		});

		it("handles unknown sketch without error", async () => {
			const { resetParams } = await loadModule();
			expect(() => resetParams("non-existent")).not.toThrow();
		});
	});

	describe("saveDefaults", () => {
		it("calls store.save with sketch id and params", async () => {
			const spy = vi.spyOn(
				(await import("../utils/defaults-store.js")).store,
				"save",
			);
			const { getParamsForSketch, saveDefaults } = await loadModule();
			getParamsForSketch("test-sketch");
			await saveDefaults("test-sketch");
			expect(spy).toHaveBeenCalledWith("test-sketch", { x: 1, y: "hello" });
		});

		it("updates sketch.defaults on successful save", async () => {
			const { getParamsForSketch, saveDefaults, updateParam } =
				await loadModule();
			getParamsForSketch("test-sketch");
			updateParam("test-sketch", "x", 42);
			await saveDefaults("test-sketch");
			expect(testSketch.defaults).toEqual({ x: 42, y: "hello" });
		});

		it("handles unknown sketch without error", async () => {
			const { saveDefaults } = await loadModule();
			await expect(saveDefaults("non-existent")).resolves.toBeUndefined();
		});

		it("logs error when store.save rejects", async () => {
			const consoleSpy = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});
			const { getParamsForSketch, saveDefaults } = await loadModule();

			vi.spyOn(
				(await import("../utils/defaults-store.js")).store,
				"save",
			).mockRejectedValue(new Error("Network error"));

			getParamsForSketch("test-sketch");
			await saveDefaults("test-sketch");
			expect(consoleSpy).toHaveBeenCalledWith(
				"Failed to save defaults:",
				expect.any(Error),
			);
			consoleSpy.mockRestore();
		});
	});
});
