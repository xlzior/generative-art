import { attachResponsiveCanvas } from "../../utils/responsive-canvas.js";
import { defineSketch } from "../../utils/defineSketch.js";
import type { SketchContext } from "../../types/sketch.js";

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function drawStarToGraphics(
  g: any,
  cx: number,
  cy: number,
  r: number,
  points = 5,
) {
  const inner = r * 0.45;
  g.push();
  g.translate(cx, cy);
  g.beginShape();
  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points;
    const rad = i % 2 === 0 ? r : inner;
    g.vertex(Math.cos(angle) * rad, Math.sin(angle) * rad);
  }
  g.endShape(g.CLOSE);
  g.pop();
}

export default defineSketch({
  id: "magic-eye",
  title: "Magic Eye (Five-Point Star)",
  description:
    "Single-image stereogram using colourful random noise; hidden 3D is a 5-pointed star.",
  parameters: [
    {
      key: "textureScale",
      label: "Texture Scale",
      min: 1,
      max: 64,
      step: 1,
    },
    { key: "starSize", label: "Star Size", min: 0.1, max: 1.5, step: 0.05 },
    { key: "maxShift", label: "Max Shift", min: 100, max: 200, step: 10 },
    { key: "edgeBlur", label: "Edge Blur", min: 0, max: 32, step: 1 },
    { key: "seed", label: "Seed", min: 0, max: 999999, step: 1 },
    { key: "hueMin", label: "Hue Min", min: 0, max: 360, step: 1 },
    { key: "hueMax", label: "Hue Max", min: 0, max: 360, step: 1 },
  ],
  create({ p, params }: SketchContext) {
    // Cache canvas dimensions to avoid issues with undefined p.width/p.height
    let cachedW = 0;
    let cachedH = 0;
    let needsRebuild = true;

    function build() {
      cachedW = p.width;
      cachedH = p.height;
      if (cachedW <= 0 || cachedH <= 0) return;

      const w = cachedW;
      const h = cachedH;

      // Load depth map first (star)
      const depthG = p.createGraphics(w, h);
      depthG.pixelDensity(1);
      depthG.background(0);
      depthG.noStroke();
      depthG.fill(255);
      const radius = Math.min(w, h) *
        Math.max(0.05, Math.min(1, params.starSize)) * 0.5;
      drawStarToGraphics(depthG, w / 2, h / 2, radius, 5);

      // Optionally blur depth
      if (params.edgeBlur > 0) {
        const passes = Math.min(
          6,
          Math.max(1, Math.floor(params.edgeBlur / 4)),
        );
        for (let i = 0; i < passes; i++) {
          depthG.filter(p.BLUR, Math.min(12, params.edgeBlur / 2));
        }
      }

      depthG.pixelDensity(1);
      depthG.loadPixels();

      // Create output using proper autostereogram algorithm
      const outG = p.createGraphics(w, h);
      outG.pixelDensity(1);
      outG.colorMode(p.HSB, 360, 100, 100);

      const rng = mulberry32(Math.floor(params.seed));
      const dpx = depthG.pixels;
      const textureCellSize = Math.max(1, Math.floor(params.textureScale));
      const minPeriod = Math.max(4, textureCellSize);
      const maxPeriod = Math.max(minPeriod + 2, textureCellSize * 2);
      const maxShiftVal = Math.max(1, Math.floor(params.maxShift));

      outG.loadPixels();
      const opx = outG.pixels;

      // For each row, generate the stereogram
      for (let y = 0; y < h; y++) {
        // Generate random base pattern colors for this row (large enough buffer)
        const baseColors: [number, number, number][] = [];
        for (let i = 0; i < w + maxPeriod; i++) {
          // Generate RGB directly with full range for vibrant colors
          const r = Math.floor(rng() * 256);
          const g = Math.floor(rng() * 256);
          const b = Math.floor(rng() * 256);
          baseColors.push([r, g, b]);
        }

        // For each pixel in the row
        for (let x = 0; x < w; x++) {
          const depthIdx = (y * w + x) * 4;
          const depthVal = dpx[depthIdx] / 255; // 0..1

          // Map depth to period: closer (depth=1) has smaller period, farther (depth=0) has larger
          const period = Math.round(
            minPeriod + (1 - depthVal) * (maxPeriod - minPeriod),
          );

          // Find a corresponding pixel to the left at the same depth
          let srcX = x;
          let depth = depthVal;

          // Look backwards to find pixel at same depth, roughly 'period' distance away
          for (let lookback = 1; lookback < period && srcX > 0; lookback++) {
            const checkIdx = (y * w + (x - lookback)) * 4;
            const checkDepth = dpx[checkIdx] / 255;
            if (Math.abs(checkDepth - depth) < 0.05) {
              srcX = (x - lookback + w) % w;
              break;
            }
          }

          // If we couldn't find a match, just use the period offset
          if (srcX === x) {
            srcX = ((x - period) % w + w) % w;
          }

          // Use the color from the lookup
          const color =
            baseColors[Math.floor(srcX / textureCellSize) % baseColors.length];

          const pixelIdx = (y * w + x) * 4;
          opx[pixelIdx] = color[0];
          opx[pixelIdx + 1] = color[1];
          opx[pixelIdx + 2] = color[2];
          opx[pixelIdx + 3] = 255;
        }
      }

      outG.updatePixels();

      // Draw to main canvas
      p.background(255);
      p.image(outG, 0, 0, w, h);

      // Draw shift indicator dots
      const centerX = w / 2;
      const dotY = h - 40;
      const dotRadius = 14;
      p.fill(255, 0, 0);
      p.stroke(0);
      p.strokeWeight(2);
      p.circle(centerX - maxShiftVal / 2, dotY, dotRadius);
      p.circle(centerX + maxShiftVal / 2, dotY, dotRadius);

      needsRebuild = false;
    }

    attachResponsiveCanvas(p, {
      onSetup: () => {
        needsRebuild = true;
      },
      onResize: () => {
        needsRebuild = true;
      },
    });

    p.draw = () => {
      if (needsRebuild) {
        build();
      }
      // Stop rendering loop once built - no need for continuous frame updates
      p.noLoop();
    };
  },
});
