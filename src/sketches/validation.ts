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
