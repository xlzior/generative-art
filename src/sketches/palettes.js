export function getSketchPalette(sketchName, theme = "light") {
  const isDark = theme === "dark";

  switch (sketchName) {
    case "grid-variations":
      return {
        background: isDark ? "#070B12" : "#FCFBF7",
        strokes: isDark
          ? ["#7DD3FC", "#5EEAD4", "#86EFAC", "#FDE68A", "#FDBA74"]
          : ["#0F172A", "#0369A1", "#15803D", "#CA8A04", "#B45309"],
      };
    case "flow-field-particles":
      return {
        background: isDark ? [11, 13, 14] : [248, 250, 252],
        trailFade: isDark ? [11, 13, 14, 12] : [248, 250, 252, 10],
        stroke: isDark ? [220, 227, 231, 90] : [15, 23, 42, 62],
      };
    case "fractal-tree":
      return {
        background: isDark ? "#0A0E15" : "#FCFBF7",
        stroke: isDark ? "#E2E8F0" : "#1C1917",
      };
    case "l-system-plant":
      return {
        background: isDark ? "#060B0D" : "#F4F4F5",
        stroke: isDark ? "#6EE7B7" : "#14532D",
      };
    case "cellular-automata":
      return {
        background: isDark ? [9, 9, 11] : [248, 250, 252],
        cell: isDark ? [110, 231, 183] : [5, 150, 105],
      };
    default:
      return { background: isDark ? "#05080F" : "#FFFFFF" };
  }
}
