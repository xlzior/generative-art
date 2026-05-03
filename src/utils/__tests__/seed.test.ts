import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSeedFromUrl, setSeedInUrl } from "../seed.js";

describe("seed.ts", () => {
	beforeEach(() => {
		window.history.replaceState({}, "", "/");
		vi.restoreAllMocks();
	});

	describe("getSeedFromUrl()", () => {
		it("returns random number when no query param", () => {
			const seed = getSeedFromUrl();
			expect(Number.isFinite(seed)).toBe(true);
			expect(Number.isInteger(seed)).toBe(true);
		});

		it("returns seed from ?seed=42", () => {
			window.history.replaceState({}, "", "/?seed=42");
			expect(getSeedFromUrl()).toBe(42);
		});

		it("returns 0 from ?seed=0", () => {
			window.history.replaceState({}, "", "/?seed=0");
			expect(getSeedFromUrl()).toBe(0);
		});

		it("falls back to random for non-numeric seed", () => {
			window.history.replaceState({}, "", "/?seed=abc");
			const seed = getSeedFromUrl();
			expect(Number.isFinite(seed)).toBe(true);
			expect(Number.isInteger(seed)).toBe(true);
		});

		it("falls back to random for decimal seed", () => {
			window.history.replaceState({}, "", "/?seed=3.14");
			const seed = getSeedFromUrl();
			expect(Number.isFinite(seed)).toBe(true);
		});

		it("falls back to random for negative seed", () => {
			window.history.replaceState({}, "", "/?seed=-1");
			const seed = getSeedFromUrl();
			expect(Number.isFinite(seed)).toBe(true);
		});

		it("picks correct param when multiple params exist", () => {
			window.history.replaceState({}, "", "/?other=42&seed=99");
			expect(getSeedFromUrl()).toBe(99);
		});

		it("returns first seed when multiple seed params provided", () => {
			// URLSearchParams returns first value for get()
			window.history.replaceState({}, "", "/?seed=1&seed=2");
			expect(getSeedFromUrl()).toBe(1);
		});
	});

	describe("setSeedInUrl()", () => {
		it("updates URL with seed param", () => {
			setSeedInUrl(42);
			expect(window.location.href).toContain("?seed=42");
		});

		it("overwrites existing seed", () => {
			window.history.replaceState({}, "", "/?seed=1");
			setSeedInUrl(99);
			expect(window.location.href).toContain("seed=99");
			expect(window.location.href).not.toContain("seed=1");
		});

		it("uses replaceState (not pushState)", () => {
			const replaceStateSpy = vi.spyOn(window.history, "replaceState");
			setSeedInUrl(42);
			expect(replaceStateSpy).toHaveBeenCalled();
		});
	});
});
