import type p5 from "p5";

export type Theme = "light" | "dark";

export interface SketchContext {
  p: p5;
  theme: Theme;
  params: Record<string, number | string>;
}

export interface NumberParameter {
  key: string;
  label: string;
  type?: "number";
  min: number;
  max: number;
  step?: number;
}

export interface StringParameter {
  key: string;
  label: string;
  type: "string";
}

export type SketchParameter = NumberParameter | StringParameter;

export interface SketchModule {
  id: string;
  title: string;
  description: string;
  parameters: SketchParameter[];
  create: (context: SketchContext) => void;
}

export interface SketchModuleWithDefaults extends SketchModule {
  defaults: Record<string, number | string>;
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
