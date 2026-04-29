import type {
	InferParams,
	SketchContext,
	SketchParameter,
} from "../../types/sketch.js";
import { defineSketch } from "../../utils/defineSketch.js";
import { attachResponsiveCanvas } from "../../utils/responsive-canvas.js";

const parameters = [
	{
		type: "number",
		key: "spacing",
		label: "Spacing",
		min: 5,
		max: 60,
		step: 1,
	},
	{
		type: "number",
		key: "initialRadius",
		label: "Initial Radius",
		min: 2,
		max: 40,
		step: 1,
	},
	{
		type: "number",
		key: "maxRadius",
		label: "Max Radius",
		min: 20,
		max: 150,
		step: 5,
	},
	{
		type: "number",
		key: "radiusIncrement",
		label: "Radius Increment",
		min: 0.5,
		max: 5,
		step: 0.25,
	},
	{
		type: "number",
		key: "reverseProbability",
		label: "Reverse Chance %",
		min: 1,
		max: 50,
		step: 1,
	},
	{
		type: "number",
		key: "numPoints",
		label: "Control Points",
		min: 4,
		max: 20,
		step: 1,
	},
	{
		type: "number",
		key: "curveIterations",
		label: "Curve Smoothness",
		min: 1,
		max: 6,
		step: 1,
	},
	{
		type: "number",
		key: "strokeWeight",
		label: "Stroke",
		min: 0.5,
		max: 4,
		step: 0.25,
	},
] as const satisfies readonly SketchParameter[];

type Params = InferParams<typeof parameters>;

export default defineSketch({
	id: "changing-circle-line",
	title: "Changing Circle Line",
	description:
		"Circles along a line with sizes that increase and randomly reverse direction.",
	date: "2026-04-27",
	parameters,
	create({ p, theme = "light", params }: SketchContext<Params>) {
		const isDark = theme === "dark";
		const backgroundColor = isDark ? "#0A0E15" : "#FCFBF7";
		const strokeColor = isDark ? "#E2E8F0" : "#1C1917";
		const fillColor = isDark ? "#64748B" : "#CBD5E1";

		attachResponsiveCanvas(p, {
			onSetup: () => {
				p.angleMode(p.DEGREES);
				p.noLoop();
			},
			onResize: () => {
				p.redraw();
			},
		});

		p.draw = () => {
			p.background(backgroundColor);

			const margin = 50;
			const numControlPoints = Math.floor(params.numPoints);
			const numIterations = Math.floor(params.curveIterations);

			// Step 1: Generate random control points within margins
			const controlPoints: Array<{ x: number; y: number }> = [];
			for (let i = 0; i < numControlPoints; i += 1) {
				controlPoints.push({
					x: p.random(margin, p.width - margin),
					y: p.random(margin, p.height - margin),
				});
			}

			// Step 2: Apply Chaikin's algorithm for curve smoothing
			let curvePoints = [...controlPoints];
			for (let iteration = 0; iteration < numIterations; iteration += 1) {
				const smoothed: Array<{ x: number; y: number }> = [];
				for (let i = 0; i < curvePoints.length; i += 1) {
					const curr = curvePoints[i];
					const next = curvePoints[(i + 1) % curvePoints.length];

					// Chaikin's algorithm: create two new points at 1/4 and 3/4 of the segment
					const q = {
						x: curr.x * 0.75 + next.x * 0.25,
						y: curr.y * 0.75 + next.y * 0.25,
					};
					const r = {
						x: curr.x * 0.25 + next.x * 0.75,
						y: curr.y * 0.25 + next.y * 0.75,
					};

					smoothed.push(q);
					smoothed.push(r);
				}
				curvePoints = smoothed;
			}

			// Step 3: Sample the curve at regular intervals for circle placement
			const sampledPoints: Array<{ x: number; y: number }> = [];
			const spacing = Math.max(1, params.spacing);

			// Calculate distances along the curve
			let cumulativeDistance = 0;
			const distances = [0];

			for (let i = 1; i < curvePoints.length; i += 1) {
				const dx = curvePoints[i].x - curvePoints[i - 1].x;
				const dy = curvePoints[i].y - curvePoints[i - 1].y;
				cumulativeDistance += Math.hypot(dx, dy);
				distances.push(cumulativeDistance);
			}

			const totalDistance = cumulativeDistance;

			// Sample points at regular intervals
			for (let d = 0; d <= totalDistance; d += spacing) {
				let idx = 0;
				while (idx < distances.length - 1 && distances[idx + 1] < d) {
					idx += 1;
				}

				const t =
					idx < distances.length - 1
						? (d - distances[idx]) / (distances[idx + 1] - distances[idx])
						: 0;

				const point = {
					x: p.lerp(curvePoints[idx].x, curvePoints[idx + 1].x, t),
					y: p.lerp(curvePoints[idx].y, curvePoints[idx + 1].y, t),
				};

				sampledPoints.push(point);
			}

			// Draw the curve line
			p.stroke(strokeColor);
			p.noFill();
			p.strokeWeight(params.strokeWeight);
			p.beginShape();
			for (const point of curvePoints) {
				p.vertex(point.x, point.y);
			}
			p.endShape(p.CLOSE);

			// Draw circles along the sampled curve
			let radius = params.initialRadius;
			let direction = 1; // 1 for increasing, -1 for decreasing

			for (const point of sampledPoints) {
				// Draw circle
				p.fill(fillColor);
				p.stroke(strokeColor);
				p.strokeWeight(params.strokeWeight);
				p.circle(point.x, point.y, radius * 2);

				// Update radius and check for direction reversal
				radius += params.radiusIncrement * direction;

				// Clamp radius and reverse if it exceeds bounds
				if (radius >= params.maxRadius) {
					radius = params.maxRadius;
					direction = -1;
				} else if (radius <= params.initialRadius) {
					radius = params.initialRadius;
					direction = 1;
				}

				// Random chance to reverse direction
				if (Math.random() * 100 < params.reverseProbability) {
					direction *= -1;
				}
			}
		};
	},
});
