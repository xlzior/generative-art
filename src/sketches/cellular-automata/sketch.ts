import type {
	InferParams,
	SketchContext,
	SketchParameter,
} from "../../types/sketch.js";
import { defineSketch } from "../../utils/defineSketch.js";
import { attachResponsiveCanvas } from "../../utils/responsive-canvas.js";
import { rngRandom } from "../../utils/seeded-random.js";

const parameters = [
	{
		type: "number",
		key: "cellSize",
		label: "Cell Size",
		min: 3,
		max: 20,
		step: 1,
	},
	{
		type: "number",
		key: "seedProbability",
		label: "Seed",
		min: 0.05,
		max: 0.9,
		step: 0.01,
	},
	{
		type: "number",
		key: "frameRate",
		label: "Frame Rate",
		min: 2,
		max: 30,
		step: 1,
	},
	{
		type: "number",
		key: "reseedFrames",
		label: "Reseed Frames",
		min: 60,
		max: 1200,
		step: 1,
	},
	{
		type: "number",
		key: "cellPadding",
		label: "Cell Gap",
		min: 0,
		max: 4,
		step: 1,
	},
] as const satisfies readonly SketchParameter[];

type Params = InferParams<typeof parameters>;

interface Board {
	[y: number]: number[];
}

export default defineSketch({
	id: "cellular-automata",
	title: "Cellular Automata",
	description: "A Game of Life variant with periodic reseeding.",
	date: "2026-04-26",
	parameters,
	create({ p, theme = "light", params, rng }: SketchContext<Params>) {
		const isDark = theme === "dark";
		const backgroundColor: [number, number, number] = isDark
			? [9, 9, 11]
			: [248, 250, 252];
		const cellColor: [number, number, number] = isDark
			? [110, 231, 183]
			: [5, 150, 105];
		let cols: number;
		let rows: number;
		let board: Board;

		function randomBoard(): Board {
			return Object.fromEntries(
				Array.from({ length: rows }, (_, y) => [
					y,
					Array.from({ length: cols }, () =>
						rngRandom(rng, 0, 1) < params.seedProbability ? 1 : 0,
					),
				]),
			);
		}

		function resetBoard(): void {
			const cellSize = Math.max(1, Math.floor(params.cellSize));
			cols = Math.max(1, Math.floor(p.width / cellSize));
			rows = Math.max(1, Math.floor(p.height / cellSize));
			board = randomBoard();
			p.frameRate(Math.max(1, Math.floor(params.frameRate)));
		}

		function countNeighbors(x: number, y: number): number {
			let total = 0;
			for (let yy = -1; yy <= 1; yy += 1) {
				for (let xx = -1; xx <= 1; xx += 1) {
					if (xx === 0 && yy === 0) {
						continue;
					}
					const col = (x + xx + cols) % cols;
					const row = (y + yy + rows) % rows;
					total += board[row][col];
				}
			}
			return total;
		}

		attachResponsiveCanvas(p, {
			onSetup: () => {
				p.noStroke();
				resetBoard();
			},
			onResize: () => {
				resetBoard();
			},
		});

		p.draw = () => {
			// Dispatch event after first frame for visual tests
			if (p.frameCount === 1) {
				window.dispatchEvent(new CustomEvent("sketch-rendered"));
			}

			p.background(...backgroundColor);

			const cellSize = Math.max(1, Math.floor(params.cellSize));
			const cellInset = Math.max(0, Math.floor(params.cellPadding));
			const drawSize = Math.max(1, cellSize - cellInset);

			for (let y = 0; y < rows; y += 1) {
				for (let x = 0; x < cols; x += 1) {
					if (board[y][x] === 1) {
						p.fill(...cellColor);
						p.rect(x * cellSize, y * cellSize, drawSize, drawSize);
					}
				}
			}

			const next = Object.fromEntries(
				Object.entries(board).map(([k, row]) => [k, [...row]]),
			) as Board;
			for (let y = 0; y < rows; y += 1) {
				for (let x = 0; x < cols; x += 1) {
					const state = board[y][x];
					const n = countNeighbors(x, y);

					if (state === 1 && (n < 2 || n > 3)) {
						next[y][x] = 0;
					} else if (state === 0 && n === 3) {
						next[y][x] = 1;
					}
				}
			}

			board = next;

			if (p.frameCount % Math.max(1, Math.floor(params.reseedFrames)) === 0) {
				board = randomBoard();
			}
		};
	},
});
