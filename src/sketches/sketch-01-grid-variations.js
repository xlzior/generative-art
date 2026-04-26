import { attachResponsiveCanvas } from "./responsive-canvas.js";
import { getSketchPalette } from "./palettes.js";

export default function gridVariations(p, theme = "light") {
  const cellSize = 38;
  const baseMargin = 36;
  let palette;
  const colors = getSketchPalette("grid-variations", theme);

  function getGridLayout() {
    const innerWidth = Math.max(0, p.width - baseMargin * 2);
    const innerHeight = Math.max(0, p.height - baseMargin * 2);
    const cols = Math.max(1, Math.floor(innerWidth / cellSize));
    const rows = Math.max(1, Math.floor(innerHeight / cellSize));
    const gridWidth = cols * cellSize;
    const gridHeight = rows * cellSize;

    return {
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
      palette = colors.strokes;
      p.strokeWeight(1.4);
    },
    onResize: () => {
      p.redraw();
    },
  });

  p.draw = () => {
    p.background(colors.background);
    const { cols, rows, startX, startY } = getGridLayout();

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
}
