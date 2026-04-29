import { z } from "zod";
import type { SketchParameter } from "../types/sketch.js";

/**
 * Extract UI parameter definitions from a Zod schema
 * Reads min/max from number validators and infers types
 */
export function extractParametersFromSchema(
  schema: z.ZodType<any>,
): SketchParameter[] {
  const shape = (schema as z.ZodObject<any>)._def.shape();

  return Object.entries(shape).map(([key, zodType]: [string, any]) => {
    const def = zodType._def;

    // Convert key to label: "totalCircles" -> "Total Circles"
    const label = key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();

    // Infer type from Zod type and build discriminated union directly
    if (zodType instanceof z.ZodNumber) {
      const checks = def.checks || [];
      const minCheck = checks.find((c: any) => c.kind === "min");
      const maxCheck = checks.find((c: any) => c.kind === "max");

      return {
        type: "number" as const,
        key,
        label,
        min: minCheck?.value ?? 0,
        max: maxCheck?.value ?? 100,
        step: 1,
      };
    } else if (zodType instanceof z.ZodString) {
      return {
        type: "string" as const,
        key,
        label,
        placeholder: "",
      };
    } else if (zodType instanceof z.ZodBoolean) {
      return {
        type: "boolean" as const,
        key,
        label,
      };
    } else {
      throw new Error(`Unsupported parameter type for key "${key}"`);
    }
  });
}

/**
 * Get default values from a Zod schema
 * Returns the result of parsing an empty object (uses all defaults)
 */
export function getDefaultsFromSchema<T extends z.ZodObject<any>>(
  schema: T,
): z.infer<T> {
  return schema.parse({});
}
