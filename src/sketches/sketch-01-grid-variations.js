export default function gridVariations(p, theme = "light") {
  const cellSize = 38;
  const margin = 36;
  let palette;
  const isDark = theme === "dark";
  const backgroundColor = isDark ? "#070B12" : "#FCFBF7";

  function getCanvasSize() {
    const container = document.getElementById("canvas-container");
    return {
      width: Math.max(
        320,
        Math.floor(container?.clientWidth ?? window.innerWidth),
      ),
      height: Math.max(
        320,
        Math.floor(container?.clientHeight ?? window.innerHeight),
      ),
    };
  }

  p.setup = () => {
    const { width, height } = getCanvasSize();
    p.createCanvas(width, height);
    p.noLoop();
    p.angleMode(p.DEGREES);
    palette = isDark
      ? ["#7DD3FC", "#5EEAD4", "#86EFAC", "#FDE68A", "#FDBA74"]
      : ["#0F172A", "#0369A1", "#15803D", "#CA8A04", "#B45309"];
    p.strokeWeight(1.4);
  };

  p.windowResized = () => {
    const { width, height } = getCanvasSize();
    p.resizeCanvas(width, height);
    p.redraw();
  };

  p.draw = () => {
    p.background(backgroundColor);

    for (let y = margin; y < p.height - margin; y += cellSize) {
      for (let x = margin; x < p.width - margin; x += cellSize) {
        p.push();
        p.translate(x + cellSize * 0.5, y + cellSize * 0.5);
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
