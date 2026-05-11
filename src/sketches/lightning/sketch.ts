import type {
	InferParams,
	SketchAnimationController,
	SketchContext,
	SketchParameter,
} from "../../types/sketch.js";
import { hexToRgb, themeAccent } from "../../utils/colour.js";
import { defineSketch } from "../../utils/defineSketch.js";
import { attachResponsiveCanvas } from "../../utils/responsive-canvas.js";
import { rngRandom } from "../../utils/seeded-random.js";

const parameters = [
	{
		type: "number",
		key: "segments",
		label: "Segments",
		min: 2,
		max: 8,
		step: 1,
	},
	{
		type: "number",
		key: "jitter",
		label: "Jitter",
		min: 0.05,
		max: 0.9,
		step: 0.05,
	},
	{
		type: "number",
		key: "branchChance",
		label: "Branch Chance",
		min: 0,
		max: 0.3,
		step: 0.01,
	},
	{
		type: "number",
		key: "glowWidth",
		label: "Glow Width",
		min: 2,
		max: 30,
		step: 1,
	},
	{
		type: "number",
		key: "fadeSpeed",
		label: "Fade Speed",
		min: 0.5,
		max: 16,
		step: 0.5,
	},
	{
		type: "number",
		key: "strikeInterval",
		label: "Strike Interval",
		min: 30,
		max: 300,
		step: 5,
	},
	{
		type: "number",
		key: "strokeWeight",
		label: "Core Weight",
		min: 0.5,
		max: 4,
		step: 0.25,
	},
	{ type: "colour", key: "accentColour", label: "Accent Colour" },
] as const satisfies readonly SketchParameter[];

type Params = InferParams<typeof parameters>;

interface Point {
	x: number;
	y: number;
}

interface LightningBolt {
	points: Point[];
	branches: Point[][];
	age: number;
	lifetime: number;
}

export default defineSketch({
	title: "Lightning",
	description: "Procedural lightning strikes with recursive branching.",
	date: "2026-05-10",
	parameters,
	create({
		p,
		theme = "light",
		params,
		rng,
		animation,
		global,
	}: SketchContext<Params> & { animation?: SketchAnimationController }) {
		const isDark = theme === "dark";
		const backgroundColor = isDark ? "#0A0E15" : "#FCFBF7";
		const glowRGB = hexToRgb(themeAccent(params.accentColour, theme));
		const coreColor: [number, number, number] = [255, 255, 255];

		let bolts: LightningBolt[] = [];
		let frameCount = 0;

		function generateBolt(
			x1: number,
			y1: number,
			x2: number,
			y2: number,
			depth: number,
			maxDepth: number,
			jitter: number,
			branchChance: number,
			localRng: () => number,
		): { points: Point[]; branches: Point[][] } {
			if (depth >= maxDepth) {
				return { points: [{ x: x2, y: y2 }], branches: [] };
			}

			const mx = (x1 + x2) / 2;
			const my = (y1 + y2) / 2;
			const dx = x2 - x1;
			const dy = y2 - y1;
			const len = Math.sqrt(dx * dx + dy * dy);

			if (len < 2) {
				return { points: [{ x: x2, y: y2 }], branches: [] };
			}

			const px = -dy / len;
			const py = dx / len;
			const displacement = rngRandom(localRng, -jitter, jitter) * len;
			const mxd = mx + px * displacement;
			const myd = my + py * displacement;

			let branches: Point[][] = [];
			if (
				depth > 0 &&
				depth < maxDepth - 1 &&
				rngRandom(localRng, 0, 1) < branchChance
			) {
				const bx = mxd + rngRandom(localRng, -p.width * 0.2, p.width * 0.2);
				const by = myd + (p.height - myd) * rngRandom(localRng, 0.3, 1.0);
				const branchResult = generateBolt(
					mxd,
					myd,
					bx,
					by,
					0,
					maxDepth,
					jitter * 0.6,
					branchChance * 0.5,
					localRng,
				);
				branches = [
					...branchResult.branches,
					[{ x: mxd, y: myd }, ...branchResult.points],
				];
			}

			const left = generateBolt(
				x1,
				y1,
				mxd,
				myd,
				depth + 1,
				maxDepth,
				jitter,
				branchChance,
				localRng,
			);
			const right = generateBolt(
				mxd,
				myd,
				x2,
				y2,
				depth + 1,
				maxDepth,
				jitter,
				branchChance,
				localRng,
			);

			return {
				points: [...left.points, ...right.points],
				branches: [...left.branches, ...right.branches, ...branches],
			};
		}

		function spawnBolt(): void {
			const startX = rngRandom(rng, p.width * 0.1, p.width * 0.9);
			const startY = rngRandom(rng, 0, p.height * 0.05);
			const endX = startX + rngRandom(rng, -p.width * 0.15, p.width * 0.15);
			const endY = p.height;

			const result = generateBolt(
				startX,
				startY,
				endX,
				endY,
				0,
				Math.floor(params.segments),
				params.jitter,
				params.branchChance,
				rng,
			);

			const points = [{ x: startX, y: startY }, ...result.points];
			const baseLifetime = Math.floor(60 / params.fadeSpeed);
			const lifetime = Math.max(
				1,
				Math.floor(baseLifetime * rngRandom(rng, 15, 30)),
			);

			bolts.push({
				points,
				branches: result.branches,
				age: 0,
				lifetime,
			});
		}

		function drawPoints(pts: Point[], alpha: number): void {
			if (pts.length < 2 || alpha <= 0.001) return;

			const a = Math.min(1, Math.max(0, alpha));

			p.stroke(glowRGB[0], glowRGB[1], glowRGB[2], 30 * a);
			p.strokeWeight(params.glowWidth);
			for (let i = 0; i < pts.length - 1; i++) {
				p.line(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
			}

			p.stroke(glowRGB[0], glowRGB[1], glowRGB[2], 80 * a);
			p.strokeWeight(params.glowWidth * 0.5);
			for (let i = 0; i < pts.length - 1; i++) {
				p.line(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
			}

			p.stroke(coreColor[0], coreColor[1], coreColor[2], 255 * a);
			p.strokeWeight(params.strokeWeight);
			for (let i = 0; i < pts.length - 1; i++) {
				p.line(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
			}
		}

		attachResponsiveCanvas(p, {
			width: global.dimensions.width,
			height: global.dimensions.height,
			onSetup: () => {},
			onResize: () => {
				bolts = [];
				frameCount = 0;
			},
		});

		if (animation) {
			animation.onFrame(() => {
				p.background(backgroundColor);

				const interval = Math.max(10, Math.floor(params.strikeInterval));
				if (frameCount % interval === 0) {
					spawnBolt();
				}

				for (let i = bolts.length - 1; i >= 0; i--) {
					const bolt = bolts[i];
					bolt.age++;
					const boltAlpha = Math.max(0, 1 - bolt.age / bolt.lifetime);

					if (boltAlpha <= 0) {
						bolts.splice(i, 1);
						continue;
					}

					drawPoints(bolt.points, boltAlpha);
					for (const branch of bolt.branches) {
						drawPoints(branch, boltAlpha * 0.6);
					}
				}

				if (bolts.length > 20) {
					bolts.splice(0, bolts.length - 20);
				}

				frameCount++;
			});
		}
	},
});
