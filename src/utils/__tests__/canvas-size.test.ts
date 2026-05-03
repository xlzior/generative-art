import { beforeEach, describe, expect, it } from "vitest";
import { getCanvasSize } from "../canvas-size.js";

describe("getCanvasSize()", () => {
	beforeEach(() => {
		document.body.innerHTML = "";
		Object.defineProperty(window, "innerWidth", {
			value: 1024,
			writable: true,
		});
		Object.defineProperty(window, "innerHeight", {
			value: 768,
			writable: true,
		});
	});

	it("uses container client dimensions when available", () => {
		const container = document.createElement("div");
		container.id = "canvas-container";
		Object.defineProperty(container, "clientWidth", { value: 800 });
		Object.defineProperty(container, "clientHeight", { value: 600 });
		document.body.appendChild(container);

		const size = getCanvasSize();
		expect(size).toEqual({ width: 800, height: 600 });
	});

	it("enforces minSize", () => {
		const container = document.createElement("div");
		container.id = "canvas-container";
		Object.defineProperty(container, "clientWidth", { value: 100 });
		Object.defineProperty(container, "clientHeight", { value: 100 });
		document.body.appendChild(container);

		const size = getCanvasSize("canvas-container", 320);
		expect(size).toEqual({ width: 320, height: 320 });
	});

	it("handles asymmetric container dimensions with minSize", () => {
		const container = document.createElement("div");
		container.id = "canvas-container";
		Object.defineProperty(container, "clientWidth", { value: 800 });
		Object.defineProperty(container, "clientHeight", { value: 100 });
		document.body.appendChild(container);

		const size = getCanvasSize("canvas-container", 320);
		expect(size).toEqual({ width: 800, height: 320 });
	});

	it("handles float container dimensions", () => {
		const container = document.createElement("div");
		container.id = "canvas-container";
		Object.defineProperty(container, "clientWidth", { value: 799.9 });
		Object.defineProperty(container, "clientHeight", { value: 600.1 });
		document.body.appendChild(container);

		const size = getCanvasSize();
		expect(size).toEqual({ width: 799, height: 600 });
	});

	it("falls back to window dimensions when container not found", () => {
		const size = getCanvasSize("non-existent");
		expect(size).toEqual({ width: 1024, height: 768 });
	});

	it("applies minSize when falling back to window dimensions", () => {
		Object.defineProperty(window, "innerWidth", { value: 100 });
		Object.defineProperty(window, "innerHeight", { value: 100 });

		const size = getCanvasSize("non-existent", 500);
		expect(size).toEqual({ width: 500, height: 500 });
	});

	it("uses default containerId 'canvas-container' and applies minSize", () => {
		const container = document.createElement("div");
		container.id = "canvas-container";
		Object.defineProperty(container, "clientWidth", { value: 400 });
		Object.defineProperty(container, "clientHeight", { value: 300 });
		document.body.appendChild(container);

		// Height 300 < minSize 320, so height becomes 320
		const size = getCanvasSize();
		expect(size).toEqual({ width: 400, height: 320 });
	});

	it("uses default minSize 320", () => {
		const container = document.createElement("div");
		container.id = "canvas-container";
		Object.defineProperty(container, "clientWidth", { value: 100 });
		Object.defineProperty(container, "clientHeight", { value: 100 });
		document.body.appendChild(container);

		const size = getCanvasSize();
		expect(size).toEqual({ width: 320, height: 320 });
	});

	it("returns integer values", () => {
		const container = document.createElement("div");
		container.id = "canvas-container";
		Object.defineProperty(container, "clientWidth", { value: 500.7 });
		Object.defineProperty(container, "clientHeight", { value: 400.3 });
		document.body.appendChild(container);

		const size = getCanvasSize();
		expect(Number.isInteger(size.width)).toBe(true);
		expect(Number.isInteger(size.height)).toBe(true);
	});
});
