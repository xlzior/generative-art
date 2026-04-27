import { getCanvasSize } from "./canvas-size";

interface ResponsiveCanvasOptions {
  containerId?: string;
  minSize?: number;
  onSetup?: (size: { width: number; height: number }) => void;
  onResize?: (size: { width: number; height: number }) => void;
}

export function attachResponsiveCanvas(
  p: p5,
  { containerId = "canvas-container", minSize = 320, onSetup, onResize }: ResponsiveCanvasOptions = {},
): void {
  function resolveSize() {
    return getCanvasSize(containerId, minSize);
  }

  p.setup = () => {
    const { width, height } = resolveSize();
    p.createCanvas(width, height);
    onSetup?.({ width, height });
  };

  p.windowResized = () => {
    const { width, height } = resolveSize();
    p.resizeCanvas(width, height);
    onResize?.({ width, height });
  };
}
