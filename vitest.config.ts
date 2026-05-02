import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [svelte()],
	resolve: {
		conditions: ["svelte", "browser", "module", "import", "default"],
	},
	test: {
		include: ["src/**/*.{test,spec}.ts"],
		exclude: ["node_modules", "dist", "tests/visual", "tests/component"],
		tsconfig: "./tsconfig.json",
		globals: true,
		environment: "jsdom",
		environmentMatchGlobs: [
			["src/components/**/__tests__/**", "jsdom"],
			["src/**/__tests__/**", "node"],
		],
	},
});
