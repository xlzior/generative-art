# Optimize cellular-automata board allocation

**Date**: 2026-05-19
**Status**: Draft

## Problem

Every frame, `sketch.ts:145-147` deep-clones the entire board via `Object.fromEntries(...)` / `Object.entries(...)` / `[...row]`:

```ts
const next = Object.fromEntries(
  Object.entries(board).map(([k, row]) => [k, [...row]]),
) as Board;
```

This allocates O(rows + cols) objects/arrays per frame, putting pressure on the GC.

## Solution: Double Buffering

Pre-allocate two `Board` objects at init/reset and swap a read/write pointer each frame.

### Changes

#### 1. Add two buffer fields + keep `board` pointer

Keep `let board: Board` as the active read buffer. Add:

```ts
let buffers: [Board, Board];
let readIdx = 0;
```

#### 2. Helper to get the write buffer + swap

```ts
function writeBuffer(): Board {
  return buffers[1 - readIdx];
}
function swapBuffers(): void {
  readIdx = 1 - readIdx;
  board = buffers[readIdx];
}
```

`swapBuffers()` atomically updates `board` to the new read buffer, keeping `countNeighbors` (which reads from closure `board`) always correct.

#### 3. Update `randomBoard()` → `fillBoard(board)`

Rename/refactor so it fills a given board in-place instead of creating a new one:

```ts
function fillBoard(board: Board): void {
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      board[y][x] = rngRandom(rng, 0, 1) < params.seedProbability ? 1 : 0;
    }
  }
}
```

#### 4. Update `resetBoard()`

Allocate both buffers using a helper, then fill both (or fill one and let the first frame seed the other):

```ts
function createEmptyBoard(): Board {
  const b: Board = {};
  for (let y = 0; y < rows; y += 1) {
    b[y] = new Array(cols);
  }
  return b;
}

function resetBoard(): void {
  const cellSize = Math.max(1, Math.floor(params.cellSize));
  cols = Math.max(1, Math.floor(p.width / cellSize));
  rows = Math.max(1, Math.floor(p.height / cellSize));
  buffers = [createEmptyBoard(), createEmptyBoard()];
  fillBoard(buffers[0]);
  fillBoard(buffers[1]);
  readIdx = 0;
  board = buffers[0];
  p.frameRate(Math.max(1, Math.floor(params.frameRate)));
}
```

Filling both buffers ensures the first swap leaves both in a valid state.

#### 5. Update frame loop

`board` always points to the read buffer (updated by `swapBuffers()` each frame). Compute the next state into the write buffer, then swap:

```ts
const next = writeBuffer();
for (let y = 0; y < rows; y += 1) {
  for (let x = 0; x < cols; x += 1) {
    const state = board[y][x];
    const n = countNeighbors(x, y); // reads from `board` — always the read buffer
    if (state === 1 && (n < 2 || n > 3)) {
      next[y][x] = 0;
    } else if (state === 0 && n === 3) {
      next[y][x] = 1;
    } else {
      next[y][x] = state;
    }
  }
}
swapBuffers(); // updates board to point to the newly-computed buffer

// reseed — fill the stale write buffer, then swap to make it the read buffer
if (frameCount % Math.max(1, Math.floor(params.reseedFrames)) === 0) {
  fillBoard(writeBuffer());
  swapBuffers();
}
```

No deep-clone needed — `next` is the pre-allocated write buffer with existing arrays. Its cells are overwritten in place.

#### 6. No change needed for `countNeighbors` or drawing

Because `swapBuffers()` keeps `board` synced to the read buffer, `countNeighbors` (which reads from closure `board`) always sees the correct state. The drawing loop also reads `board[y][x]` — no changes needed.

### Edge Cases

- **Resize**: `onResize` calls `resetBoard()` — both buffers get re-allocated with new dimensions. Correct.
- **Reseed**: `randomBoard()` becomes `fillBoard(writeBuffer())` followed by `swapBuffers()`. This overwrites the stale write buffer, then swaps so the fresh reseed becomes the read buffer (and `board`) for the next frame.
- **Frame count parity**: If cols×rows is large, both buffers are the same size, so swapping is O(1).

### Performance Impact

- Eliminates all per-frame object/array allocations in the hot path.
- GC pressure drops to zero during steady-state animation.
- Trade-off: ~2× memory for boards (but boards are tiny — one `number[]` per row).
