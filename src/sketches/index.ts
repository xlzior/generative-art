import type {
  SketchModuleWithDefaults,
  SketchParameter,
} from "../types/sketch.js";

function validateDefaultValue(
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

const sketchEntries = Object.entries(
  import.meta.glob<
    { default: SketchModuleWithDefaults<Record<string, unknown>> }
  >(
    "./*/sketch.ts",
    { eager: true },
  ),
);

const defaultsByFolder = Object.fromEntries(
  Object.entries(
    import.meta.glob<Record<string, unknown>>(
      "./*/defaults.json",
      { eager: true, import: "default" },
    ),
  )
    .map(([path, defaults]) => {
      const match = path.match(/^\.\/([^/]+)\/defaults\.json$/);
      if (!match) {
        return null;
      }
      return [match[1], defaults];
    })
    .filter((entry): entry is [string, Record<string, unknown>] =>
      entry !== null
    ),
);

const sketchModules = sketchEntries
  .map(([path, module]) => {
    if (!module || typeof module.default !== "object") {
      throw new TypeError(
        `Sketch module at ${path} must export a default sketch object.`,
      );
    }

    const folderMatch = path.match(/^\.\/([^/]+)\/sketch\.ts$/);
    if (!folderMatch) {
      throw new TypeError(`Sketch module path has invalid shape: ${path}`);
    }

    const folder = folderMatch[1];
    const defaults = defaultsByFolder[folder];
    if (!defaults || typeof defaults !== "object") {
      throw new TypeError(`Missing defaults.json for sketch folder: ${folder}`);
    }

    const sketch = module.default;
    for (const parameter of sketch.parameters) {
      if (!Object.prototype.hasOwnProperty.call(defaults, parameter.key)) {
        throw new TypeError(
          `Sketch ${sketch.id} defaults.json is missing key: ${parameter.key}`,
        );
      }

      validateDefaultValue(sketch.id, parameter, defaults[parameter.key]);
    }

    return {
      ...sketch,
      defaults,
      defaultsFile: `${folder}/defaults.json`,
      filePath: path,
    };
  })
  .sort((a, b) => {
    const dateComparison = b.date.localeCompare(a.date);
    if (dateComparison !== 0) {
      return dateComparison;
    }

    return a.title.localeCompare(b.title);
  });

const seenIds = new Set<string>();
for (const sketch of sketchModules) {
  if (seenIds.has(sketch.id)) {
    throw new Error(`Duplicate sketch id detected: ${sketch.id}`);
  }
  seenIds.add(sketch.id);
}

export const sketches: SketchModuleWithDefaults<Record<string, unknown>>[] =
  sketchModules;
