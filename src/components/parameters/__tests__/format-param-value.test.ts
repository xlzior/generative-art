import { describe, expect, it } from "vitest";
import type { SketchParameter } from "../../../types/sketch.js";
import { formatParamValue } from "../format-param-value.js";

const numberParam = {
	type: "number",
	key: "val",
	label: "Val",
	min: 0,
	max: 100,
} as const satisfies SketchParameter;

const stringParam = {
	type: "string",
	key: "name",
	label: "Name",
} as const satisfies SketchParameter;

const colourParam = {
	type: "colour",
	key: "c",
	label: "Colour",
} as const satisfies SketchParameter;

describe("formatParamValue", () => {
	it("returns stringified value for string type parameters", () => {
		expect(formatParamValue(stringParam, "hello")).toBe("hello");
	});

	it("returns stringified value for colour type parameters", () => {
		expect(formatParamValue(colourParam, "#ff0000")).toBe("#ff0000");
	});

	it("returns integer string for integer numbers", () => {
		expect(formatParamValue(numberParam, 42)).toBe("42");
	});

	it("trims trailing zeros (3.100 -> 3.1)", () => {
		expect(formatParamValue(numberParam, 3.1)).toBe("3.1");
	});

	it("trims trailing decimal zeros (3.000 -> 3)", () => {
		expect(formatParamValue(numberParam, 3.0)).toBe("3");
	});

	it("preserves non-zero decimals (3.141 -> 3.141)", () => {
		expect(formatParamValue(numberParam, 3.141)).toBe("3.141");
	});

	it("handles zero correctly ('0')", () => {
		expect(formatParamValue(numberParam, 0)).toBe("0");
	});
});
