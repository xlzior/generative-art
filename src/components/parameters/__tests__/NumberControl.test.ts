import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { SketchParameter } from "../../../types/sketch.js";
import NumberControl from "../NumberControl.svelte";

const numberParam = {
	type: "number",
	key: "size",
	label: "Size",
	min: 0,
	max: 100,
	step: 1,
} as const satisfies SketchParameter;

describe("NumberControl", () => {
	it("renders label from parameter definition", () => {
		render(NumberControl, {
			props: {
				parameter: numberParam,
				value: 50,
				onchange: vi.fn(),
				theme: "dark",
			},
		});
		expect(screen.getByText("Size")).toBeInTheDocument();
	});

	it("renders formatted value", () => {
		render(NumberControl, {
			props: {
				parameter: numberParam,
				value: 42,
				onchange: vi.fn(),
				theme: "dark",
			},
		});
		expect(screen.getByText("42")).toBeInTheDocument();
	});

	it("renders range input with min, max, step from parameter", () => {
		render(NumberControl, {
			props: {
				parameter: numberParam,
				value: 50,
				onchange: vi.fn(),
				theme: "dark",
			},
		});
		const input = screen.getByRole("slider", { name: /size/i });
		expect(input).toHaveAttribute("min", "0");
		expect(input).toHaveAttribute("max", "100");
		expect(input).toHaveAttribute("step", "1");
	});

	it("sets range input value from value prop", () => {
		render(NumberControl, {
			props: {
				parameter: numberParam,
				value: 75,
				onchange: vi.fn(),
				theme: "dark",
			},
		});
		const input = screen.getByRole("slider", { name: /size/i });
		expect(input).toHaveValue("75");
	});

	it("calls onchange with parsed number on input", async () => {
		const onchange = vi.fn();
		render(NumberControl, {
			props: {
				parameter: numberParam,
				value: 50,
				onchange,
				theme: "dark",
			},
		});
		const input = screen.getByRole("slider", { name: /size/i });
		await fireEvent.input(input, { target: { value: "75" } });
		expect(onchange).toHaveBeenCalledWith(75);
	});

	it("handles integer value formatting (no decimals)", () => {
		render(NumberControl, {
			props: {
				parameter: numberParam,
				value: 10,
				onchange: vi.fn(),
				theme: "dark",
			},
		});
		expect(screen.getByText("10")).toBeInTheDocument();
	});

	it("handles decimal value formatting (3 decimals, trimmed)", () => {
		render(NumberControl, {
			props: {
				parameter: numberParam,
				value: 3.14159,
				onchange: vi.fn(),
				theme: "dark",
			},
		});
		expect(screen.getByText("3.142")).toBeInTheDocument();
	});
});
