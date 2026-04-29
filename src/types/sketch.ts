import type p5 from "p5";
import type { z } from "zod";

export type Theme = "light" | "dark";

export interface SketchContext<
  T extends Record<string, number | string | boolean> = Record<
    string,
    number | string | boolean
  >,
> {
  p: p5;
  theme: Theme;
  params: T;
}

export interface SketchNumberParameter {
  type: "number";
  key: string;
  label: string;
  min: number;
  max: number;
  step?: number;
}

export interface SketchStringParameter {
  type: "string";
  key: string;
  label: string;
  placeholder?: string;
}

export interface SketchBooleanParameter {
  type: "boolean";
  key: string;
  label: string;
}

export type SketchParameter =
  | SketchNumberParameter
  | SketchStringParameter
  | SketchBooleanParameter;

/**
 * Input type for defineSketch - parameters optional (will be auto-extracted from schema)
 */
export interface SketchModuleInput<
  T extends Record<string, number | string | boolean> = Record<
    string,
    number | string | boolean
  >,
> {
  id: string;
  title: string;
  description: string;
  date: string;
  schema: z.ZodType<T>;
  create: (context: SketchContext<T>) => void;
}

/**
 * Output type from defineSketch - parameters required (auto-extracted from schema)
 */
export interface SketchModule<
  T extends Record<string, number | string | boolean> = Record<
    string,
    number | string | boolean
  >,
> extends SketchModuleInput<T> {
  parameters: SketchParameter[];
}

export interface SketchModuleWithDefaults<
  T extends Record<string, number | string | boolean> = Record<
    string,
    number | string | boolean
  >,
> extends SketchModule<T> {
  defaults: T;
  parameters: SketchParameter[];
  defaultsFile: string;
  filePath: string;
}

export interface ResponsiveCanvasOptions {
  containerId?: string;
  minSize?: number;
  onSetup?: (size: { width: number; height: number }) => void;
  onResize?: (size: { width: number; height: number }) => void;
}

export interface CanvasSize {
  width: number;
  height: number;
}
