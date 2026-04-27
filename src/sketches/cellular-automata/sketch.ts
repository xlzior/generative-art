import { attachResponsiveCanvas } from "../../utils/responsive-canvas";
import { defineSketch, SketchContext } from "../../utils/defineSketch";

export default defineSketch({
  id: "cellular-automata",
  title: "Cellular Automata",
  description: "A Game of Life variant with periodic reseeding.",
  parameters: [
    { key: "cellSize", label: "Cell Size", min: 3, max: 20, step: 1 },
    { key: "seedProbability", label: "Seed", min: 0.05, max: 0.9, step: 0.01 },
    { key: "frameRate", label: "Frame Rate", min: 2, max: 30, step: 1 },
    {
      key: "reseedFrames",
      label: "Reseed Frames",
      min: 60,
      max: 1200,
      step: 1,
    },
    { key: "cellPadding", label: "Cell Gap", min: 0, max: 4, step: 1 },
  ],
  create({ p, theme = "light", params }: SketchContext) {
    const isDark = theme === "dark";
    const backgroundColor = isDark ? [9, 9, 11] : [248, 250, 252];
    const cellColor = isDark ? [110, 231, 183] : [5, 150, 105];
    let cols: number;
    let rows: number;
    let board: number[][];

    function randomBoard(): number[][] {
      return Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () =>
          p.random() < params.seedProbability ? 1 : 0,
        ),
      );
    }

    function resetBoard(): void {
      const cellSize = Math.max(1, Math.floor(params.cellSize));
      cols = Math.max(1, Math.floor(p.width / cellSize));
      rows = Math.max(1, Math.floor(p.height / cellSize));
      board = randomBoard();
      p.frameRate(Math.max(1, Math.floor(params.frameRate)));
    }

    function countNeighbors(x: number, y: number): number {
      let total = 0;
      for (let yy = -1; yy <= 1; yy += 1) {
        for (let xx = -1; xx <= 1; xx += 1) {
          if (xx === 0 && yy === 0) {
            continue;
          }
          const col = (x + xx + cols) % cols;
          const row = (y + yy + rows) % rows;
          total += board[row][col];
        }
      }
      return total;
    }

    attachResponsiveCanvas(p, {
      onSetup: () => {
        p.noLoop();
        resetBoard();
      },
      onResize: () => {
        resetBoard();
        p.redraw();
      },
    });

    p.draw = () => {
      p.background(backgroundColor);
      const cellSize = Math.max(1, Math.floor(params.cellSize));
      const padding = Math.max(0, Math.floor(params.cellPadding));
      const innerSize = Math.max(0, cellSize - padding);

      for (let y = 0; y < rows; y += 1) {
        for (let x = 0; x < cols; x += 1) {
          if (board[y][x] === 1) {
            p.fill(cellColor);
            p.noStroke();
            p.rect(x * cellSize, y * cellSize, innerSize, innerSize);
          }
        }
      }

      const next = board.map((row, y) =>
        row.map((cell, x) => {
          const neighbors = countNeighbors(x, y);
          if (cell === 1 && (neighbors < 2 || neighbors > 3)) {
            return 0;
          }
          if (cell === 0 && neighbors === 3) {
            return 1;
          }
          return cell;
        }),
      );

      board = next;

      if (p.frameCount % Math.max(1, Math.floor(params.reseedFrames)) === 0) {
        board = randomBoard();
      }
    };
  },
});
