export default function lSystemPlant(p) {
  const rules = {
    F: "FF+[+F-F-F]-[-F+F+F]",
  };

  let sentence = "F";
  let turn = 22.5;
  let segment = 92;

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

  function iterate(steps) {
    for (let i = 0; i < steps; i += 1) {
      let next = "";
      for (const ch of sentence) {
        next += rules[ch] || ch;
      }
      sentence = next;
      segment *= 0.56;
    }
  }

  p.setup = () => {
    const { width, height } = getCanvasSize();
    p.createCanvas(width, height);
    p.angleMode(p.DEGREES);
    p.noLoop();
    iterate(4);
  };

  p.windowResized = () => {
    const { width, height } = getCanvasSize();
    p.resizeCanvas(width, height);
    sentence = "F";
    segment = 92;
    iterate(4);
    p.redraw();
  };

  p.draw = () => {
    p.background("#F4F4F5");
    p.translate(p.width * 0.5, p.height - 8);
    p.stroke("#14532D");
    p.strokeWeight(1);

    for (const ch of sentence) {
      if (ch === "F") {
        p.line(0, 0, 0, -segment);
        p.translate(0, -segment);
      } else if (ch === "+") {
        p.rotate(turn);
      } else if (ch === "-") {
        p.rotate(-turn);
      } else if (ch === "[") {
        p.push();
      } else if (ch === "]") {
        p.pop();
      }
    }
  };
}
