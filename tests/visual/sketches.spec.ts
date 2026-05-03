import { expect, test } from "@playwright/test";
import { captureCanvas, gotoSketch, waitForRender } from "./utils";

// Global seed for all visual tests — ensures consistency
const VISUAL_TEST_SEED = 42;

// Sketch IDs — keep in sync with src/sketches/index.ts auto-discovery
// TODO: Implement dynamic sketch discovery (Playwright limitation with beforeAll + for loop)
const sketchIds = [
	"stereogram",
	"l-system-plant",
	"cellular-automata",
	"mona-lisa-circles",
	"grid-variations",
	"changing-circle-line",
	"flow-field-particles",
	"fractal-tree",
];

test.describe("Sketch Visual Regression", () => {
	// Run a test for each sketch
	for (const sketchId of sketchIds) {
		test(`sketch "${sketchId}" renders correctly`, async ({ page }) => {
			// Navigate to the sketch with fixed seed
			await gotoSketch(page, sketchId, VISUAL_TEST_SEED);

			// Wait for rendering to complete (handles animated vs static)
			await waitForRender(page, sketchId);

			// Capture canvas screenshot
			const screenshot = await captureCanvas(page);

			// Compare against stored snapshot
			expect(screenshot).toMatchSnapshot(`${sketchId}-render.png`);
		});
	}

	// Test with different seed produces different output
	test("different seeds produce different output", async ({ page }) => {
		await gotoSketch(page, "grid-variations", 42);
		await waitForRender(page, "grid-variations");
		const screenshot42 = await captureCanvas(page);

		await gotoSketch(page, "grid-variations", 99);
		await waitForRender(page, "grid-variations");
		const screenshot99 = await captureCanvas(page);

		// Should be different (unless extremely unlucky with hash collision)
		expect(screenshot42.equals(screenshot99)).toBe(false);
	});

	// Test theme switching doesn't break rendering
	test("sketch renders correctly in dark mode", async ({ page }) => {
		await gotoSketch(page, "grid-variations", VISUAL_TEST_SEED);
		// Toggle dark mode via UI
		await page.click("#theme-toggle");
		await waitForRender(page, "grid-variations");

		const screenshot = await captureCanvas(page);
		expect(screenshot).toMatchSnapshot(`grid-variations-dark-render.png`);
	});
});

test.describe("Image Mocking", () => {
	// Mock the Mona Lisa image for tests
	test.beforeEach(async ({ page }) => {
		await page.route("**/mona-lisa.jpg", async (route) => {
			await route.fulfill({
				path: "tests/visual/fixtures/mona-lisa.jpg",
			});
		});
	});

	test("mona-lisa-circles loads mocked image", async ({ page }) => {
		await gotoSketch(page, "mona-lisa-circles", VISUAL_TEST_SEED);
		await waitForRender(page, "mona-lisa-circles");
		const screenshot = await captureCanvas(page);
		expect(screenshot).toMatchSnapshot("mona-lisa-circles-render.png");
	});
});

test("canvas has consistent dimensions", async ({ page }) => {
	await gotoSketch(page, "grid-variations", 42);
	await waitForRender(page, "grid-variations");

	const canvasSize = await page.evaluate(() => {
		const canvas = document.querySelector("canvas");
		if (!canvas) return { width: 0, height: 0 };
		return { width: canvas.width, height: canvas.height };
	});

	// Canvas should have reasonable dimensions (not 0 or extremely small)
	expect(canvasSize.width).toBeGreaterThan(100);
	expect(canvasSize.height).toBeGreaterThan(100);
});
