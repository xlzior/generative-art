import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [svelte({ runes: true })],
	test: {
		include: ["src/**/*.{test,spec}.ts"],
		exclude: ["node_modules", "dist", "tests/visual", "tests/component"],
		tsconfig: "./tsconfig.json",
	},
});
