import { getCanvasSize } from "./canvas-size.js";

export default function fractalTree(p, theme = "light") {
  const maxDepth = 10;
  let baseLength = 120;
  const isDark = theme === "dark";
  const backgroundColor = isDark ? "#0A0E15" : "#FCFBF7";
  const strokeColor = isDark ? "#E2E8F0" : "#1C1917";

  function branch(x, y, length, angle, depth) {
    if (depth <= 0 || length < 2) {
      return;
    }

    const x2 = x + Math.cos(angle) * length;
    const y2 = y + Math.sin(angle) * length;
    p.line(x, y, x2, y2);

    const spread = p.map(depth, 1, maxDepth, 0.15, 0.5);
    branch(x2, y2, length * p.random(0.68, 0.78), angle - spread, depth - 1);
    branch(x2, y2, length * p.random(0.68, 0.78), angle + spread, depth - 1);
  }

  p.setup = () => {
    const { width, height } = getCanvasSize();
    p.createCanvas(width, height);
    p.noLoop();
  };

  p.windowResized = () => {
    const { width, height } = getCanvasSize();
    p.resizeCanvas(width, height);
    p.redraw();
  };

  p.draw = () => {
    p.background(backgroundColor);
    p.stroke(strokeColor);
    p.strokeWeight(1.15);
    baseLength = p.height * 0.23;

    const startX = p.width * 0.5;
    const startY = p.height - 24;
    branch(startX, startY, baseLength, -p.HALF_PI, maxDepth);
  };
}
