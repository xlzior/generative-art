import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: "./tests/visual",
	snapshotDir: "./tests/visual/__snapshots__",
	timeout: 30_000,
	expect: {
		toMatchSnapshot: {
			// 1% pixel difference threshold — allows minor anti-aliasing variance
			maxDiffPixels: 1000,
		},
	},
	use: {
		// Fixed viewport ensures consistent canvas sizing
		viewport: { width: 800, height: 600 },
		// Disable animations that could cause flakiness
		actionTimeout: 10_000,
		// Base URL for tests
		baseURL: "http://localhost:5173",
	},
	projects: [
		{
			name: "chromium",
			use: {
				browserName: "chromium",
				// Headless for CI; can override with `npx playwright test --headed`
				headless: true,
			},
		},
	],
	// Only run on Chromium for consistent pixel output
	fullyParallel: true,
	// Auto-start Vite dev server before tests
	webServer: {
		command: "pnpm dev",
		url: "http://localhost:5173",
		reuseExistingServer: true,
		timeout: 60_000,
	},
});
