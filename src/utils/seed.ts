const SEED_PARAM = "seed";

/** Get seed from URL ?seed=42, or generate a random one */
export function getSeedFromUrl(): number {
	const params = new URLSearchParams(window.location.search);
	const seedStr = params.get(SEED_PARAM);
	if (seedStr !== null && /^\d+$/.test(seedStr)) {
		return parseInt(seedStr, 10);
	}
	return (Math.random() * 2147483647) | 0;
}

/** Update URL with new seed (without reload) */
export function setSeedInUrl(seed: number): void {
	const url = new URL(window.location.href);
	url.searchParams.set(SEED_PARAM, String(seed));
	window.history.replaceState({}, "", url.toString());
}
