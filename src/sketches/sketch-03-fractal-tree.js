export default function fractalTree(p) {
  const maxDepth = 10;
  let baseLength = 120;

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
    const size = Math.min(window.innerWidth - 32, 1000);
    p.createCanvas(size, size * 0.68);
    p.noLoop();
  };

  p.draw = () => {
    p.background("#FCFBF7");
    p.stroke("#1C1917");
    p.strokeWeight(1.15);
    baseLength = p.height * 0.23;

    const startX = p.width * 0.5;
    const startY = p.height - 24;
    branch(startX, startY, baseLength, -p.HALF_PI, maxDepth);
  };
}
