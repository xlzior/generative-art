import gridVariations from "./sketch-01-grid-variations.js";
import flowFieldParticles from "./sketch-02-flow-field-particles.js";
import fractalTree from "./sketch-03-fractal-tree.js";
import lSystemPlant from "./sketch-04-l-system-plant.js";
import cellularAutomata from "./sketch-05-cellular-automata.js";

export const sketches = [
  {
    id: "grid-variations",
    title: "01 Grid Variations",
    description: "Controlled randomness on a geometric grid.",
    factory: gridVariations,
  },
  {
    id: "flow-field-particles",
    title: "02 Flow Field Particles",
    description: "Particle trails following a noise-driven vector field.",
    factory: flowFieldParticles,
  },
  {
    id: "fractal-tree",
    title: "03 Fractal Tree",
    description: "Recursive branching with angle jitter.",
    factory: fractalTree,
  },
  {
    id: "l-system-plant",
    title: "04 L-System Plant",
    description: "String-rewriting fractal grown with turtle graphics.",
    factory: lSystemPlant,
  },
  {
    id: "cellular-automata",
    title: "05 Cellular Automata",
    description: "A Game of Life variant with periodic reseeding.",
    factory: cellularAutomata,
  },
];
