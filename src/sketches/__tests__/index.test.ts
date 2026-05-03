import { describe, expect, it } from "vitest";
import type { SketchModuleWithDefaults } from "../../types/sketch.js";
import { discoverSketches } from "../index.js";

// Helper to create a mock sketch module
function createMockSketch(id: string, date: string, title: string) {
	return {
		default: {
			id,
			title,
			date,
			description: `Test sketch ${id}`,
			parameters: [],
			create: () => {},
		} as unknown as SketchModuleWithDefaults<Record<string, unknown>>,
	};
}

describe("discoverSketches()", () => {
	describe("basic discovery", () => {
		it("returns sketches with defaults merged", () => {
			const sketchEntries: [
				string,
				{ default: SketchModuleWithDefaults<Record<string, unknown>> },
			][] = [
				[
					"./sketch-a/sketch.ts",
					createMockSketch("a", "2026-01-01", "Sketch A"),
				],
			];

			const defaultsByFolder: Record<string, Record<string, unknown>> = {
				"sketch-a": { param1: 10 },
			};

			const result = discoverSketches(sketchEntries, defaultsByFolder);

			expect(result).toHaveLength(1);
			expect(result[0].id).toBe("a");
			expect(result[0].defaults).toEqual({ param1: 10 });
			expect(result[0].defaultsFile).toBe("sketch-a/defaults.json");
			expect(result[0].filePath).toBe("./sketch-a/sketch.ts");
		});

		it("returns multiple sketches sorted correctly", () => {
			const sketchEntries: [
				string,
				{ default: SketchModuleWithDefaults<Record<string, unknown>> },
			][] = [
				[
					"./sketch-b/sketch.ts",
					createMockSketch("b", "2026-01-02", "Sketch B"),
				],
				[
					"./sketch-a/sketch.ts",
					createMockSketch("a", "2026-01-01", "Sketch A"),
				],
			];

			const defaultsByFolder: Record<string, Record<string, unknown>> = {
				"sketch-a": {},
				"sketch-b": {},
			};

			const result = discoverSketches(sketchEntries, defaultsByFolder);

			expect(result).toHaveLength(2);
			// Sorted by date descending
			expect(result[0].id).toBe("b");
			expect(result[1].id).toBe("a");
		});
	});

	describe("sort behavior", () => {
		it("sorts by date descending, then title ascending", () => {
			const sketchEntries: [
				string,
				{ default: SketchModuleWithDefaults<Record<string, unknown>> },
			][] = [
				["./zebra/sketch.ts", createMockSketch("z", "2026-01-01", "Zebra")],
				["./apple/sketch.ts", createMockSketch("a", "2026-01-02", "Apple")],
				["./banana/sketch.ts", createMockSketch("b", "2026-01-02", "Banana")],
			];

			const defaultsByFolder: Record<string, Record<string, unknown>> = {
				zebra: {},
				apple: {},
				banana: {},
			};

			const result = discoverSketches(sketchEntries, defaultsByFolder);

			// Same date (2026-01-02) sorts by title: Apple, Banana; then Zebra (older date)
			expect(result[0].id).toBe("a");
			expect(result[1].id).toBe("b");
			expect(result[2].id).toBe("z");
		});
	});

	describe("duplicate detection", () => {
		it("throws on duplicate sketch IDs", () => {
			const sketchEntries: [
				string,
				{ default: SketchModuleWithDefaults<Record<string, unknown>> },
			][] = [
				[
					"./sketch1/sketch.ts",
					createMockSketch("dup", "2026-01-01", "Sketch 1"),
				],
				[
					"./sketch2/sketch.ts",
					createMockSketch("dup", "2026-01-02", "Sketch 2"),
				],
			];

			const defaultsByFolder: Record<string, Record<string, unknown>> = {
				sketch1: {},
				sketch2: {},
			};

			expect(() => discoverSketches(sketchEntries, defaultsByFolder)).toThrow(
				"Duplicate sketch id(s) detected: dup",
			);
		});
	});

	describe("error handling", () => {
		it("throws when module doesn't export default object", () => {
			const sketchEntries: [
				string,
				{ default: SketchModuleWithDefaults<Record<string, unknown>> },
			][] = [
				[
					"./bad/sketch.ts",
					undefined as unknown as {
						default: SketchModuleWithDefaults<Record<string, unknown>>;
					},
				],
			];

			const defaultsByFolder: Record<string, Record<string, unknown>> = {
				bad: {},
			};

			expect(() => discoverSketches(sketchEntries, defaultsByFolder)).toThrow(
				"must export a default sketch object",
			);
		});

		it("throws when module path has invalid shape", () => {
			// This is hard to trigger with TypeScript, but test the regex
			const sketchEntries: [
				string,
				{ default: SketchModuleWithDefaults<Record<string, unknown>> },
			][] = [["./invalid-path.ts", createMockSketch("x", "2026-01-01", "X")]];

			const defaultsByFolder: Record<string, Record<string, unknown>> = {
				invalid: {},
			};

			expect(() => discoverSketches(sketchEntries, defaultsByFolder)).toThrow(
				"invalid shape",
			);
		});

		it("throws when defaults.json is missing for a sketch folder", () => {
			const sketchEntries: [
				string,
				{ default: SketchModuleWithDefaults<Record<string, unknown>> },
			][] = [
				[
					"./missing/sketch.ts",
					createMockSketch("missing", "2026-01-01", "Missing"),
				],
			];

			const defaultsByFolder: Record<string, Record<string, unknown>> = {};

			expect(() => discoverSketches(sketchEntries, defaultsByFolder)).toThrow(
				"Missing defaults.json for sketch folder: missing",
			);
		});

		it("throws when defaults is not an object", () => {
			const sketchEntries: [
				string,
				{ default: SketchModuleWithDefaults<Record<string, unknown>> },
			][] = [
				[
					"./bad-defaults/sketch.ts",
					createMockSketch("bd", "2026-01-01", "Bad Defaults"),
				],
			];

			const defaultsByFolder: Record<string, Record<string, unknown>> = {
				"bad-defaults": undefined as unknown as Record<string, unknown>,
			};

			expect(() => discoverSketches(sketchEntries, defaultsByFolder)).toThrow(
				"Missing defaults.json for sketch folder: bad-defaults",
			);
		});
	});
});
