import type { Page } from "@playwright/test";

/**
 * Navigate to a sketch with a specific seed.
 */
export async function gotoSketch(
	page: Page,
	sketchId: string,
	seed = 42,
): Promise<void> {
	// Inject a test-friendly animation controller factory before the app loads
	// The controller stores the callback without calling it immediately
	await page.addInitScript(() => {
		window.__CREATE_TEST_CTRL__ = () => ({
			onFrame: (cb: (frameCount: number) => void) => {
				// Store callback for later invocation by waitForRender
				window.__TEST_FRAME_CB__ = cb;
			},
			stop: () => {},
		});
	});

	await page.goto(`/?sketch=${sketchId}&seed=${seed}`, {
		waitUntil: "load",
	});
	// Wait for canvas to be created by p5's setup()
	// Use longer timeout for sketches that preload images (e.g., mona-lisa-circles)
	await page.waitForSelector("canvas", { state: "visible", timeout: 30000 });
}

/**
 * Wait for sketch rendering to complete.
 * For animated sketches, calls the stored frame callback exactly once.
 */
export async function waitForRender(
	page: Page,
	sketchId: string,
): Promise<void> {
	const animatedSketches = ["flow-field-particles", "cellular-automata"];

	if (animatedSketches.includes(sketchId)) {
		// Wait for frame callback to be registered by the sketch
		await page.waitForFunction(() => window.__TEST_FRAME_CB__ !== undefined, {
			timeout: 5000,
		});

		// Call the frame callback exactly once (frameCount starts at 0, matching p5)
		await page.evaluate(() => {
			if (window.__TEST_FRAME_CB__) {
				window.__TEST_FRAME_CB__(0);
			}
		});

		// Wait for the canvas to finish painting
		await page.waitForTimeout(500);
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
 * Capture canvas screenshot;
 */
export async function captureCanvas(page: Page): Promise<Buffer> {
	const canvas = page.locator("canvas").first();
	return (await canvas.screenshot({ type: "png" })) as Promise<Buffer>;
}

/**
 * Get all sketch IDs from the application.
 */
export async function getAllSketchIds(page: Page): Promise<string[]> {
	await page.goto("/", { waitUntil: "load" });
	await page.waitForSelector("#sketch-select", { state: "visible" });

	const sketchIds = await page.$$eval("#sketch-select option", (elements) => {
		return elements
			.map((el) => el.getAttribute("value"))
			.filter((id): id is string => id !== null && id !== "");
	});

	if (sketchIds.length === 0) {
		throw new Error("No sketch IDs found on page.");
	}

	return sketchIds;
}
