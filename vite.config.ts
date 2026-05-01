import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";
import { createSaveDefaultsHandler } from "./src/vite/endpoint-utils.js";

export default defineConfig({
	plugins: [
		svelte(),
		{
			name: "save-sketch-defaults",
			configureServer(server) {
				server.middlewares.use(
					"/__sketch-defaults",
					createSaveDefaultsHandler(),
				);
			},
			configurePreviewServer(server) {
				server.middlewares.use(
					"/__sketch-defaults",
					createSaveDefaultsHandler(),
				);
			},
		},
	],
});
