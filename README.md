# Generative Art Sketchbook

A small sketchbook repo for learning code-based generative art with p5.js.

## Why this setup

- Fast iteration in-browser with p5.js + Vite.
- One place to collect many sketch ideas over time.
- Designed for parameter tweaking and variation hunting.

## Quick start (pnpm)

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Start the dev server:

   ```bash
   pnpm dev
   ```

3. Open the local URL shown in the terminal.

## Included starter sketches

- 01 Grid Variations
- 02 Flow Field Particles
- 03 Fractal Tree
- 04 L-System Plant
- 05 Cellular Automata

Use the sketch selector and Regenerate button to quickly explore variations.

## Sketchbook workflow

1. Duplicate a sketch file under `src/sketches`.
2. Add it to `src/sketches/index.js`.
3. Adjust parameters at the top first, then refactor once the idea works.
4. Save strong outputs as PNGs and curate your favorite series.

## Sketch contract

The sketch contract is enforced in code by [src/sketches/defineSketch.js](src/sketches/defineSketch.js). App-shell changes should primarily touch shared helpers such as `src/sketches/canvas-size.js` and `src/sketches/responsive-canvas.js`, while each sketch only owns its own drawing logic and theme-aware styling.

## Next ideas to add

- Reaction diffusion
- Voronoi / Delaunay studies
- Signed distance field patterns
- Audio-reactive visuals
- Plotter-friendly SVG exports
