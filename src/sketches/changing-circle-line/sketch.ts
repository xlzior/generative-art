import { attachResponsiveCanvas } from "../../utils/responsive-canvas.js";
import { defineSketch } from "../../utils/defineSketch.js";
import type { SketchContext } from "../../types/sketch.js";

export default defineSketch({
  id: "changing-circle-line",
  title: "Changing Circle Line",
  description:
    "Circles along a line with sizes that increase and randomly reverse direction.",
  parameters: [
    { key: "spacing", label: "Spacing", min: 5, max: 60, step: 1 },
    {
      key: "initialRadius",
      label: "Initial Radius",
      min: 2,
      max: 40,
      step: 1,
    },
    {
      key: "maxRadius",
      label: "Max Radius",
      min: 20,
      max: 150,
      step: 5,
    },
    {
      key: "radiusIncrement",
      label: "Radius Increment",
      min: 0.5,
      max: 5,
      step: 0.25,
    },
    {
      key: "reverseProbability",
      label: "Reverse Chance %",
      min: 1,
      max: 50,
      step: 1,
    },
    { key: "curviness", label: "Curviness", min: 0.1, max: 2, step: 0.1 },
    { key: "strokeWeight", label: "Stroke", min: 0.5, max: 4, step: 0.25 },
  ],
  create({ p, theme = "light", params }: SketchContext) {
    const isDark = theme === "dark";
    const backgroundColor = isDark ? "#0A0E15" : "#FCFBF7";
    const strokeColor = isDark ? "#E2E8F0" : "#1C1917";
    const fillColor = isDark ? "#64748B" : "#CBD5E1";

    attachResponsiveCanvas(p, {
      onSetup: () => {
        p.angleMode(p.DEGREES);
        p.noLoop();
      },
      onResize: () => {
        p.redraw();
      },
    });

    p.draw = () => {
      p.background(backgroundColor);

      // Generate wandering curved path using Perlin noise
      const curvePoints: Array<{ x: number; y: number }> = [];
      const spacing = Math.max(1, params.spacing);
      const maxPathLength = Math.hypot(p.width, p.height) * 2;
      const numPoints = Math.floor(maxPathLength / spacing);

      const padding = 50;
      // Randomize starting point
      let x = p.random(padding, p.width - padding);
      let y = p.random(padding, p.height - padding);

      // Random seed for Perlin noise to change direction each time
      const noiseSeed = p.random(10000);

      for (let i = 0; i < numPoints; i += 1) {
        // Calculate velocity from Perlin noise with random seed
        const angle = p.noise(x * 0.003, y * 0.003, i * 0.02 + noiseSeed) * p.TWO_PI *
          params.curviness;
        const stepSize = spacing * 0.8;
        let velX = Math.cos(angle) * stepSize;
        let velY = Math.sin(angle) * stepSize;

        // Calculate distance to walls
        const distToLeft = x - padding;
        const distToRight = p.width - padding - x;
        const distToTop = y - padding;
        const distToBottom = p.height - padding - y;

        const repelDistance = 100;

        // Repel from left wall
        if (distToLeft < repelDistance) {
          const strength = 1 - distToLeft / repelDistance;
          velX += strength * stepSize * 1.5;
        }
        // Repel from right wall
        if (distToRight < repelDistance) {
          const strength = 1 - distToRight / repelDistance;
          velX -= strength * stepSize * 1.5;
        }
        // Repel from top wall
        if (distToTop < repelDistance) {
          const strength = 1 - distToTop / repelDistance;
          velY += strength * stepSize * 1.5;
        }
        // Repel from bottom wall
        if (distToBottom < repelDistance) {
          const strength = 1 - distToBottom / repelDistance;
          velY -= strength * stepSize * 1.5;
        }

        // Move along the calculated velocity
        x += velX;
        y += velY;

        // Hard clamp to bounds as safety measure
        x = Math.max(padding, Math.min(p.width - padding, x));
        y = Math.max(padding, Math.min(p.height - padding, y));

        curvePoints.push({ x, y });
      }

      // Draw curve line
      p.stroke(strokeColor);
      p.noFill();
      p.strokeWeight(params.strokeWeight);
      p.beginShape();
      for (const point of curvePoints) {
        p.vertex(point.x, point.y);
      }
      p.endShape();

      // Draw circles along the curve
      let radius = params.initialRadius;
      let direction = 1; // 1 for increasing, -1 for decreasing

      for (const point of curvePoints) {
        // Draw circle
        p.fill(fillColor);
        p.stroke(strokeColor);
        p.strokeWeight(params.strokeWeight);
        p.circle(point.x, point.y, radius * 2);

        // Update radius and check for direction reversal
        radius += params.radiusIncrement * direction;

        // Clamp radius and reverse if it exceeds bounds
        if (radius >= params.maxRadius) {
          radius = params.maxRadius;
          direction = -1;
        } else if (radius <= params.initialRadius) {
          radius = params.initialRadius;
          direction = 1;
        }

        // Random chance to reverse direction
        if (Math.random() * 100 < params.reverseProbability) {
          direction *= -1;
        }
      }
    };
  },
});
