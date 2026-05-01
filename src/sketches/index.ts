import type { SketchModuleWithDefaults } from "../types/sketch.js";
import {
	checkDuplicateIds,
	sortSketches,
	validateSketchModule,
} from "./validation.js";

const sketchEntries = Object.entries(
	import.meta.glob<{
		default: SketchModuleWithDefaults<Record<string, unknown>>;
	}>("./*/sketch.ts", { eager: true }),
);

const defaultsByFolder = Object.fromEntries(
	Object.entries(
		import.meta.glob<Record<string, unknown>>("./*/defaults.json", {
			eager: true,
			import: "default",
		}),
	)
		.map(([path, defaults]) => {
			const match = path.match(/^\.\/([^/]+)\/defaults\.json$/);
			if (!match) {
				return null;
			}
			return [match[1], defaults];
		})
		.filter(
			(entry): entry is [string, Record<string, unknown>] => entry !== null,
		),
);

const sketchModules = sketchEntries.map(([path, module]) => {
	if (!module || typeof module.default !== "object") {
		throw new TypeError(
			`Sketch module at ${path} must export a default sketch object.`,
		);
	}

	const folderMatch = path.match(/^\.\/([^/]+)\/sketch\.ts$/);
	if (!folderMatch) {
		throw new TypeError(`Sketch module path has invalid shape: ${path}`);
	}

	const folder = folderMatch[1];
	const defaults = defaultsByFolder[folder];
	if (!defaults || typeof defaults !== "object") {
		throw new TypeError(`Missing defaults.json for sketch folder: ${folder}`);
	}

	const sketch = module.default;
	validateSketchModule(sketch, defaults);

	return {
		...sketch,
		defaults,
		defaultsFile: `${folder}/defaults.json`,
		filePath: path,
	};
});

checkDuplicateIds(sketchModules);

export const sketches: SketchModuleWithDefaults<Record<string, unknown>>[] =
	sortSketches(sketchModules);
