import type { CanvasSize } from "../types/sketch.js";

export function getCanvasSize(
	containerId: string = "canvas-container",
	minSize: number = 320,
): CanvasSize {
	const container = document.getElementById(containerId);
	return {
		width: Math.max(
			minSize,
			Math.floor(container?.clientWidth ?? window.innerWidth),
		),
		height: Math.max(
			minSize,
			Math.floor(container?.clientHeight ?? window.innerHeight),
		),
	};
}
