import type { Page } from "@playwright/test";

/**
 * Navigate to a sketch with a specific seed.
 * Ensures the page is loaded and canvas is available.
 */
export async function gotoSketch(
	page: Page,
	sketchId: string,
	seed = 42,
): Promise<void> {
	await page.goto(`/?sketch=${sketchId}&seed=${seed}`, {
		waitUntil: "load",
	});
	// Wait for canvas element to exist (SPA may render after load)
	await page.waitForSelector("canvas", { state: "visible" });
}

/**
 * Wait for sketch rendering to complete.
 * Handles both static (noLoop) and animated sketches.
 * Relies on sketches dispatching a 'sketch-rendered' event after first frame.
 */
export async function waitForRender(
	page: Page,
	sketchId: string,
): Promise<void> {
	try {
		// Wait for custom event (all sketches should fire this after first frame)
		await page.waitForEvent("sketch-rendered" as any, { timeout: 3000 });
		// Brief wait for paint to flush
		await page.waitForTimeout(100);
	} catch {
		// Event didn't fire - use appropriate fallback
		if (sketchId === "mona-lisa-circles") {
			// Wait for image to load
			await page
				.waitForFunction(() => {
					const img = document.querySelector(
						"img[data-mona-lisa]",
					) as HTMLImageElement;
					return img?.complete ?? false;
				})
				.catch(() => {});
			await page.waitForTimeout(500);
		} else {
			// Static sketches or fallback: brief wait
			await page.waitForTimeout(500);
		}
	}
}

/**
 * Capture canvas snapshot, excluding UI elements.
 * Returns buffer of PNG screenshot.
 */
export async function captureCanvas(page: Page): Promise<Buffer> {
	// Screenshot just the canvas element
	const canvas = page.locator("canvas").first();
	const screenshot = await canvas.screenshot({ type: "png" });
	return screenshot;
}

/**
 * Get all sketch IDs from the application by parsing the sketch selector on the page.
 * This matches the auto-discovery in src/sketches/index.ts and automatically
 * picks up new sketches without manual updates.
 */
export async function getAllSketchIds(page: Page): Promise<string[]> {
	// Navigate to home page and extract sketch IDs from the selector
	await page.goto("/", { waitUntil: "load" });
	await page.waitForSelector("#sketch-select", { state: "visible" });

	// Extract all sketch IDs from option values
	const sketchIds = await page.$$eval("#sketch-select option", (elements) => {
		return elements
			.map((el) => el.getAttribute("value"))
			.filter((id): id is string => id !== null && id !== "");
	});

	if (sketchIds.length === 0) {
		throw new Error(
			"No sketch IDs found on page. Check sketch selector selector.",
		);
	}

	return sketchIds;
}
