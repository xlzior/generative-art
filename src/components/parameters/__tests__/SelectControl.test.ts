import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { SketchParameter } from "../../../types/sketch.js";
import SelectControl from "../SelectControl.svelte";

const selectParam = {
	type: "select",
	key: "viewMode",
	label: "View Mode",
	options: [
		{ label: "Parallel View", value: "parallel" },
		{ label: "Depth Map", value: "depth" },
	] as const,
} as const satisfies SketchParameter;

describe("SelectControl", () => {
	it("renders label from parameter definition", () => {
		render(SelectControl, {
			props: {
				parameter: selectParam,
				value: "parallel",
				onchange: vi.fn(),
				theme: "dark",
			},
		});
		expect(screen.getByText("View Mode")).toBeInTheDocument();
	});

	it("renders option elements for each entry in parameter.options", () => {
		render(SelectControl, {
			props: {
				parameter: selectParam,
				value: "parallel",
				onchange: vi.fn(),
				theme: "dark",
			},
		});
		const options = screen.getAllByRole("option");
		expect(options).toHaveLength(2);
	});

	it("marks the matching option as selected based on value prop", () => {
		render(SelectControl, {
			props: {
				parameter: selectParam,
				value: "depth",
				onchange: vi.fn(),
				theme: "dark",
			},
		});
		expect(screen.getByDisplayValue("Depth Map")).toBeInTheDocument();
	});

	it("calls onchange with selected option value on change", async () => {
		const onchange = vi.fn();
		render(SelectControl, {
			props: {
				parameter: selectParam,
				value: "parallel",
				onchange,
				theme: "dark",
			},
		});
		const select = screen.getByLabelText("View Mode");
		await fireEvent.change(select, { target: { value: "depth" } });
		expect(onchange).toHaveBeenCalledWith("depth");
	});

	it("renders each option's label text", () => {
		render(SelectControl, {
			props: {
				parameter: selectParam,
				value: "parallel",
				onchange: vi.fn(),
				theme: "dark",
			},
		});
		expect(screen.getByText("Parallel View")).toBeInTheDocument();
		expect(screen.getByText("Depth Map")).toBeInTheDocument();
	});
});
