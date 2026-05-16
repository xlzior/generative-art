import type { SketchDefinition, SketchParameter } from "../types/sketch.js";

const VALID_TYPES = [
	"number",
	"string",
	"boolean",
	"colour",
	"dimensions",
	"select",
] as const;

function validateParameter(parameter: SketchParameter): void {
	const label = `${parameter.key || "unknown"}`;

	if (!parameter || typeof parameter !== "object") {
		throw new TypeError("Sketch has an invalid parameter definition.");
	}

	if (typeof parameter.key !== "string" || parameter.key.trim() === "") {
		throw new TypeError("Sketch parameter key must be a non-empty string.");
	}

	if (typeof parameter.label !== "string" || parameter.label.trim() === "") {
		throw new TypeError(`Sketch parameter ${label} must include a label.`);
	}

	if (!VALID_TYPES.includes(parameter.type as (typeof VALID_TYPES)[number])) {
		throw new TypeError(
			`Sketch parameter ${label} has invalid type "${parameter.type}". Must be one of: ${VALID_TYPES.join(
				", ",
			)}.`,
		);
	}

	if (parameter.type === "number") {
		const { min, max, step } = parameter;
		if (!Number.isFinite(min) || !Number.isFinite(max)) {
			throw new TypeError(
				`Sketch parameter ${parameter.key} must use numeric min/max.`,
			);
		}

		if (min >= max) {
			throw new TypeError(
				`Sketch parameter ${parameter.key} requires min < max.`,
			);
		}

		if (step !== undefined && (!Number.isFinite(step) || step <= 0)) {
			throw new TypeError(
				`Sketch parameter ${parameter.key} uses an invalid step.`,
			);
		}
	}

	if (parameter.type === "select") {
		if (!Array.isArray(parameter.options) || parameter.options.length === 0) {
			throw new TypeError(
				`Sketch parameter ${parameter.key} must have a non-empty options array.`,
			);
		}

		const seenValues = new Set<string>();
		for (const opt of parameter.options) {
			if (typeof opt.label !== "string" || opt.label.trim() === "") {
				throw new TypeError(
					`Sketch parameter ${parameter.key} has an option with a missing or empty label.`,
				);
			}
			if (typeof opt.value !== "string" || opt.value === "") {
				throw new TypeError(
					`Sketch parameter ${parameter.key} has an option with a missing or empty value.`,
				);
			}
			if (seenValues.has(opt.value)) {
				throw new TypeError(
					`Sketch parameter ${parameter.key} has duplicate option value: "${opt.value}".`,
				);
			}
			seenValues.add(opt.value);
		}
	}
}

export function defineSketch<TParams extends Record<string, unknown>>(
	sketch: SketchDefinition<TParams>,
): SketchDefinition<TParams> {
	if (!sketch || typeof sketch !== "object") {
		throw new TypeError("Sketch must be an object.");
	}

	const { title, description, date, parameters, create } = sketch;

	if (typeof title !== "string" || title.trim() === "") {
		throw new TypeError("Sketch is missing a title.");
	}

	if (typeof description !== "string" || description.trim() === "") {
		throw new TypeError("Sketch is missing a description.");
	}

	if (typeof date !== "string" || date.trim() === "") {
		throw new TypeError("Sketch is missing a date.");
	}

	if (!Array.isArray(parameters)) {
		throw new TypeError("Sketch must provide a parameters array.");
	}

	const seenKeys = new Set<string>();
	for (const parameter of parameters) {
		validateParameter(parameter);

		if (seenKeys.has(parameter.key)) {
			throw new TypeError(
				`Sketch has duplicate parameter key: ${parameter.key}`,
			);
		}
		seenKeys.add(parameter.key);
	}

	if (typeof create !== "function") {
		throw new TypeError("Sketch must provide a create function.");
	}

	return sketch;
}
