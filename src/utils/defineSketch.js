/**
 * @typedef {Object} SketchContext
 * @property {import('p5')} p
 * @property {"light"|"dark"} theme
 * @property {Record<string, number>} params
 */

/**
 * @typedef {Object} SketchParameter
 * @property {string} key
 * @property {string} label
 * @property {number} min
 * @property {number} max
 * @property {number} [step]
 */

/**
 * @typedef {Object} SketchModule
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {SketchParameter[]} parameters
 * @property {(context: SketchContext) => void} create
 */

/**
 * Validate and freeze a sketch module so the app shell can inject it safely.
 *
 * @param {SketchModule} sketch
 * @returns {Readonly<SketchModule>}
 */
export function defineSketch(sketch) {
  if (!sketch || typeof sketch !== "object") {
    throw new TypeError("Sketch module must be an object.");
  }

  const { id, title, description, parameters, create } = sketch;

  if (typeof id !== "string" || id.trim() === "") {
    throw new TypeError("Sketch module id must be a non-empty string.");
  }

  if (typeof title !== "string" || title.trim() === "") {
    throw new TypeError(`Sketch module ${id} is missing a title.`);
  }

  if (typeof description !== "string" || description.trim() === "") {
    throw new TypeError(`Sketch module ${id} is missing a description.`);
  }

  if (!Array.isArray(parameters)) {
    throw new TypeError(`Sketch module ${id} must provide a parameters array.`);
  }

  const seenKeys = new Set();
  for (const parameter of parameters) {
    if (!parameter || typeof parameter !== "object") {
      throw new TypeError(
        `Sketch module ${id} has an invalid parameter definition.`,
      );
    }

    const { key, label, min, max, step } = parameter;

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

    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      throw new TypeError(
        `Sketch module ${id} parameter ${key} must use numeric min/max.`,
      );
    }

    if (min >= max) {
      throw new TypeError(
        `Sketch module ${id} parameter ${key} requires min < max.`,
      );
    }

    if (step !== undefined && (!Number.isFinite(step) || step <= 0)) {
      throw new TypeError(
        `Sketch module ${id} parameter ${key} uses an invalid step.`,
      );
    }
  }

  if (typeof create !== "function") {
    throw new TypeError(
      `Sketch module ${id} must provide a create(context) function.`,
    );
  }

  return Object.freeze(sketch);
}
