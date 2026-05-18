import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { SketchParameter } from "../../../types/sketch.js";
import DimensionsControl from "../DimensionsControl.svelte";

const dimensionsParam = {
	type: "dimensions",
	key: "dimensions",
	label: "Canvas Size",
} as const satisfies SketchParameter;

describe("DimensionsControl", () => {
	it("renders label from parameter definition", () => {
		render(DimensionsControl, {
			props: {
				parameter: dimensionsParam,
				value: { width: null, height: null },
				onchange: vi.fn(),
				theme: "dark",
			},
		});
		expect(screen.getByText("Canvas Size")).toBeInTheDocument();
	});

	it("renders DimensionsInput with current width/height", () => {
		render(DimensionsControl, {
			props: {
				parameter: dimensionsParam,
				value: { width: 800, height: 600 },
				onchange: vi.fn(),
				theme: "dark",
			},
		});
		expect(screen.getByPlaceholderText("W")).toHaveValue("800");
		expect(screen.getByPlaceholderText("H")).toHaveValue("600");
	});

	it("dispatches onchange with updated dimensions on width input", async () => {
		const onchange = vi.fn();
		render(DimensionsControl, {
			props: {
				parameter: dimensionsParam,
				value: { width: null, height: null },
				onchange,
				theme: "dark",
			},
		});
		const input = screen.getByPlaceholderText("W");
		await fireEvent.input(input, { target: { value: "800" } });
		expect(onchange).toHaveBeenCalledWith({ width: 800, height: null });
	});

	it("dispatches onchange with updated dimensions on height input", async () => {
		const onchange = vi.fn();
		render(DimensionsControl, {
			props: {
				parameter: dimensionsParam,
				value: { width: 800, height: null },
				onchange,
				theme: "dark",
			},
		});
		const input = screen.getByPlaceholderText("H");
		await fireEvent.input(input, { target: { value: "600" } });
		expect(onchange).toHaveBeenCalledWith({ width: 800, height: 600 });
	});

	it("preserves the other dimension when one side changes", async () => {
		const onchange = vi.fn();
		render(DimensionsControl, {
			props: {
				parameter: dimensionsParam,
				value: { width: 1024, height: 768 },
				onchange,
				theme: "dark",
			},
		});
		const input = screen.getByPlaceholderText("W");
		await fireEvent.input(input, { target: { value: "800" } });
		expect(onchange).toHaveBeenCalledWith({ width: 800, height: 768 });
	});

	it("passes null for non-numeric input values", async () => {
		const onchange = vi.fn();
		render(DimensionsControl, {
			props: {
				parameter: dimensionsParam,
				value: { width: 800, height: 600 },
				onchange,
				theme: "dark",
			},
		});
		const input = screen.getByPlaceholderText("H");
		await fireEvent.input(input, { target: { value: "abc" } });
		expect(onchange).toHaveBeenCalledWith({ width: 800, height: null });
	});

	it("passes null for empty input values", async () => {
		const onchange = vi.fn();
		render(DimensionsControl, {
			props: {
				parameter: dimensionsParam,
				value: { width: 800, height: 600 },
				onchange,
				theme: "dark",
			},
		});
		const input = screen.getByPlaceholderText("W");
		await fireEvent.input(input, { target: { value: "" } });
		expect(onchange).toHaveBeenCalledWith({ width: null, height: 600 });
	});
});
