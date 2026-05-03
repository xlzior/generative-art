import type { SketchModule, SketchParameter } from "../types/sketch.js";

const VALID_TYPES = ["number", "string", "boolean"] as const;

function validateParameter(sketchId: string, parameter: SketchParameter): void {
	if (!parameter || typeof parameter !== "object") {
		throw new TypeError(
			`Sketch module ${sketchId} has an invalid parameter definition.`,
		);
	}

	const { key, label, type } = parameter;

	if (typeof key !== "string" || key.trim() === "") {
		throw new TypeError(
			`Sketch module ${sketchId} parameter key must be a non-empty string.`,
		);
	}

	if (typeof label !== "string" || label.trim() === "") {
		throw new TypeError(
			`Sketch module ${sketchId} parameter ${key} must include a label.`,
		);
	}

	if (type !== "number" && type !== "string" && type !== "boolean") {
		throw new TypeError(
			`Sketch module ${sketchId} parameter ${key} has invalid type "${type}". Must be one of: ${VALID_TYPES.join(
				", ",
			)}.`,
		);
	}

	if (type === "number") {
		const { min, max, step } = parameter;
		if (!Number.isFinite(min) || !Number.isFinite(max)) {
			throw new TypeError(
				`Sketch module ${sketchId} parameter ${key} must use numeric min/max.`,
			);
		}

		if (min >= max) {
			throw new TypeError(
				`Sketch module ${sketchId} parameter ${key} requires min < max.`,
			);
		}

		if (step !== undefined && (!Number.isFinite(step) || step <= 0)) {
			throw new TypeError(
				`Sketch module ${sketchId} parameter ${key} uses an invalid step.`,
			);
		}
	}
}

export function defineSketch<TParams extends Record<string, unknown>>(
	sketch: SketchModule<TParams>,
): SketchModule<TParams> {
	if (!sketch || typeof sketch !== "object") {
		throw new TypeError("Sketch module must be an object.");
	}

	const { id, title, description, date, parameters, create } = sketch;

	if (typeof id !== "string" || id.trim() === "") {
		throw new TypeError("Sketch module id must be a non-empty string.");
	}

	if (typeof title !== "string" || title.trim() === "") {
		throw new TypeError(`Sketch module ${id} is missing a title.`);
	}

	if (typeof description !== "string" || description.trim() === "") {
		throw new TypeError(`Sketch module ${id} is missing a description.`);
	}

	if (typeof date !== "string" || date.trim() === "") {
		throw new TypeError(`Sketch module ${id} is missing a date.`);
	}

	if (!Array.isArray(parameters)) {
		throw new TypeError(`Sketch module ${id} must provide a parameters array.`);
	}

	const seenKeys = new Set<string>();
	for (const parameter of parameters) {
		validateParameter(id, parameter);

		if (seenKeys.has(parameter.key)) {
			throw new TypeError(
				`Sketch module ${id} has duplicate parameter key: ${parameter.key}`,
			);
		}
		seenKeys.add(parameter.key);
	}

	if (typeof create !== "function") {
		throw new TypeError(`Sketch module ${id} must provide a create function.`);
	}

	return sketch;
}
