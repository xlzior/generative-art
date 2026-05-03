import type { SketchModule, SketchParameter } from "../types/sketch.js";

export function validateDefaultValue(
	sketchId: string,
	parameter: SketchParameter,
	value: unknown,
): void {
	if (parameter.type === "number") {
		if (typeof value !== "number" || !Number.isFinite(value)) {
			throw new TypeError(
				`Sketch ${sketchId} defaults.json key ${parameter.key} must be a finite number.`,
			);
		}
	} else if (parameter.type === "string") {
		if (typeof value !== "string") {
			throw new TypeError(
				`Sketch ${sketchId} defaults.json key ${parameter.key} must be a string.`,
			);
		}
	} else if (parameter.type === "boolean") {
		if (typeof value !== "boolean") {
			throw new TypeError(
				`Sketch ${sketchId} defaults.json key ${parameter.key} must be a boolean.`,
			);
		}
	} else if (parameter.type === "dimensions") {
		if (value === null) {
			return;
		}
		if (typeof value !== "object" || value === null) {
			throw new TypeError(
				`Sketch ${sketchId} defaults.json key ${parameter.key} must be an object with width and height as numbers or null.`,
			);
		}
		const obj = value as Record<string, unknown>;
		if (
			!("width" in obj) ||
			!("height" in obj) ||
			(obj.width !== null && typeof obj.width !== "number") ||
			(obj.height !== null && typeof obj.height !== "number")
		) {
			throw new TypeError(
				`Sketch ${sketchId} defaults.json key ${parameter.key} must be an object with width and height as numbers or null.`,
			);
		}
	}
}

export function validateSketchModule(
	sketch: SketchModule<Record<string, unknown>>,
	defaults: Record<string, unknown>,
): void {
	for (const parameter of sketch.parameters) {
		if (!Object.hasOwn(defaults, parameter.key)) {
			throw new TypeError(
				`Sketch ${sketch.id} defaults.json is missing key: ${parameter.key}`,
			);
		}

		validateDefaultValue(sketch.id, parameter, defaults[parameter.key]);
	}
}

export function sortSketches<T extends { date: string; title: string }>(
	sketches: T[],
): T[] {
	return [...sketches].sort((a, b) => {
		const dateComparison = b.date.localeCompare(a.date);
		if (dateComparison !== 0) {
			return dateComparison;
		}

		return a.title.localeCompare(b.title);
	});
}

export function checkDuplicateIds(sketches: { id: string }[]): void {
	const seenIds = new Set<string>();
	const duplicates = new Set<string>();

	for (const sketch of sketches) {
		if (seenIds.has(sketch.id)) {
			duplicates.add(sketch.id);
		}
		seenIds.add(sketch.id);
	}

	if (duplicates.size > 0) {
		throw new Error(
			`Duplicate sketch id(s) detected: ${[...duplicates].join(", ")}`,
		);
	}
}
