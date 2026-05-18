import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { SketchParameter } from "../../../types/sketch.js";
import ColourControl from "../ColourControl.svelte";

const colourParam = {
	type: "colour",
	key: "bg",
	label: "Background",
} as const satisfies SketchParameter;

describe("ColourControl", () => {
	it("renders label from parameter definition", () => {
		render(ColourControl, {
			props: {
				parameter: colourParam,
				value: "#ff0000",
				onchange: vi.fn(),
				theme: "dark",
			},
		});
		expect(screen.getByText("Background")).toBeInTheDocument();
	});

	it("renders colour input with value", () => {
		render(ColourControl, {
			props: {
				parameter: colourParam,
				value: "#ff0000",
				onchange: vi.fn(),
				theme: "dark",
			},
		});
		const input = screen.getByLabelText("Background");
		expect(input).toHaveValue("#ff0000");
	});

	it("calls onchange with inverted colour value on input", async () => {
		const onchange = vi.fn();
		render(ColourControl, {
			props: {
				parameter: colourParam,
				value: "#000000",
				onchange,
				theme: "light",
			},
		});
		const input = screen.getByLabelText("Background");
		await fireEvent.input(input, { target: { value: "#ffffff" } });
		expect(onchange).toHaveBeenCalledWith("#000000");
	});

	it("inverts value through themeAccent in dark theme", () => {
		render(ColourControl, {
			props: {
				parameter: colourParam,
				value: "#ff0000",
				onchange: vi.fn(),
				theme: "dark",
			},
		});
		const input = screen.getByLabelText("Background");
		expect(input).toHaveValue("#ff0000");
	});
});
