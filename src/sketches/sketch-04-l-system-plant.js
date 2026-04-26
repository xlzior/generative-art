import { attachResponsiveCanvas } from "./responsive-canvas.js";

export default function lSystemPlant(p, theme = "light") {
  const rules = {
    F: "FF+[+F-F-F]-[-F+F+F]",
  };

  let sentence = "F";
  let turn = 22.5;
  let segment = 92;
  const isDark = theme === "dark";
  const backgroundColor = isDark ? "#060B0D" : "#F4F4F5";
  const strokeColor = isDark ? "#6EE7B7" : "#14532D";

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

  attachResponsiveCanvas(p, {
    onSetup: () => {
      p.angleMode(p.DEGREES);
      p.noLoop();
      iterate(4);
    },
    onResize: () => {
      sentence = "F";
      segment = 92;
      iterate(4);
      p.redraw();
    },
  });

  p.draw = () => {
    p.background(backgroundColor);
    p.translate(p.width * 0.5, p.height - 8);
    p.stroke(strokeColor);
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
