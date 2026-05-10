import type p5 from "p5";
import type { createRng } from "../utils/seeded-random.js";

export type Theme = "light" | "dark";

export type Rng = ReturnType<typeof createRng>;

/**
 * Animation controller for animated sketches.
 * Allows external control of the animation loop (for testing or unified speed control).
 */
export interface SketchAnimationController {
	/**
	 * Register a callback to be called on each animation frame.
	 * The callback receives the current frame count (starts at 0, matching p5's frameCount).
	 * Only one callback can be registered per controller.
	 */
	onFrame: (renderer: (frameCount: number) => void) => void;
	/**
	 * Stop the animation loop.
	 */
	stop: () => void;
}

export type SketchParameter =
	| {
			type: "number";
			key: string;
			label: string;
			min: number;
			max: number;
			step?: number;
	  }
	| { type: "string"; key: string; label: string }
	| { type: "boolean"; key: string; label: string }
	| { type: "colour"; key: string; label: string }
	| { type: "dimensions"; key: string; label: string };

export type DimensionsValue = { width: number | null; height: number | null };

export type InferParams<T extends readonly SketchParameter[]> = {
	[K in T[number] as K["key"]]: K extends { type: "number" }
		? number
		: K extends { type: "string" }
			? string
			: K extends { type: "boolean" }
				? boolean
				: K extends { type: "colour" }
					? string
					: K extends { type: "dimensions" }
						? DimensionsValue
						: never;
};

export interface SketchContext<TParams extends Record<string, unknown>> {
	p: p5;
	theme: Theme;
	params: TParams;
	global: import("../sketches/global-parameters.js").GlobalParams;
	rng: Rng;
	/**
	 * Animation controller - only present for animated sketches.
	 * When provided, sketches should use this instead of p.draw().
	 */
	animation?: SketchAnimationController;
}

export interface SketchModule<TParams extends Record<string, unknown>> {
	id: string;
	title: string;
	description: string;
	date: string;
	parameters: readonly SketchParameter[];
	create: (context: SketchContext<TParams>) => void;
}

export interface SketchModuleWithDefaults<
	TParams extends Record<string, unknown>,
> extends SketchModule<TParams> {
	defaults: TParams;
	defaultsFile: string;
	filePath: string;
}

export interface ResponsiveCanvasOptions {
	containerId?: string;
	minSize?: number;
	width?: number | null;
	height?: number | null;
	onSetup?: (size: { width: number; height: number }) => void;
	onResize?: (size: { width: number; height: number }) => void;
}

export interface CanvasSize {
	width: number;
	height: number;
}
