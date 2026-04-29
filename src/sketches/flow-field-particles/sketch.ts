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
		key: "particleCount",
		label: "Particles",
		min: 100,
		max: 5000,
		step: 50,
	},
	{
		type: "number",
		key: "stepSize",
		label: "Step Size",
		min: 0.2,
		max: 4,
		step: 0.1,
	},
	{
		type: "number",
		key: "noiseScale",
		label: "Noise Scale",
		min: 0.0005,
		max: 0.02,
		step: 0.0001,
	},
	{
		type: "number",
		key: "ttlMin",
		label: "TTL Min",
		min: 20,
		max: 500,
		step: 1,
	},
	{
		type: "number",
		key: "ttlMax",
		label: "TTL Max",
		min: 30,
		max: 800,
		step: 1,
	},
	{
		type: "number",
		key: "strokeWeight",
		label: "Stroke",
		min: 0.2,
		max: 3,
		step: 0.05,
	},
	{
		type: "number",
		key: "trailAlpha",
		label: "Fade",
		min: 1,
		max: 80,
		step: 1,
	},
	{
		type: "number",
		key: "strokeAlpha",
		label: "Line Alpha",
		min: 10,
		max: 255,
		step: 1,
	},
] as const satisfies readonly SketchParameter[];

type Params = InferParams<typeof parameters>;

interface Particle {
	x: number;
	y: number;
	age: number;
	ttl: number;
}

export default defineSketch({
	id: "flow-field-particles",
	title: "Flow Field Particles",
	description: "Particle trails following a noise-driven vector field.",
	date: "2026-04-26",
	parameters,
	create({ p, theme = "light", params }: SketchContext<Params>) {
		const isDark = theme === "dark";
		const backgroundColor: [number, number, number] = isDark
			? [11, 13, 14]
			: [248, 250, 252];
		const strokeBase: [number, number, number] = isDark
			? [220, 227, 231]
			: [15, 23, 42];
		let particles: Particle[] = [];

		function spawnParticle(): Particle {
			const ttlMin = Math.max(
				1,
				Math.floor(Math.min(params.ttlMin, params.ttlMax)),
			);
			const ttlMax = Math.max(
				ttlMin + 1,
				Math.floor(Math.max(params.ttlMin, params.ttlMax)),
			);
			return {
				x: p.random(p.width),
				y: p.random(p.height),
				age: 0,
				ttl: p.random(ttlMin, ttlMax),
			};
		}

		function resetParticles(): void {
			const count = Math.max(1, Math.floor(params.particleCount));
			particles = Array.from({ length: count }, spawnParticle);
		}

		attachResponsiveCanvas(p, {
			onSetup: () => {
				p.background(...backgroundColor);
				p.strokeWeight(params.strokeWeight);
				resetParticles();
			},
			onResize: () => {
				p.background(...backgroundColor);
				p.strokeWeight(params.strokeWeight);
				resetParticles();
			},
		});

		p.draw = () => {
			p.fill(
				backgroundColor[0],
				backgroundColor[1],
				backgroundColor[2],
				params.trailAlpha,
			);
			p.noStroke();
			p.rect(0, 0, p.width, p.height);

			for (const part of particles) {
				const angle =
					p.noise(
						part.x * params.noiseScale,
						part.y * params.noiseScale,
						p.frameCount * 0.002,
					) *
					p.TWO_PI *
					1.8;
				const vx = Math.cos(angle) * params.stepSize;
				const vy = Math.sin(angle) * params.stepSize;

				p.stroke(
					strokeBase[0],
					strokeBase[1],
					strokeBase[2],
					params.strokeAlpha,
				);
				p.strokeWeight(params.strokeWeight);
				p.line(part.x, part.y, part.x + vx, part.y + vy);

				part.x += vx;
				part.y += vy;
				part.age += 1;

				const out =
					part.x < 0 || part.x > p.width || part.y < 0 || part.y > p.height;
				if (out || part.age > part.ttl) {
					Object.assign(part, spawnParticle());
				}
			}
		};
	},
});
