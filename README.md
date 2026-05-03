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

1. Create a folder under `src/sketches/<sketch-name>`.
2. Add `sketch.ts` and `defaults.json` inside that folder.
3. Export a default `defineSketch(...)` module from `sketch.ts`.
4. The app auto-discovers `./*/sketch.ts`, so no manual registry entry is required.
5. Save strong outputs as PNGs and curate your favorite series.

## Sketch contract

The sketch contract is enforced in code by [src/utils/defineSketch.ts](src/utils/defineSketch.ts). App-shell changes should primarily touch shared helpers such as [src/utils/canvas-size.ts](src/utils/canvas-size.ts) and [src/utils/responsive-canvas.ts](src/utils/responsive-canvas.ts), while each sketch only owns its own drawing logic and theme-aware styling.

Each sketch also defines numeric slider metadata (`parameters`) in `sketch.ts`, while default values live in `defaults.json`.

## Folder split

- `src/sketches` contains artwork modules and the sketch registry.
- `src/utils` contains shared helpers used by sketches and shell wiring.

## Parameters UI

- The left panel renders sliders from each sketch's `parameters` array.
- `Reset To Defaults` restores values from that sketch's `defaults.json`.
- `Save As Default` writes updated defaults back to `src/sketches/<sketch>/defaults.json` through the local Vite dev server endpoint.

## Next ideas to add

- Reaction diffusion
- Voronoi / Delaunay studies
- Signed distance field patterns
- Audio-reactive visuals
- Plotter-friendly SVG exports
