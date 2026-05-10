import type {
	InferParams,
	SketchContext,
	SketchParameter,
} from "../../types/sketch.js";
import { defineSketch } from "../../utils/defineSketch.js";
import { attachResponsiveCanvas } from "../../utils/responsive-canvas.js";

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

function smoothstep(edge0: number, edge1: number, value: number): number {
	if (edge0 === edge1) {
		return value < edge0 ? 0 : 1;
	}

	const x = clamp((value - edge0) / (edge1 - edge0), 0, 1);
	return x * x * (3 - 2 * x);
}

function hashUint(...values: number[]): number {
	let hash = 2166136261;

	for (const value of values) {
		hash ^= value >>> 0;
		hash = Math.imul(hash, 16777619);
	}

	hash ^= hash >>> 16;
	hash = Math.imul(hash, 2246822507);
	hash ^= hash >>> 13;
	hash = Math.imul(hash, 3266489909);
	hash ^= hash >>> 16;
	return hash >>> 0;
}

function rowTone(seed: number, row: number, column: number): number {
	return 56 + (hashUint(seed, row, column) % 160);
}

function depthBlob(
	x: number,
	y: number,
	centerX: number,
	centerY: number,
	radiusX: number,
	radiusY: number,
	softness: number,
): number {
	const dx = (x - centerX) / radiusX;
	const dy = (y - centerY) / radiusY;
	const distance = Math.sqrt(dx * dx + dy * dy);
	return 1 - smoothstep(1 - softness, 1, distance);
}

const parameters = [
	{ type: "boolean", key: "viewMode", label: "Show Depth Map" },
	{
		type: "number",
		key: "patternPeriod",
		label: "Pattern Period",
		min: 72,
		max: 180,
		step: 1,
	},
	{
		type: "number",
		key: "maxOffset",
		label: "Max Offset",
		min: 4,
		max: 24,
		step: 1,
	},
	{
		type: "number",
		key: "objectScale",
		label: "Object Scale",
		min: 0.12,
		max: 0.42,
		step: 0.01,
	},
	{
		type: "number",
		key: "softness",
		label: "Softness",
		min: 0.04,
		max: 0.3,
		step: 0.01,
	},
	{
		type: "number",
		key: "objectX",
		label: "Object X",
		min: 0.2,
		max: 0.8,
		step: 0.01,
	},
	{
		type: "number",
		key: "objectY",
		label: "Object Y",
		min: 0.2,
		max: 0.8,
		step: 0.01,
	},
	{ type: "number", key: "seed", label: "Seed", min: 1, max: 9999, step: 1 },
] as const satisfies readonly SketchParameter[];

type Params = InferParams<typeof parameters>;

export default defineSketch({
	id: "stereogram",
	title: "Parallel Stereogram",
	description:
		"A random-dot autostereogram for parallel viewing. Toggle to show the depth map.",
	date: "2026-04-28",
	parameters,
	create({ p, params, global }: SketchContext<Params>) {
		attachResponsiveCanvas(p, {
			width: global.dimensions.width,
			height: global.dimensions.height,
			onSetup: () => {
				p.pixelDensity(1);
				p.noSmooth();
				p.noLoop();
			},
			onResize: () => {
				p.redraw();
			},
		});

		p.draw = () => {
			const width = p.width;
			const height = p.height;
			const period = Math.max(24, Math.floor(params.patternPeriod));
			const maxOffset = Math.max(
				1,
				Math.min(period - 1, Math.floor(params.maxOffset)),
			);
			const objectScale = clamp(params.objectScale, 0.08, 0.5);
			const softness = clamp(params.softness, 0.01, 0.45);
			const centerX = width * clamp(params.objectX, 0, 1);
			const centerY = height * clamp(params.objectY, 0, 1);
			const minDimension = Math.min(width, height);
			const baseRadius = Math.max(1, minDimension * objectScale);
			const mainRadiusX = baseRadius * 0.96;
			const mainRadiusY = baseRadius * 0.92;
			const highlightRadiusX = baseRadius * 0.56;
			const highlightRadiusY = baseRadius * 0.48;
			const notchRadiusX = baseRadius * 0.34;
			const notchRadiusY = baseRadius * 0.28;
			const depthMap = new Float32Array(width * height);

			for (let y = 0; y < height; y += 1) {
				const rowOffset = y * width;
				for (let x = 0; x < width; x += 1) {
					const primary = depthBlob(
						x,
						y,
						centerX,
						centerY,
						mainRadiusX,
						mainRadiusY,
						softness,
					);
					const highlight = depthBlob(
						x,
						y,
						centerX + baseRadius * 0.26,
						centerY - baseRadius * 0.16,
						highlightRadiusX,
						highlightRadiusY,
						softness * 1.1,
					);
					const notch = depthBlob(
						x,
						y,
						centerX - baseRadius * 0.18,
						centerY + baseRadius * 0.14,
						notchRadiusX,
						notchRadiusY,
						softness * 1.2,
					);

					depthMap[rowOffset + x] = clamp(
						primary * 0.92 + highlight * 0.28 - notch * 0.18,
						0,
						1,
					);
				}
			}

			p.loadPixels();
			const pixels = p.pixels;

			if (!params.viewMode) {
				// Stereogram rendering
				for (let y = 0; y < height; y += 1) {
					const rowOffset = y * width;
					const rowPixels = new Uint8Array(width);

					for (let x = 0; x < Math.min(period, width); x += 1) {
						rowPixels[x] = rowTone(params.seed, y, x);
					}

					for (let x = 0; x < width; x += 1) {
						const shift = Math.round(depthMap[rowOffset + x] * maxOffset);
						const repeatDistance = Math.max(1, period - shift);
						const sourceX = x - repeatDistance;

						if (x >= period && sourceX >= 0) {
							rowPixels[x] = rowPixels[sourceX];
						} else if (x >= period) {
							rowPixels[x] = rowTone(params.seed, y, x);
						}
					}

					for (let x = 0; x < width; x += 1) {
						const tone = rowPixels[x];
						const pixelIndex = (rowOffset + x) * 4;

						pixels[pixelIndex] = tone;
						pixels[pixelIndex + 1] = tone;
						pixels[pixelIndex + 2] = tone;
						pixels[pixelIndex + 3] = 255;
					}
				}
			} else {
				// Depth map rendering
				for (let y = 0; y < height; y += 1) {
					const rowOffset = y * width;
					for (let x = 0; x < width; x += 1) {
						const depth = depthMap[rowOffset + x];
						const gray = Math.round(depth * 255);
						const pixelIndex = (rowOffset + x) * 4;

						pixels[pixelIndex] = gray;
						pixels[pixelIndex + 1] = gray;
						pixels[pixelIndex + 2] = gray;
						pixels[pixelIndex + 3] = 255;
					}
				}
			}

			p.updatePixels();
		};
	},
});
