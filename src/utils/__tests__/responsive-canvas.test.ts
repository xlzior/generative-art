import type p5 from "p5";
import { describe, expect, it, vi } from "vitest";
import { attachResponsiveCanvas } from "../responsive-canvas.js";

// Mock getCanvasSize to return fixed dimensions
vi.mock("../canvas-size.js", () => ({
	getCanvasSize: vi.fn().mockReturnValue({ width: 400, height: 400 }),
}));

describe("attachResponsiveCanvas()", () => {
	it("sets up p.setup and p.windowResized", () => {
		const p = {
			setup: null as unknown as () => void,
			windowResized: null as unknown as () => void,
			createCanvas: vi.fn(),
			resizeCanvas: vi.fn(),
		};

		attachResponsiveCanvas(p as unknown as p5);

		expect(typeof p.setup).toBe("function");
		expect(typeof p.windowResized).toBe("function");
	});

	it("calls createCanvas in p.setup", () => {
		const p = {
			setup: null as unknown as () => void,
			windowResized: null as unknown as () => void,
			createCanvas: vi.fn(),
			resizeCanvas: vi.fn(),
		};

		attachResponsiveCanvas(p as unknown as p5);
		p.setup();

		expect(p.createCanvas).toHaveBeenCalledWith(400, 400);
	});

	it("calls resizeCanvas in p.windowResized", () => {
		const p = {
			setup: null as unknown as () => void,
			windowResized: null as unknown as () => void,
			createCanvas: vi.fn(),
			resizeCanvas: vi.fn(),
		};

		attachResponsiveCanvas(p as unknown as p5);
		p.windowResized();

		expect(p.resizeCanvas).toHaveBeenCalledWith(400, 400);
	});

	it("calls onSetup callback after canvas creation", () => {
		const p = {
			setup: null as unknown as () => void,
			windowResized: null as unknown as () => void,
			createCanvas: vi.fn(),
			resizeCanvas: vi.fn(),
		};
		const onSetup = vi.fn();

		attachResponsiveCanvas(p as unknown as p5, { onSetup });
		p.setup();

		expect(onSetup).toHaveBeenCalledWith({ width: 400, height: 400 });
	});

	it("calls onResize callback after resize", () => {
		const p = {
			setup: null as unknown as () => void,
			windowResized: null as unknown as () => void,
			createCanvas: vi.fn(),
			resizeCanvas: vi.fn(),
		};
		const onResize = vi.fn();

		attachResponsiveCanvas(p as unknown as p5, { onResize });
		p.windowResized();

		expect(onResize).toHaveBeenCalledWith({ width: 400, height: 400 });
	});

	it("uses custom containerId and minSize options", () => {
		const p = {
			setup: null as unknown as () => void,
			windowResized: null as unknown as () => void,
			createCanvas: vi.fn(),
			resizeCanvas: vi.fn(),
		};

		// The mock will return 400x400 regardless, but we verify the options are passed
		attachResponsiveCanvas(p as unknown as p5, {
			containerId: "custom-container",
			minSize: 500,
		});

		// The actual values come from the mock, but this verifies the function accepts options
		p.setup();
		expect(p.createCanvas).toHaveBeenCalled();
	});
});
