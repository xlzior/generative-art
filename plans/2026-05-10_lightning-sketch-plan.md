# Lightning Sketch — Implementation Plan

## Overview

An animated generative-art sketch that simulates lightning strikes using recursive midpoint displacement with branching. Based on `plans/2026-05-10_lightning-sketch.md`.

## New Files

- `src/sketches/lightning/sketch.ts`
- `src/sketches/lightning/defaults.json`

## Architecture

| Aspect | Decision |
|--------|----------|
| **Animation** | Animated via `animation` controller (like `cellular-automata`). Bolts strike periodically and fade out. |
| **Generation** | Recursive midpoint displacement — start with a line from cloud (top) to ground (bottom), recursively displace midpoints perpendicularly by a random amount proportional to segment length. |
| **Branching** | At each recursion level, a probability check spawns a child branch. Branches are shorter, thinner, and fade faster. |
| **Rendering** | Glow effect: multiple layered lines (thick low-alpha blue/cyan outer glow → thin bright white core). Screen briefly flashes white on new strikes. |
| **Fade/Ephemeral** | Semi-transparent background overlay each frame. Each bolt tracks an alpha value that decays. Removed when fully faded. |
| **Spawning** | A new bolt is generated every `strikeInterval` frames (with slight randomization). Multiple bolts can coexist on screen at different fade stages. |

## Parameters

| Key | Label | Type | Min | Max | Step | Default |
|-----|-------|------|-----|-----|------|---------|
| `segments` | Segments | number | 2 | 6 | 1 | 4 |
| `jitter` | Jitter | number | 0.1 | 0.9 | 0.05 | 0.4 |
| `branchChance` | Branch Chance | number | 0 | 0.3 | 0.01 | 0.05 |
| `glowWidth` | Glow Width | number | 2 | 20 | 1 | 8 |
| `fadeSpeed` | Fade Speed | number | 0.5 | 10 | 0.5 | 3 |
| `strikeInterval` | Strike Interval | number | 30 | 300 | 5 | 80 |
| `strokeWeight` | Core Weight | number | 0.5 | 4 | 0.25 | 1.5 |

## Post-Implementation Validation

```sh
pnpm biome check --write
pnpm tsc --noEmit
pnpm build
```
