import type p5 from "p5";
import type { ResponsiveCanvasOptions } from "../types/sketch.js";
import { getCanvasSize } from "./canvas-size.js";

export function attachResponsiveCanvas(
	p: p5,
	{
		containerId = "canvas-container",
		minSize = 320,
		onSetup,
		onResize,
	}: ResponsiveCanvasOptions = {},
): void {
	function resolveSize() {
		return getCanvasSize(containerId, minSize);
	}

	p.setup = () => {
		const { width, height } = resolveSize();
		p.createCanvas(width, height);
		onSetup?.({ width, height });
	};

	p.windowResized = () => {
		const { width, height } = resolveSize();
		p.resizeCanvas(width, height);
		onResize?.({ width, height });
	};
}
