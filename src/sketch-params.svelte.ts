import { getSketchById } from "./sketches/index.js";
import type { SketchModuleWithDefaults } from "./types/sketch.js";
import { store } from "./utils/defaults-store.js";

let paramsBySketch = $state(new Map<string, Record<string, unknown>>());

function cloneDefaults(
	sketch: SketchModuleWithDefaults<Record<string, unknown>>,
): Record<string, unknown> {
	return { ...sketch.defaults };
}

function ensureParams(sketchId: string): Record<string, unknown> {
	let params = paramsBySketch.get(sketchId);
	if (!params) {
		const sketch = getSketchById(sketchId);
		if (!sketch) throw new Error(`Sketch not found: ${sketchId}`);
		const stored = store.load(sketchId);
		params = stored ?? cloneDefaults(sketch);
		paramsBySketch.set(sketchId, params);
		paramsBySketch = new Map(paramsBySketch);
	}
	return params;
}

export function getParamsForSketch(sketchId: string): Record<string, unknown> {
	return ensureParams(sketchId);
}

export function updateParam(
	sketchId: string,
	key: string,
	value: unknown,
): void {
	const params = ensureParams(sketchId);
	params[key] = value;
	paramsBySketch.set(sketchId, { ...params });
	paramsBySketch = new Map(paramsBySketch);
}

export function resetParams(sketchId: string): void {
	const sketch = getSketchById(sketchId);
	if (!sketch) return;
	paramsBySketch.set(sketchId, cloneDefaults(sketch));
	paramsBySketch = new Map(paramsBySketch);
}

export async function saveDefaults(sketchId: string): Promise<void> {
	const sketch = getSketchById(sketchId);
	if (!sketch) return;
	const params = ensureParams(sketchId);
	try {
		await store.save(sketchId, params);
		sketch.defaults = { ...params };
	} catch (error) {
		console.error("Failed to save defaults:", error);
	}
}
