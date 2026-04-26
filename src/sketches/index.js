const sketchModules = Object.entries(
  import.meta.glob("./sketch-*.js", { eager: true }),
)
  .map(([path, module]) => {
    if (!module || typeof module.default !== "object") {
      throw new TypeError(
        `Sketch module at ${path} must export a default sketch object.`,
      );
    }

    return module.default;
  })
  .sort((a, b) => a.id.localeCompare(b.id));

const seenIds = new Set();

for (const sketch of sketchModules) {
  if (seenIds.has(sketch.id)) {
    throw new Error(`Duplicate sketch id detected: ${sketch.id}`);
  }

  seenIds.add(sketch.id);
}

export const sketches = sketchModules;
