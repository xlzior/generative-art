import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type {
	SketchModuleWithDefaults,
	SketchParameter,
} from "../../types/sketch.js";
import ParameterControls from "../ParameterControls.svelte";

type AnySketch = SketchModuleWithDefaults<Record<string, unknown>>;

function createMockSketch(parameters: SketchParameter[]) {
	const defaults: Record<string, unknown> = {};
	for (const p of parameters) {
		if (p.type === "number") defaults[p.key] = 50;
		else if (p.type === "string") defaults[p.key] = "hello";
		else if (p.type === "boolean") defaults[p.key] = true;
		else if (p.type === "select") defaults[p.key] = p.options[0].value;
		else if (p.type === "dimensions")
			defaults[p.key] = { width: null, height: null };
	}
	return {
		id: "test-sketch",
		title: "Test",
		date: "2026-01-01",
		description: "Test",
		parameters,
		defaults,
		filePath: "",
	} as unknown as AnySketch;
}

const numberParam: SketchParameter = {
	key: "size",
	label: "Size",
	type: "number",
	min: 0,
	max: 100,
	step: 1,
};

describe("ParameterControls", () => {
	it("renders all parameter types via child components", () => {
		const stringParam: SketchParameter = {
			key: "label",
			label: "Label",
			type: "string",
		};
		const sketch = createMockSketch([numberParam, stringParam]);
		render(ParameterControls, {
			props: {
				sketch,
				params: { size: 50, label: "hello" },
				onchange: vi.fn(),
				theme: "dark",
			},
		});

		expect(screen.getByText("Size")).toBeInTheDocument();
		expect(screen.getByText("Label")).toBeInTheDocument();
	});

	it("passes onchange bound to correct parameter key", async () => {
		const onchange = vi.fn();
		const sketch = createMockSketch([numberParam]);
		render(ParameterControls, {
			props: {
				sketch,
				params: { size: 50 },
				onchange,
				theme: "dark",
			},
		});

		const slider = screen.getByRole("slider", { name: /size/i });
		await fireEvent.input(slider, { target: { value: "75" } });
		expect(onchange).toHaveBeenCalledWith("size", 75);
	});

	it("passes theme to child components", () => {
		const sketch = createMockSketch([numberParam]);
		render(ParameterControls, {
			props: {
				sketch,
				params: { size: 50 },
				onchange: vi.fn(),
				theme: "light",
			},
		});

		const container = document.querySelector("#params-list");
		const control = container?.querySelector(".number-control");
		expect(control).toHaveAttribute("data-theme", "light");
	});
});
