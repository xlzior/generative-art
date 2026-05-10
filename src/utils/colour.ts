import type { Theme } from "../types/sketch.js";

export function hexToRgb(hex: string): [number, number, number] {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	if (!result) {
		throw new Error(`Invalid hex colour: ${hex}`);
	}
	return [
		Number.parseInt(result[1], 16),
		Number.parseInt(result[2], 16),
		Number.parseInt(result[3], 16),
	];
}

function hexToHsl(hex: string): [number, number, number] {
	const [r, g, b] = hexToRgb(hex).map((c) => c / 255);
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const l = (max + min) / 2;

	if (max === min) {
		return [0, 0, Math.round(l * 100)];
	}

	const d = max - min;
	const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

	let h = 0;
	if (max === r) {
		h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
	} else if (max === g) {
		h = ((b - r) / d + 2) / 6;
	} else {
		h = ((r - g) / d + 4) / 6;
	}

	return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToHex(h: number, s: number, l: number): string {
	const sNorm = s / 100;
	const lNorm = l / 100;
	const a = sNorm * Math.min(lNorm, 1 - lNorm);
	const f = (n: number) => {
		const k = (n + h / 30) % 12;
		const color = lNorm - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
		return Math.round(255 * color)
			.toString(16)
			.padStart(2, "0");
	};
	return `#${f(0)}${f(8)}${f(4)}`;
}

export function themeAccent(hex: string, theme: Theme): string {
	if (theme === "dark") return hex;
	const [h, s, l] = hexToHsl(hex);
	return hslToHex(h, s, 100 - l);
}
