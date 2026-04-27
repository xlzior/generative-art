import { getCanvasSize } from "./canvas-size.js";

export function attachResponsiveCanvas(
  p,
  { containerId = "canvas-container", minSize = 320, onSetup, onResize } = {},
) {
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
