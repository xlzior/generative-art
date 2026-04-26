import { attachResponsiveCanvas } from "./responsive-canvas.js";
import { getSketchPalette } from "./palettes.js";

export default function lSystemPlant(p, theme = "light") {
  const rules = {
    F: "FF+[+F-F-F]-[-F+F+F]",
  };

  let sentence = "F";
  let turn = 22.5;
  let segment = 92;
  const colors = getSketchPalette("l-system-plant", theme);

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
    p.background(colors.background);
    p.translate(p.width * 0.5, p.height - 8);
    p.stroke(colors.stroke);
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
