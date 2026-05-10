import type {
	InferParams,
	SketchContext,
	SketchParameter,
} from "../../types/sketch.js";
import { themeAccent } from "../../utils/colour.js";
import { defineSketch } from "../../utils/defineSketch.js";
import { attachResponsiveCanvas } from "../../utils/responsive-canvas.js";
import { rngRandom } from "../../utils/seeded-random.js";

const parameters = [
	{ type: "number", key: "depth", label: "Depth", min: 4, max: 14, step: 1 },
	{
		type: "number",
		key: "baseLengthRatio",
		label: "Base Ratio",
		min: 0.1,
		max: 0.45,
		step: 0.01,
	},
	{
		type: "number",
		key: "minShrink",
		label: "Min Shrink",
		min: 0.5,
		max: 0.9,
		step: 0.01,
	},
	{
		type: "number",
		key: "maxShrink",
		label: "Max Shrink",
		min: 0.55,
		max: 0.95,
		step: 0.01,
	},
	{
		type: "number",
		key: "minSpread",
		label: "Min Spread",
		min: 0.05,
		max: 0.45,
		step: 0.01,
	},
	{
		type: "number",
		key: "maxSpread",
		label: "Max Spread",
		min: 0.1,
		max: 0.8,
		step: 0.01,
	},
	{
		type: "number",
		key: "strokeWeight",
		label: "Stroke",
		min: 0.4,
		max: 4,
		step: 0.05,
	},
	{ type: "colour", key: "accentColour", label: "Accent Colour" },
] as const satisfies readonly SketchParameter[];

type Params = InferParams<typeof parameters>;

export default defineSketch({
	id: "fractal-tree",
	title: "Fractal Tree",
	description: "Recursive branching with angle jitter.",
	date: "2026-04-26",
	parameters,
	create({ p, theme = "light", params, rng, global }: SketchContext<Params>) {
		const isDark = theme === "dark";
		const backgroundColor = isDark ? "#0A0E15" : "#FCFBF7";

		function branch(
			x: number,
			y: number,
			length: number,
			angle: number,
			depth: number,
		): void {
			if (depth <= 0 || length < 2) {
				return;
			}

			const x2 = x + Math.cos(angle) * length;
			const y2 = y + Math.sin(angle) * length;
			p.line(x, y, x2, y2);

			const spread = p.map(
				depth,
				1,
				Math.max(1, Math.floor(params.depth)),
				params.minSpread,
				params.maxSpread,
			);
			const minShrink = Math.min(params.minShrink, params.maxShrink);
			const maxShrink = Math.max(params.minShrink, params.maxShrink);
			branch(
				x2,
				y2,
				length * rngRandom(rng, minShrink, maxShrink),
				angle - spread,
				depth - 1,
			);
			branch(
				x2,
				y2,
				length * rngRandom(rng, minShrink, maxShrink),
				angle + spread,
				depth - 1,
			);
		}

		attachResponsiveCanvas(p, {
			width: global.dimensions.width,
			height: global.dimensions.height,
			onSetup: () => {
				p.noLoop();
			},
			onResize: () => {
				p.redraw();
			},
		});

		p.draw = () => {
			p.background(backgroundColor);
			p.stroke(themeAccent(params.accentColour, theme));
			p.strokeWeight(params.strokeWeight);

			const baseLength = p.height * params.baseLengthRatio;
			const depth = Math.max(1, Math.floor(params.depth));
			const startX = p.width * 0.5;
			const startY = p.height - 24;
			branch(startX, startY, baseLength, -p.HALF_PI, depth);
		};
	},
});
