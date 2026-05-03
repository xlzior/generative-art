import { describe, expect, it } from "vitest";
import { createRng, rngChoice, rngInt, rngRandom } from "../seeded-random.js";

describe("createRng()", () => {
	it("produces deterministic output for same seed", () => {
		const a = createRng(12345);
		const b = createRng(12345);
		for (let i = 0; i < 100; i++) {
			expect(a()).toBe(b());
		}
	});

	it("produces different output for different seeds", () => {
		const a = createRng(12345);
		const b = createRng(54321);
		// First values should differ
		expect(a()).not.toBe(b());
	});

	it("matches snapshot for seed=42", () => {
		const rng = createRng(42);
		const values = Array.from({ length: 10 }, () => rng());
		expect(values).toMatchSnapshot();
	});

	it("returns values in range [0, 1)", () => {
		const rng = createRng(42);
		for (let i = 0; i < 1000; i++) {
			const v = rng();
			expect(v).toBeGreaterThanOrEqual(0);
			expect(v).toBeLessThan(1);
		}
	});
});

describe("rngRandom()", () => {
	it("returns value in [0, max) when only max provided", () => {
		const rng = createRng(42);
		for (let i = 0; i < 100; i++) {
			const v = rngRandom(rng, 10);
			expect(v).toBeGreaterThanOrEqual(0);
			expect(v).toBeLessThan(10);
		}
	});

	it("returns value in [min, max) when both provided", () => {
		const rng = createRng(42);
		for (let i = 0; i < 100; i++) {
			const v = rngRandom(rng, 5, 10);
			expect(v).toBeGreaterThanOrEqual(5);
			expect(v).toBeLessThan(10);
		}
	});

	it("returns value < 1 when range is [0, 1)", () => {
		const rng = createRng(42);
		for (let i = 0; i < 100; i++) {
			expect(rngRandom(rng, 0, 1)).toBeLessThan(1);
		}
	});

	it("is deterministic with same seed", () => {
		const a = createRng(42);
		const b = createRng(42);
		for (let i = 0; i < 50; i++) {
			expect(rngRandom(a, 0, 100)).toBe(rngRandom(b, 0, 100));
		}
	});
});

describe("rngInt()", () => {
	it("returns integer in [0, bound)", () => {
		const rng = createRng(42);
		for (let i = 0; i < 100; i++) {
			const v = rngInt(rng, 10);
			expect(Number.isInteger(v)).toBe(true);
			expect(v).toBeGreaterThanOrEqual(0);
			expect(v).toBeLessThan(10);
		}
	});

	it("always returns 0 when bound is 1", () => {
		const rng = createRng(42);
		for (let i = 0; i < 100; i++) {
			expect(rngInt(rng, 1)).toBe(0);
		}
	});

	it("returns non-negative integers", () => {
		const rng = createRng(42);
		for (let i = 0; i < 100; i++) {
			const v = rngInt(rng, 100);
			expect(v).toBeGreaterThanOrEqual(0);
		}
	});

	it("is deterministic with same seed", () => {
		const a = createRng(42);
		const b = createRng(42);
		for (let i = 0; i < 50; i++) {
			expect(rngInt(a, 100)).toBe(rngInt(b, 100));
		}
	});
});

describe("rngChoice()", () => {
	it("returns elements from the array", () => {
		const rng = createRng(42);
		const arr = [1, 2, 3, 4, 5];
		for (let i = 0; i < 100; i++) {
			expect(arr).toContain(rngChoice(rng, arr));
		}
	});

	it("always returns the only element for single-element array", () => {
		const rng = createRng(42);
		const arr = ["only"];
		for (let i = 0; i < 100; i++) {
			expect(rngChoice(rng, arr)).toBe("only");
		}
	});

	it("is deterministic with same seed", () => {
		const a = createRng(42);
		const b = createRng(42);
		const arr = [1, 2, 3, 4, 5];
		for (let i = 0; i < 50; i++) {
			expect(rngChoice(a, arr)).toBe(rngChoice(b, arr));
		}
	});

	it("returns undefined for empty array", () => {
		const rng = createRng(42);
		expect(rngChoice(rng, [])).toBeUndefined();
	});
});
