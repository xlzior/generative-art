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
		width = null,
		height = null,
	}: ResponsiveCanvasOptions = {},
): void {
	function resolveSize() {
		const autoSize = getCanvasSize(containerId, minSize);
		return {
			width: width ?? autoSize.width,
			height: height ?? autoSize.height,
		};
	}

	p.setup = () => {
		const { width: w, height: h } = resolveSize();
		p.createCanvas(w, h);
		onSetup?.({ width: w, height: h });
	};

	p.windowResized = () => {
		const { width: w, height: h } = resolveSize();
		p.resizeCanvas(w, h);
		onResize?.({ width: w, height: h });
	};
}
