/**
 * Mulberry32 PRNG — simple, fast, seedable.
 * Returns a function that produces deterministic floats in [0, 1).
 */
export function createRng(seed: number): () => number {
	let state = seed | 0;
	return () => {
		state = (state + 0x6d2b79f5) | 0;
		let t = Math.imul(state ^ (state >>> 15), 1 | state);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** Deterministic random in range [min, max) — mirrors p5's random(min, max) */
export function rngRandom(
	rng: () => number,
	min: number,
	max?: number,
): number {
	if (max === undefined) {
		max = min;
		min = 0;
	}
	return min + rng() * (max - min);
}

/** Deterministic integer in [0, bound) — mirrors p5's random(bound) for integers */
export function rngInt(rng: () => number, bound: number): number {
	return Math.floor(rng() * bound);
}

/** Deterministic choice from an array */
export function rngChoice<T>(rng: () => number, arr: readonly T[]): T {
	return arr[Math.floor(rng() * arr.length)];
}
