import type p5 from "p5";
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
		key: "totalCircles",
		label: "Total Circles",
		min: 100,
		max: 10000,
		step: 10,
	},
	{
		type: "number",
		key: "radiusMin",
		label: "Min Radius",
		min: 2,
		max: 50,
		step: 1,
	},
	{
		type: "number",
		key: "radiusMax",
		label: "Max Radius",
		min: 5,
		max: 200,
		step: 5,
	},
	{
		type: "number",
		key: "opacity",
		label: "Opacity",
		min: 0,
		max: 255,
		step: 5,
	},
] as const satisfies readonly SketchParameter[];

type Params = InferParams<typeof parameters>;

export default defineSketch({
	id: "mona-lisa-circles",
	title: "Mona Lisa Circles",
	description:
		"Random circles colored by the Mona Lisa painting at their coordinates.",
	date: "2026-04-27",
	parameters,
	create({ p, theme = "light", params }: SketchContext<Params>) {
		const isDark = theme === "dark";
		const backgroundColor: [number, number, number] = isDark
			? [11, 13, 14]
			: [248, 250, 252];

		let monaLisaImage: p5.Image | null = null;
		let isImageLoaded = false;

		// Mona Lisa image URL (public domain)
		const MONA_LISA_URL =
			"https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/960px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg";

		function drawCircles() {
			if (!isImageLoaded || !monaLisaImage) {
				return;
			}

			const canvasWidth = p.width;
			const canvasHeight = p.height;

			p.background(...backgroundColor);

			// Load pixels once, outside the loop
			monaLisaImage.loadPixels();

			// Calculate aspect-ratio-preserving dimensions
			const imageAspectRatio = monaLisaImage.width / monaLisaImage.height;
			const canvasAspectRatio = canvasWidth / canvasHeight;

			let scaledWidth: number;
			let scaledHeight: number;
			let offsetX = 0;
			let offsetY = 0;

			if (imageAspectRatio > canvasAspectRatio) {
				// Image is wider - fit to width
				scaledWidth = canvasWidth;
				scaledHeight = canvasWidth / imageAspectRatio;
				offsetY = (canvasHeight - scaledHeight) / 2;
			} else {
				// Image is taller - fit to height
				scaledHeight = canvasHeight;
				scaledWidth = canvasHeight * imageAspectRatio;
				offsetX = (canvasWidth - scaledWidth) / 2;
			}

			for (let i = 0; i < params.totalCircles; i++) {
				// Pick random point on canvas
				const x = p.random(canvasWidth);
				const y = p.random(canvasHeight);

				// Map canvas coordinates to image coordinates while maintaining aspect ratio
				let imgX = Math.floor(
					((x - offsetX) / scaledWidth) * monaLisaImage.width,
				);
				let imgY = Math.floor(
					((y - offsetY) / scaledHeight) * monaLisaImage.height,
				);

				// Clamp to image bounds
				imgX = Math.max(0, Math.min(monaLisaImage.width - 1, imgX));
				imgY = Math.max(0, Math.min(monaLisaImage.height - 1, imgY));

				// Get color at that point in the image
				const pixelIndex = (imgY * monaLisaImage.width + imgX) * 4;
				const r = monaLisaImage.pixels[pixelIndex];
				const g = monaLisaImage.pixels[pixelIndex + 1];
				const b = monaLisaImage.pixels[pixelIndex + 2];

				// Random radius
				const radius = p.random(params.radiusMin, params.radiusMax);

				// Draw circle with color from image
				p.fill(r, g, b, params.opacity);
				p.noStroke();
				p.circle(x, y, radius * 2);
			}
		}

		p.preload = () => {
			p.loadImage(MONA_LISA_URL, (img: p5.Image) => {
				monaLisaImage = img;
				isImageLoaded = true;
			});
		};

		attachResponsiveCanvas(p, {
			onSetup: () => {
				p.noLoop();
				drawCircles();
			},
			onResize: () => {
				drawCircles();
			},
		});

		p.draw = () => {
			// Static draw - controlled by setup/resize
		};
	},
});
