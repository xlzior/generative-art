import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Page } from "@playwright/test";

const sketchesDir = resolve(process.cwd(), "src/sketches");

/**
 * Discover all sketch IDs by reading the filesystem.
 * Filters to only directories containing a sketch.ts file.
 */
export function discoverSketchIds(): string[] {
	return readdirSync(sketchesDir)
		.filter((entry) => existsSync(join(sketchesDir, entry, "sketch.ts")))
		.sort();
}

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
			speed: 1,
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
 * Tries the animated path first (probes for __TEST_FRAME_CB__), falls back
 * to a static wait if no animation callback is registered.
 */
export async function waitForRender(page: Page): Promise<void> {
	// Try animated path first — the test injects __CREATE_TEST_CTRL__ which
	// animated sketches use to register __TEST_FRAME_CB__
	try {
		await page.waitForFunction(() => window.__TEST_FRAME_CB__ !== undefined, {
			timeout: 3000,
		});
		// Call the frame callback exactly once (frameCount starts at 0, matching p5)
		await page.evaluate(() => {
			if (window.__TEST_FRAME_CB__) {
				window.__TEST_FRAME_CB__(0);
			}
		});
		// Wait for the canvas to finish painting
		await page.waitForTimeout(500);
		return;
	} catch {
		// Not animated — fall through to static wait
	}

	// Static sketches: wait for paint (also covers image loading)
	await page.waitForTimeout(1000);
}

/**
 * Capture canvas screenshot.
 */
export async function captureCanvas(page: Page): Promise<Buffer> {
	const canvas = page.locator("canvas").first();
	return (await canvas.screenshot({ type: "png" })) as Promise<Buffer>;
}
