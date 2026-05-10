import type { InferParams, SketchParameter } from "../types/sketch.js";

export const globalParameters = [
	{ type: "dimensions", key: "dimensions", label: "Canvas Size" },
] as const satisfies readonly SketchParameter[];

export type GlobalParams = InferParams<typeof globalParameters>;

export const globalDefaults: GlobalParams = {
	dimensions: { width: null, height: null },
};
