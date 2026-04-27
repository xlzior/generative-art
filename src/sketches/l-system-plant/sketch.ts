import { attachResponsiveCanvas } from "../../utils/responsive-canvas";
import { defineSketch, SketchContext } from "../../utils/defineSketch";

export default defineSketch({
  id: "l-system-plant",
  title: "L-System Plant",
  description: "String-rewriting fractal grown with turtle graphics.",
  parameters: [
    { key: "turn", label: "Turn", min: 5, max: 45, step: 0.5 },
    {
      key: "initialSegment",
      label: "Initial Segment",
      min: 20,
      max: 180,
      step: 1,
    },
    { key: "iterations", label: "Iterations", min: 1, max: 6, step: 1 },
    { key: "shrinkFactor", label: "Shrink", min: 0.3, max: 0.8, step: 0.01 },
    { key: "strokeWeight", label: "Stroke", min: 0.2, max: 3, step: 0.05 },
  ],
  create({ p, theme = "light", params }: SketchContext) {
    const rules: Record<string, string> = {
      F: "FF+[+F-F-F]-[-F+F+F]",
    };

    let sentence = "F";
    let segment = params.initialSegment;
    const isDark = theme === "dark";
    const backgroundColor = isDark ? "#060B0D" : "#F4F4F5";
    const strokeColor = isDark ? "#6EE7B7" : "#14532D";

    function rebuild(): void {
      sentence = "F";
      segment = params.initialSegment;
      const iterations = Math.max(1, Math.floor(params.iterations));
      for (let i = 0; i < iterations; i += 1) {
        let next = "";
        for (const ch of sentence) {
          next += rules[ch] || ch;
        }
        sentence = next;
        segment *= params.shrinkFactor;
      }
    }

    attachResponsiveCanvas(p, {
      onSetup: () => {
        p.angleMode(p.DEGREES);
        p.noLoop();
        rebuild();
      },
      onResize: () => {
        rebuild();
        p.redraw();
      },
    });

    p.draw = () => {
      p.background(backgroundColor);
      p.stroke(strokeColor);
      p.strokeWeight(params.strokeWeight);
      p.noFill();
      p.translate(p.width * 0.5, p.height);

      for (const ch of sentence) {
        switch (ch) {
          case "F": {
            p.line(0, 0, 0, -segment);
            p.translate(0, -segment);
            break;
          }
          case "+": {
            p.rotate(params.turn);
            break;
          }
          case "-": {
            p.rotate(-params.turn);
            break;
          }
          case "[": {
            p.push();
            break;
          }
          case "]": {
            p.pop();
            break;
          }
          default: {
            break;
          }
        }
      }
    };
  },
});
