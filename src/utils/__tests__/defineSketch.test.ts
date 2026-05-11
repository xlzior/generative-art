import { describe, expect, it } from "vitest";
import { defineSketch } from "../defineSketch";

describe("defineSketch()", () => {
	const validNumberParam = {
		type: "number" as const,
		key: "size",
		label: "Size",
		min: 0,
		max: 100,
		step: 1,
	};

	const validCreate = () => {};

	describe("valid sketch", () => {
		it("should pass with all required fields and valid number parameter", () => {
			const sketch = defineSketch({
				title: "Test Sketch",
				date: "2026-01-01",
				description: "Test sketch for contract validation",
				parameters: [validNumberParam],
				create: validCreate,
			});

			expect(sketch.parameters).toHaveLength(1);
		});

		it("should return a mutable object", () => {
			const sketch = defineSketch({
				title: "Mutable Test",
				date: "2026-01-01",
				description: "Test mutable object",
				parameters: [],
				create: validCreate,
			});

			expect(Object.isFrozen(sketch)).toBe(false);
		});
	});

	describe("missing required fields", () => {
		it("should throw when title is missing", () => {
			expect(() =>
				defineSketch({
					date: "2026-01-01",
					description: "Missing title",
					parameters: [],
					create: validCreate,
				} as never),
			).toThrow("is missing a title");
		});

		it("should throw when date is missing", () => {
			expect(() =>
				defineSketch({
					title: "No Date",
					description: "Missing date",
					parameters: [],
					create: validCreate,
				} as never),
			).toThrow("is missing a date");
		});

		it("should throw when description is missing", () => {
			expect(() =>
				defineSketch({
					title: "No Description",
					date: "2026-01-01",
					parameters: [],
					create: validCreate,
				} as never),
			).toThrow("is missing a description");
		});

		it("should throw when parameters is not an array", () => {
			expect(() =>
				defineSketch({
					title: "Bad Params",
					date: "2026-01-01",
					description: "Bad parameters",
					parameters: {} as never,
					create: validCreate,
				}),
			).toThrow("must provide a parameters array");
		});

		it("should throw when create is not a function", () => {
			expect(() =>
				defineSketch({
					title: "No Create",
					date: "2026-01-01",
					description: "Missing create",
					parameters: [],
					create: "not a function" as never,
				}),
			).toThrow("must provide a create function");
		});
	});

	describe("invalid parameter types", () => {
		it("should throw for invalid parameter type", () => {
			expect(() =>
				defineSketch({
					title: "Bad Type",
					date: "2026-01-01",
					description: "Invalid parameter type",
					parameters: [
						{
							type: "invalid",
							key: "test",
							label: "Test",
						} as never,
					],
					create: validCreate,
				}),
			).toThrow("invalid type");
		});

		it("should throw when parameter type is missing", () => {
			expect(() =>
				defineSketch({
					title: "No Type",
					date: "2026-01-01",
					description: "Missing parameter type",
					parameters: [{ key: "test", label: "Test" } as never],
					create: validCreate,
				}),
			).toThrow("invalid type");
		});

		it("should throw when parameter key is not a string", () => {
			expect(() =>
				defineSketch({
					title: "Bad Key",
					date: "2026-01-01",
					description: "Non-string key",
					parameters: [
						{
							type: "number",
							key: 123,
							label: "Test",
							min: 0,
							max: 100,
						} as never,
					],
					create: validCreate,
				}),
			).toThrow("key must be a non-empty string");
		});

		it("should throw when parameter key is empty", () => {
			expect(() =>
				defineSketch({
					title: "Empty Key",
					date: "2026-01-01",
					description: "Empty key",
					parameters: [
						{
							type: "number",
							key: "",
							label: "Test",
							min: 0,
							max: 100,
						},
					],
					create: validCreate,
				}),
			).toThrow("key must be a non-empty string");
		});

		it("should throw when parameter label is missing", () => {
			expect(() =>
				defineSketch({
					title: "No Label",
					date: "2026-01-01",
					description: "Missing label",
					parameters: [
						{
							type: "number",
							key: "test",
							min: 0,
							max: 100,
						} as never,
					],
					create: validCreate,
				}),
			).toThrow("must include a label");
		});
	});

	describe("duplicate parameter keys", () => {
		it("should throw when two parameters have the same key", () => {
			expect(() =>
				defineSketch({
					title: "Duplicates",
					date: "2026-01-01",
					description: "Duplicate keys",
					parameters: [
						{ ...validNumberParam, key: "size" },
						{ ...validNumberParam, key: "size" },
					],
					create: validCreate,
				}),
			).toThrow("duplicate parameter key");
		});
	});

	describe("number parameter validation", () => {
		it("should throw when min >= max", () => {
			expect(() =>
				defineSketch({
					title: "Bad MinMax",
					date: "2026-01-01",
					description: "min >= max",
					parameters: [
						{
							type: "number",
							key: "size",
							label: "Size",
							min: 100,
							max: 50,
							step: 1,
						},
					],
					create: validCreate,
				}),
			).toThrow("requires min < max");
		});

		it("should throw when step is 0", () => {
			expect(() =>
				defineSketch({
					title: "Bad Step",
					date: "2026-01-01",
					description: "step is 0",
					parameters: [
						{
							type: "number",
							key: "size",
							label: "Size",
							min: 0,
							max: 100,
							step: 0,
						},
					],
					create: validCreate,
				}),
			).toThrow("invalid step");
		});

		it("should throw when step is negative", () => {
			expect(() =>
				defineSketch({
					title: "Negative Step",
					date: "2026-01-01",
					description: "negative step",
					parameters: [
						{
							type: "number",
							key: "size",
							label: "Size",
							min: 0,
							max: 100,
							step: -1,
						},
					],
					create: validCreate,
				}),
			).toThrow("invalid step");
		});

		it("should throw when min is not finite", () => {
			expect(() =>
				defineSketch({
					title: "Nonfinite Min",
					date: "2026-01-01",
					description: "min is NaN",
					parameters: [
						{
							type: "number",
							key: "size",
							label: "Size",
							min: NaN,
							max: 100,
							step: 1,
						},
					],
					create: validCreate,
				}),
			).toThrow("must use numeric min/max");
		});

		it("should pass with valid number parameter", () => {
			expect(() =>
				defineSketch({
					title: "Valid Number",
					date: "2026-01-01",
					description: "Valid number param",
					parameters: [
						{
							type: "number",
							key: "size",
							label: "Size",
							min: 0,
							max: 100,
							step: 2,
						},
					],
					create: validCreate,
				}),
			).not.toThrow();
		});
	});

	describe("string and boolean parameters", () => {
		it("should pass with valid string parameter", () => {
			expect(() =>
				defineSketch({
					title: "String Param",
					date: "2026-01-01",
					description: "Valid string param",
					parameters: [{ type: "string", key: "name", label: "Name" }],
					create: validCreate,
				}),
			).not.toThrow();
		});

		it("should pass with valid boolean parameter", () => {
			expect(() =>
				defineSketch({
					title: "Boolean Param",
					date: "2026-01-01",
					description: "Valid boolean param",
					parameters: [{ type: "boolean", key: "enabled", label: "Enabled" }],
					create: validCreate,
				}),
			).not.toThrow();
		});
	});
});
