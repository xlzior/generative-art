import type p5 from "p5";

export type Theme = "light" | "dark";

export type SketchParameter =
  | {
    type: "number";
    key: string;
    label: string;
    min: number;
    max: number;
    step?: number;
  }
  | { type: "string"; key: string; label: string }
  | { type: "boolean"; key: string; label: string };

export type InferParams<T extends readonly SketchParameter[]> = {
  [K in T[number] as K["key"]]: K extends { type: "number" } ? number
    : K extends { type: "string" } ? string
    : K extends { type: "boolean" } ? boolean
    : never;
};

export interface SketchContext<TParams extends Record<string, unknown>> {
  p: p5;
  theme: Theme;
  params: TParams;
}

export interface SketchModule<TParams extends Record<string, unknown>> {
  id: string;
  title: string;
  description: string;
  date: string;
  parameters: readonly SketchParameter[];
  create: (context: SketchContext<TParams>) => void;
}

export interface SketchModuleWithDefaults<
  TParams extends Record<string, unknown>,
> extends SketchModule<TParams> {
  defaults: TParams;
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
