import { getCanvasSize } from "./canvas-size.js";

export default function cellularAutomata(p, theme = "light") {
  const cell = 8;
  const isDark = theme === "dark";
  const backgroundColor = isDark ? [9, 9, 11] : [248, 250, 252];
  const cellColor = isDark ? [110, 231, 183] : [5, 150, 105];
  let cols;
  let rows;
  let board;

  function randomBoard() {
    return Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => (p.random() < 0.3 ? 1 : 0)),
    );
  }

  function countNeighbors(x, y) {
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

  p.setup = () => {
    const { width, height } = getCanvasSize();
    p.createCanvas(width, height);
    cols = Math.floor(p.width / cell);
    rows = Math.floor(p.height / cell);
    board = randomBoard();
    p.frameRate(12);
    p.noStroke();
  };

  p.windowResized = () => {
    const { width, height } = getCanvasSize();
    p.resizeCanvas(width, height);
    cols = Math.floor(p.width / cell);
    rows = Math.floor(p.height / cell);
    board = randomBoard();
  };

  p.draw = () => {
    p.background(...backgroundColor);

    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        if (board[y][x] === 1) {
          p.fill(...cellColor);
          p.rect(x * cell, y * cell, cell - 1, cell - 1);
        }
      }
    }

    const next = board.map((row) => row.slice());
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        const state = board[y][x];
        const n = countNeighbors(x, y);

        if (state === 1 && (n < 2 || n > 3)) {
          next[y][x] = 0;
        } else if (state === 0 && n === 3) {
          next[y][x] = 1;
        }
      }
    }

    board = next;

    if (p.frameCount % 420 === 0) {
      board = randomBoard();
    }
  };
}
