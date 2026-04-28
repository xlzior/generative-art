import { attachResponsiveCanvas } from "../../utils/responsive-canvas.js";
import { defineSketch } from "../../utils/defineSketch.js";
import type { SketchContext } from "../../types/sketch.js";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  if (edge0 === edge1) {
    return value < edge0 ? 0 : 1;
  }

  const x = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
}

function depthBlob(
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
  softness: number,
): number {
  const dx = (x - centerX) / radiusX;
  const dy = (y - centerY) / radiusY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return 1 - smoothstep(1 - softness, 1, distance);
}

export default defineSketch({
  id: "stereogram-depth-map",
  title: "Stereogram Depth Map",
  description: "Grayscale visualization of the stereogram depth field.",
  date: "2026-04-29",
  parameters: [
    { key: "objectScale", label: "Object Scale", min: 0.12, max: 0.42, step: 0.01 },
    { key: "softness", label: "Softness", min: 0.04, max: 0.3, step: 0.01 },
    { key: "objectX", label: "Object X", min: 0.2, max: 0.8, step: 0.01 },
    { key: "objectY", label: "Object Y", min: 0.2, max: 0.8, step: 0.01 },
  ],
  create({ p, params }: SketchContext) {
    attachResponsiveCanvas(p, {
      onSetup: () => {
        p.pixelDensity(1);
        p.noSmooth();
        p.noLoop();
      },
      onResize: () => {
        p.redraw();
      },
    });

    p.draw = () => {
      const width = p.width;
      const height = p.height;
      const objectScale = clamp(params.objectScale, 0.08, 0.5);
      const softness = clamp(params.softness, 0.01, 0.45);
      const centerX = width * clamp(params.objectX, 0, 1);
      const centerY = height * clamp(params.objectY, 0, 1);
      const minDimension = Math.min(width, height);
      const baseRadius = Math.max(1, minDimension * objectScale);
      const mainRadiusX = baseRadius * 0.96;
      const mainRadiusY = baseRadius * 0.92;
      const highlightRadiusX = baseRadius * 0.56;
      const highlightRadiusY = baseRadius * 0.48;
      const notchRadiusX = baseRadius * 0.34;
      const notchRadiusY = baseRadius * 0.28;

      p.loadPixels();
      const pixels = p.pixels;

      for (let y = 0; y < height; y += 1) {
        const rowOffset = y * width;
        for (let x = 0; x < width; x += 1) {
          const primary = depthBlob(
            x,
            y,
            centerX,
            centerY,
            mainRadiusX,
            mainRadiusY,
            softness,
          );
          const highlight = depthBlob(
            x,
            y,
            centerX + baseRadius * 0.26,
            centerY - baseRadius * 0.16,
            highlightRadiusX,
            highlightRadiusY,
            softness * 1.1,
          );
          const notch = depthBlob(
            x,
            y,
            centerX - baseRadius * 0.18,
            centerY + baseRadius * 0.14,
            notchRadiusX,
            notchRadiusY,
            softness * 1.2,
          );

          const depth = clamp(primary * 0.92 + highlight * 0.28 - notch * 0.18, 0, 1);
          const gray = Math.round(depth * 255);
          const pixelIndex = (rowOffset + x) * 4;

          pixels[pixelIndex] = gray;
          pixels[pixelIndex + 1] = gray;
          pixels[pixelIndex + 2] = gray;
          pixels[pixelIndex + 3] = 255;
        }
      }

      p.updatePixels();
    };
  },
});