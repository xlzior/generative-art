import { attachResponsiveCanvas } from "../../utils/responsive-canvas.js";
import { defineSketch } from "../../utils/defineSketch.js";
import type { SketchContext } from "../../types/sketch.js";

export default defineSketch({
  id: "grid-variations",
  title: "Grid Variations",
  description: "Controlled randomness on a geometric grid.",
  date: "2026-04-26",
  parameters: [
    {
      type: "number",
      key: "cellSize",
      label: "Cell Size",
      min: 16,
      max: 96,
      step: 1,
    },
    {
      type: "number",
      key: "margin",
      label: "Margin",
      min: 8,
      max: 120,
      step: 1,
    },
    {
      type: "number",
      key: "strokeWeight",
      label: "Stroke",
      min: 0.4,
      max: 4,
      step: 0.1,
    },
  ],
  create({ p, theme = "light", params }: SketchContext) {
    let palette: string[];
    const isDark = theme === "dark";
    const backgroundColor = isDark ? "#070B12" : "#FCFBF7";

    interface GridLayout {
      cellSize: number;
      cols: number;
      rows: number;
      startX: number;
      startY: number;
    }

    function getGridLayout(): GridLayout {
      const cellSize = Math.max(4, Math.floor(params.cellSize));
      const margin = Math.max(0, params.margin);
      const innerWidth = Math.max(0, p.width - margin * 2);
      const innerHeight = Math.max(0, p.height - margin * 2);
      const cols = Math.max(1, Math.floor(innerWidth / cellSize));
      const rows = Math.max(1, Math.floor(innerHeight / cellSize));
      const gridWidth = cols * cellSize;
      const gridHeight = rows * cellSize;

      return {
        cellSize,
        cols,
        rows,
        startX: (p.width - gridWidth) * 0.5,
        startY: (p.height - gridHeight) * 0.5,
      };
    }

    attachResponsiveCanvas(p, {
      onSetup: () => {
        p.noLoop();
        p.angleMode(p.DEGREES);
        palette = isDark
          ? ["#7DD3FC", "#5EEAD4", "#86EFAC", "#FDE68A", "#FDBA74"]
          : ["#0F172A", "#0369A1", "#15803D", "#CA8A04", "#B45309"];
      },
      onResize: () => {
        p.redraw();
      },
    });

    p.draw = () => {
      p.background(backgroundColor);
      p.strokeWeight(params.strokeWeight);
      const { cellSize, cols, rows, startX, startY } = getGridLayout();

      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const x = startX + col * cellSize + cellSize * 0.5;
          const y = startY + row * cellSize + cellSize * 0.5;
          p.push();
          p.translate(x, y);
          p.rotate(Math.floor(p.random(4)) * 90);
          p.noFill();
          p.stroke(p.random(palette));

          const mode = Math.floor(p.random(4));
          if (mode === 0) {
            p.line(-cellSize * 0.4, 0, cellSize * 0.4, 0);
          } else if (mode === 1) {
            p.arc(0, 0, cellSize * 0.8, cellSize * 0.8, 0, 90);
          } else if (mode === 2) {
            p.rectMode(p.CENTER);
            p.square(0, 0, cellSize * p.random(0.2, 0.8));
          } else {
            p.circle(0, 0, cellSize * p.random(0.18, 0.7));
          }
          p.pop();
        }
      }
    };
  },
});
