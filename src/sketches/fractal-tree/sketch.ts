import { attachResponsiveCanvas } from "../../utils/responsive-canvas.js";
import { defineSketch } from "../../utils/defineSketch.js";
import type { SketchContext } from "../../types/sketch.js";

export default defineSketch({
  id: "fractal-tree",
  title: "Fractal Tree",
  description: "Recursive branching with angle jitter.",
  date: "2026-04-26",
  parameters: [
    { key: "depth", label: "Depth", min: 4, max: 14, step: 1 },
    {
      key: "baseLengthRatio",
      label: "Base Ratio",
      min: 0.1,
      max: 0.45,
      step: 0.01,
    },
    { key: "minShrink", label: "Min Shrink", min: 0.5, max: 0.9, step: 0.01 },
    { key: "maxShrink", label: "Max Shrink", min: 0.55, max: 0.95, step: 0.01 },
    { key: "minSpread", label: "Min Spread", min: 0.05, max: 0.45, step: 0.01 },
    { key: "maxSpread", label: "Max Spread", min: 0.1, max: 0.8, step: 0.01 },
    { key: "strokeWeight", label: "Stroke", min: 0.4, max: 4, step: 0.05 },
  ],
  create({ p, theme = "light", params }: SketchContext) {
    const isDark = theme === "dark";
    const backgroundColor = isDark ? "#0A0E15" : "#FCFBF7";
    const strokeColor = isDark ? "#E2E8F0" : "#1C1917";

    function branch(
      x: number,
      y: number,
      length: number,
      angle: number,
      depth: number,
    ): void {
      if (depth <= 0 || length < 2) {
        return;
      }

      const x2 = x + Math.cos(angle) * length;
      const y2 = y + Math.sin(angle) * length;
      p.line(x, y, x2, y2);

      const spread = p.map(
        depth,
        1,
        Math.max(1, Math.floor(params.depth)),
        params.minSpread,
        params.maxSpread,
      );
      const minShrink = Math.min(params.minShrink, params.maxShrink);
      const maxShrink = Math.max(params.minShrink, params.maxShrink);
      branch(
        x2,
        y2,
        length * p.random(minShrink, maxShrink),
        angle - spread,
        depth - 1,
      );
      branch(
        x2,
        y2,
        length * p.random(minShrink, maxShrink),
        angle + spread,
        depth - 1,
      );
    }

    attachResponsiveCanvas(p, {
      onSetup: () => {
        p.noLoop();
      },
      onResize: () => {
        p.redraw();
      },
    });

    p.draw = () => {
      p.background(backgroundColor);
      p.stroke(strokeColor);
      p.strokeWeight(params.strokeWeight);

      const baseLength = p.height * params.baseLengthRatio;
      const depth = Math.max(1, Math.floor(params.depth));
      const startX = p.width * 0.5;
      const startY = p.height - 24;
      branch(startX, startY, baseLength, -p.HALF_PI, depth);
    };
  },
});
