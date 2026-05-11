import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/svelte";
import type { SketchModuleWithDefaults } from "../../types/sketch.js";
import SketchSelector from "../SketchSelector.svelte";

type AnySketch = SketchModuleWithDefaults<Record<string, unknown>>;

const mockSketches: AnySketch[] = [
	{
		id: "sketch-b",
		title: "Beta Sketch",
		date: "2026-02-01",
		description: "Beta",
		parameters: [],
		defaults: {},

		filePath: "",
	} as unknown as AnySketch,
	{
		id: "sketch-a",
		title: "Alpha Sketch",
		date: "2026-01-01",
		description: "Alpha",
		parameters: [],
		defaults: {},

		filePath: "",
	} as unknown as AnySketch,
];

describe("SketchSelector", () => {
	let selectedId: string | null = null;
	function handleChange(id: string) {
		selectedId = id;
	}

	beforeEach(() => {
		selectedId = null;
	});

	it("renders an option for each sketch", () => {
		render(SketchSelector, {
			props: {
				sketches: mockSketches,
				currentSketch: "sketch-a",
				onchange: handleChange,
			},
		});

		expect(
			screen.getByRole("option", { name: /beta sketch/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("option", { name: /alpha sketch/i }),
		).toBeInTheDocument();
	});

	it("displays date and title in option text", () => {
		render(SketchSelector, {
			props: {
				sketches: mockSketches,
				currentSketch: "sketch-a",
				onchange: handleChange,
			},
		});

		expect(screen.getByText("2026-02-01 - Beta Sketch")).toBeInTheDocument();
		expect(screen.getByText("2026-01-01 - Alpha Sketch")).toBeInTheDocument();
	});

	it("sets currentSketch as selected value", () => {
		render(SketchSelector, {
			props: {
				sketches: mockSketches,
				currentSketch: "sketch-b",
				onchange: handleChange,
			},
		});

		const select = screen.getByRole("combobox");
		expect(select).toHaveValue("sketch-b");
	});

	it("calls onchange with sketch id when selection changes", async () => {
		render(SketchSelector, {
			props: {
				sketches: mockSketches,
				currentSketch: "sketch-a",
				onchange: handleChange,
			},
		});

		const select = screen.getByRole("combobox");
		await fireEvent.change(select, { target: { value: "sketch-b" } });

		expect(selectedId).toBe("sketch-b");
	});
});
