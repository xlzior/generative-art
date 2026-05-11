import { describe, expect, it } from "vitest";
import type { SketchParameter } from "../../types/sketch.js";
import {
	checkDuplicateIds,
	sortSketches,
	validateDefaultValue,
	validateSketchModule,
} from "../validation.js";

describe("validateDefaultValue()", () => {
	describe("number parameters", () => {
		const numberParam: SketchParameter = {
			type: "number",
			key: "size",
			label: "Size",
			min: 0,
			max: 100,
		};

		it("should pass for valid finite number", () => {
			expect(() =>
				validateDefaultValue("test-sketch", numberParam, 50),
			).not.toThrow();
		});

		it("should throw for non-number value", () => {
			expect(() =>
				validateDefaultValue("test-sketch", numberParam, "not a number"),
			).toThrow("must be a finite number");
		});

		it("should throw for NaN", () => {
			expect(() =>
				validateDefaultValue("test-sketch", numberParam, NaN),
			).toThrow("must be a finite number");
		});

		it("should throw for Infinity", () => {
			expect(() =>
				validateDefaultValue("test-sketch", numberParam, Infinity),
			).toThrow("must be a finite number");
		});
	});

	describe("string parameters", () => {
		const stringParam: SketchParameter = {
			type: "string",
			key: "name",
			label: "Name",
		};

		it("should pass for valid string", () => {
			expect(() =>
				validateDefaultValue("test-sketch", stringParam, "hello"),
			).not.toThrow();
		});

		it("should throw for non-string value", () => {
			expect(() =>
				validateDefaultValue("test-sketch", stringParam, 123),
			).toThrow("must be a string");
		});
	});

	describe("boolean parameters", () => {
		const boolParam: SketchParameter = {
			type: "boolean",
			key: "enabled",
			label: "Enabled",
		};

		it("should pass for true", () => {
			expect(() =>
				validateDefaultValue("test-sketch", boolParam, true),
			).not.toThrow();
		});

		it("should pass for false", () => {
			expect(() =>
				validateDefaultValue("test-sketch", boolParam, false),
			).not.toThrow();
		});

		it("should throw for non-boolean value", () => {
			expect(() =>
				validateDefaultValue("test-sketch", boolParam, "true"),
			).toThrow("must be a boolean");
		});
	});
});

describe("validateSketchModule()", () => {
	const createSketch = (parameters: SketchParameter[]) => ({
		title: "Test",
		date: "2026-01-01",
		description: "Test sketch",
		parameters,
		create: () => {},
	});

	it("should pass with matching defaults", () => {
		const sketch = createSketch([
			{ type: "number", key: "size", label: "Size", min: 0, max: 100 },
		]);
		expect(() =>
			validateSketchModule("test", sketch, { size: 50 }),
		).not.toThrow();
	});

	it("should throw when defaults key is missing", () => {
		const sketch = createSketch([
			{ type: "number", key: "size", label: "Size", min: 0, max: 100 },
		]);
		expect(() => validateSketchModule("test", sketch, {})).toThrow(
			"missing key",
		);
	});

	it("should throw when defaults value type mismatches", () => {
		const sketch = createSketch([
			{ type: "number", key: "size", label: "Size", min: 0, max: 100 },
		]);
		expect(() =>
			validateSketchModule("test", sketch, { size: "not a number" }),
		).toThrow("must be a finite number");
	});

	it("should handle multiple parameters", () => {
		const sketch = createSketch([
			{ type: "number", key: "size", label: "Size", min: 0, max: 100 },
			{ type: "string", key: "name", label: "Name" },
			{ type: "boolean", key: "enabled", label: "Enabled" },
		]);
		expect(() =>
			validateSketchModule("test", sketch, {
				size: 50,
				name: "test",
				enabled: true,
			}),
		).not.toThrow();
	});
});

describe("sortSketches()", () => {
	interface SortItem {
		id: string;
		date: string;
		title: string;
	}

	const createItem = (id: string, date: string, title: string): SortItem => ({
		id,
		date,
		title,
	});

	it("should sort by date descending (newest first)", () => {
		const sketches = [
			createItem("a", "2026-01-01", "A"),
			createItem("b", "2026-02-01", "B"),
		];

		const sorted = sortSketches<SortItem>(sketches);
		expect(sorted[0].id).toBe("b");
		expect(sorted[1].id).toBe("a");
	});

	it("should sort by title ascending when dates are equal", () => {
		const sketches = [
			createItem("b", "2026-01-01", "B"),
			createItem("a", "2026-01-01", "A"),
		];

		const sorted = sortSketches<SortItem>(sketches);
		expect(sorted[0].id).toBe("a");
		expect(sorted[1].id).toBe("b");
	});

	it("should sort 3+ sketches correctly", () => {
		const sketches = [
			createItem("c", "2026-01-01", "C"),
			createItem("a", "2026-01-01", "A"),
			createItem("b", "2026-02-01", "B"),
			createItem("d", "2026-03-01", "D"),
		];

		const sorted = sortSketches<SortItem>(sketches);
		expect(sorted.map((s) => s.id)).toEqual(["d", "b", "a", "c"]);
	});

	it("should not mutate the original array", () => {
		const sketches = [
			createItem("b", "2026-01-01", "B"),
			createItem("a", "2026-01-01", "A"),
		];
		const original = [...sketches];
		sortSketches<SortItem>(sketches);

		expect(sketches).toEqual(original);
	});
});

describe("checkDuplicateIds()", () => {
	it("should not throw when there are no duplicates", () => {
		const sketches = [{ id: "a" }, { id: "b" }, { id: "c" }];
		expect(() => checkDuplicateIds(sketches)).not.toThrow();
	});

	it("should throw when there are duplicate IDs", () => {
		const sketches = [{ id: "a" }, { id: "b" }, { id: "a" }];
		expect(() => checkDuplicateIds(sketches)).toThrow("Duplicate sketch id(s)");
	});

	it("should list all duplicate IDs", () => {
		const sketches = [
			{ id: "a" },
			{ id: "b" },
			{ id: "a" },
			{ id: "c" },
			{ id: "b" },
		];
		expect(() => checkDuplicateIds(sketches)).toThrow("a, b");
	});

	it("should handle single item", () => {
		const sketches = [{ id: "only" }];
		expect(() => checkDuplicateIds(sketches)).not.toThrow();
	});

	it("should handle empty array", () => {
		expect(() => checkDuplicateIds([])).not.toThrow();
	});
});
