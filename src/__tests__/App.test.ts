import { beforeEach, vi } from "vitest";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/svelte";
import App from "../App.svelte";
import type { SketchModuleWithDefaults } from "../types/sketch.js";

// Mock window.matchMedia
beforeEach(() => {
	Object.defineProperty(window, "matchMedia", {
		value: vi.fn().mockImplementation((query) => ({
			matches: false,
			media: query,
			onchange: null,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		})),
		writable: true,
	});
});

// Mock sketches index to prevent loading real sketches
vi.mock("../sketches/index.js", () => ({
	sketches: [
		{
			id: "test-sketch",
			title: "Test Sketch",
			date: "2026-01-01",
			description: "Test",
			parameters: [],
			defaults: {},
			defaultsFile: "test-sketch/defaults.json",
			filePath: "./test-sketch/sketch.ts",
			create: vi.fn(),
		} as unknown as SketchModuleWithDefaults<Record<string, unknown>>,
	],
}));

// Mock p5 module
vi.mock("p5", () => {
	class MockP5 {
		setup: (() => void) | null = null;
		draw: (() => void) | null = null;
		noLoop = vi.fn();
		createCanvas = vi.fn();
		resizeCanvas = vi.fn();
		remove = vi.fn();
		saveCanvas = vi.fn();

		constructor(sketchFn: (p: MockP5) => void) {
			if (sketchFn) {
				sketchFn(this);
			}
		}
	}

	return { default: MockP5 };
});

// Mock seed functions
vi.mock("../utils/seed.js", () => ({
	getSeedFromUrl: vi.fn().mockReturnValue(42),
	setSeedInUrl: vi.fn(),
}));

// Mock seeded-random
vi.mock("../utils/seeded-random.js", () => ({
	createRng: vi.fn().mockReturnValue(Math.random),
}));

// Mock animation controller
vi.mock("../utils/animation-controller.js", () => ({
	createAnimationController: vi.fn().mockReturnValue({
		onFrame: vi.fn(),
		stop: vi.fn(),
		destroy: vi.fn(),
		attachToP5: vi.fn(),
	}),
}));

describe("App.svelte", () => {
	beforeEach(() => {
		// Set URL with sketch param so App renders SketchView
		window.history.pushState({}, "", "/?sketch=test-sketch");
	});

	it("renders sketch selector", () => {
		render(App);
		expect(screen.getByRole("combobox")).toBeInTheDocument();
	});

	it("renders canvas container", () => {
		render(App);
		expect(document.getElementById("canvas-container")).toBeInTheDocument();
	});

	it("renders regenerate button", () => {
		render(App);
		expect(screen.getByText(/regenerate/i)).toBeInTheDocument();
	});

	it("renders save PNG button", () => {
		render(App);
		expect(screen.getByText(/save png/i)).toBeInTheDocument();
	});

	it("renders back to gallery button", () => {
		render(App);
		expect(screen.getByText(/back to gallery/i)).toBeInTheDocument();
	});
});
