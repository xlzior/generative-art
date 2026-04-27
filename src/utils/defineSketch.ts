/**
 * Validate and freeze a sketch module so the app shell can inject it safely.
 */

export interface SketchContext {
  p: p5;
  theme: "light" | "dark";
  params: Record<string, number>;
}

export interface SketchParameter {
  key: string;
  label: string;
  min: number;
  max: number;
  step?: number;
}

export interface SketchModule {
  id: string;
  title: string;
  description: string;
  parameters: SketchParameter[];
  create: (context: SketchContext) => void;
}

export function defineSketch(sketch: SketchModule): Readonly<SketchModule> {
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

  return Object.freeze(sketch);
}
