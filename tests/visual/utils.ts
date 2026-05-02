import type { Page } from "@playwright/test";

/**
 * Navigate to a sketch with a specific seed.
 */
export async function gotoSketch(
	page: Page,
	sketchId: string,
	seed = 42,
): Promise<void> {
	await page.goto(`/?sketch=${sketchId}&seed=${seed}`, {
		waitUntil: "load",
	});
	await page.waitForSelector("canvas", { state: "visible" });
}

/**
 * Wait for sketch rendering to complete.
 * Uses generous fixed timeouts based on sketch type.
 */
export async function waitForRender(
	page: Page,
	sketchId: string,
): Promise<void> {
	const animatedSketches = ["flow-field-particles", "cellular-automata"];

	if (animatedSketches.includes(sketchId)) {
		// Animated sketches: wait for first frame to render
		await page.waitForTimeout(2000);
	} else if (sketchId === "mona-lisa-circles") {
		// Wait for image to load
		await page
			.waitForFunction(() => {
				const img = document.querySelector(
					"img[data-mona-lisa]",
				) as HTMLImageElement;
				return img?.complete ?? false;
			})
			.catch(() => {});
		await page.waitForTimeout(1000);
	} else {
		// Static sketches: wait for paint
		await page.waitForTimeout(1000);
	}
}

/**
 * Capture canvas screenshot.
 */
export async function captureCanvas(page: Page): Promise<Buffer> {
	const canvas = page.locator("canvas").first();
	return await canvas.screenshot({ type: "png" });
}
