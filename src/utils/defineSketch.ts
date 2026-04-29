import type { SketchModule, SketchModuleInput } from "../types/sketch.js";
import { extractParametersFromSchema } from "./zod-params.js";

/**
 * Validate and freeze a sketch module so the app shell can inject it safely.
 */
export function defineSketch<
  T extends Record<string, number | string | boolean> = Record<
    string,
    number | string | boolean
  >,
>(
  sketch: SketchModuleInput<T>,
): Readonly<SketchModule<T>> {
  if (!sketch || typeof sketch !== "object") {
    throw new TypeError("Sketch module must be an object.");
  }

  const { id, title, description, date, schema, create } = sketch;

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

  if (!schema) {
    throw new TypeError(`Sketch module ${id} must provide a schema.`);
  }

  // Extract parameters from schema
  const parameters = extractParametersFromSchema(schema);

  if (!Array.isArray(parameters) || parameters.length === 0) {
    throw new TypeError(`Sketch module ${id} schema produced no parameters.`);
  }

  const seenKeys = new Set<string>();
  for (const parameter of parameters) {
    if (!parameter || typeof parameter !== "object") {
      throw new TypeError(
        `Sketch module ${id} has an invalid parameter definition.`,
      );
    }

    const { key, label, type } = parameter;

    if (typeof key !== "string" || key.trim() === "") {
      throw new TypeError(
        `Sketch module ${id} parameter key must be a non-empty string.`,
      );
    }

    if (seenKeys.has(key)) {
      throw new TypeError(
        `Sketch module ${id} has duplicate parameter key: ${key}`,
      );
    }
    seenKeys.add(key);

    if (typeof label !== "string" || label.trim() === "") {
      throw new TypeError(
        `Sketch module ${id} parameter ${key} must include a label.`,
      );
    }

    // Validate type-specific constraints
    if (type === "number") {
      const numParam = parameter as any;
      if (!Number.isFinite(numParam.min) || !Number.isFinite(numParam.max)) {
        throw new TypeError(
          `Sketch module ${id} numeric parameter ${key} must use numeric min/max.`,
        );
      }

      if (numParam.min >= numParam.max) {
        throw new TypeError(
          `Sketch module ${id} numeric parameter ${key} requires min < max.`,
        );
      }

      if (
        numParam.step !== undefined &&
        (!Number.isFinite(numParam.step) || numParam.step <= 0)
      ) {
        throw new TypeError(
          `Sketch module ${id} numeric parameter ${key} uses an invalid step.`,
        );
      }
    }
  }

  if (typeof create !== "function") {
    throw new TypeError(
      `Sketch module ${id} must provide a create function.`,
    );
  }

  return Object.freeze({
    ...sketch,
    parameters,
  });
}
