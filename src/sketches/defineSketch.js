/**
 * @typedef {Object} SketchContext
 * @property {import('p5')} p
 * @property {"light"|"dark"} theme
 */

/**
 * @typedef {Object} SketchModule
 * @property {string} id
 * @property {string} title
 * @property {string} description
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

  const { id, title, description, create } = sketch;

  if (typeof id !== "string" || id.trim() === "") {
    throw new TypeError("Sketch module id must be a non-empty string.");
  }

  if (typeof title !== "string" || title.trim() === "") {
    throw new TypeError(`Sketch module ${id} is missing a title.`);
  }

  if (typeof description !== "string" || description.trim() === "") {
    throw new TypeError(`Sketch module ${id} is missing a description.`);
  }

  if (typeof create !== "function") {
    throw new TypeError(`Sketch module ${id} must provide a create(context) function.`);
  }

  return Object.freeze(sketch);
}