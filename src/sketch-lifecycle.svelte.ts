import p5 from "p5";
import { getParamsForSketch } from "./sketch-params.svelte.js";
import {
	type GlobalParams,
	globalDefaults,
	globalParameters,
} from "./sketches/global-parameters.js";
import { getSketchById } from "./sketches/index.js";
import type {
	SketchAnimationController,
	SketchModuleWithDefaults,
	Theme,
} from "./types/sketch.js";
import { createAnimationController } from "./utils/animation-controller.js";
import { getSeedFromUrl } from "./utils/seed.js";
import { createRng } from "./utils/seeded-random.js";

declare global {
	interface Window {
		__CREATE_TEST_CTRL__?: () => SketchAnimationController;
	}
}

export const lifecycle = $state({
	currentP5: null as p5 | null,
	currentController: null as SketchAnimationController | null,
	currentSketchModule: null as SketchModuleWithDefaults<
		Record<string, unknown>
	> | null,
	currentParams: null as Record<string, unknown> | null,
});

export function unmountSketch(): void {
	if (lifecycle.currentController) {
		lifecycle.currentController.destroy();
		lifecycle.currentController = null;
	}
	if (lifecycle.currentP5) {
		lifecycle.currentP5.remove();
		lifecycle.currentP5 = null;
	}
	lifecycle.currentSketchModule = null;
	lifecycle.currentParams = null;
}

export function mountSketch(
	sketchId: string,
	theme: Theme,
	options?: { redrawControls?: boolean },
): void {
	const { redrawControls = true } = options ?? {};
	const sketch = getSketchById(sketchId);
	if (!sketch) return;

	const allParams = getParamsForSketch(sketchId);

	const globalParams: Record<string, unknown> = {};
	for (const param of globalParameters) {
		globalParams[param.key] =
			allParams[param.key] ??
			globalDefaults[param.key as keyof typeof globalDefaults];
	}

	const sketchParams: Record<string, unknown> = {};
	for (const param of sketch.parameters) {
		sketchParams[param.key] = allParams[param.key];
	}

	unmountSketch();

	lifecycle.currentSketchModule = sketch;
	lifecycle.currentParams = allParams;

	const container = document.getElementById("canvas-container");
	if (!container) return;

	const seed = getSeedFromUrl();
	const rng = seed !== undefined ? createRng(seed) : () => Math.random();
	const testCtrl = window.__CREATE_TEST_CTRL__;
	const isTest = !!testCtrl;
	const controller =
		isTest && testCtrl ? testCtrl() : createAnimationController();

	if (!isTest) {
		lifecycle.currentController = controller;
	}

	lifecycle.currentP5 = new p5((p) => {
		if (!isTest) {
			controller.attachToP5(p);
		}
		sketch.create({
			p,
			theme,
			params: sketchParams,
			global: globalParams as GlobalParams,
			rng,
			animation: controller,
		});
	}, container);
	document.title = sketch.title;

	if (
		redrawControls &&
		lifecycle.currentSketchModule &&
		lifecycle.currentParams
	) {
		lifecycle.currentParams = { ...lifecycle.currentParams };
	}
}

export function regenerate(sketchId: string, theme: Theme): void {
	mountSketch(sketchId, theme);
}

export function savePNG(sketchId: string | null): void {
	if (lifecycle.currentP5) {
		const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
		lifecycle.currentP5.saveCanvas(`sketch-${sketchId}-${stamp}`, "png");
	}
}
