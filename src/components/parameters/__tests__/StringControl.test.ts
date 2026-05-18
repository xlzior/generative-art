import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { SketchParameter } from "../../../types/sketch.js";
import StringControl from "../StringControl.svelte";

const stringParam = {
	type: "string",
	key: "label",
	label: "Label",
} as const satisfies SketchParameter;

describe("StringControl", () => {
	it("renders label from parameter definition", () => {
		render(StringControl, {
			props: {
				parameter: stringParam,
				value: "hello",
				onchange: vi.fn(),
				theme: "dark",
			},
		});
		expect(screen.getByText("Label")).toBeInTheDocument();
	});

	it("renders text input with current value", () => {
		render(StringControl, {
			props: {
				parameter: stringParam,
				value: "hello",
				onchange: vi.fn(),
				theme: "dark",
			},
		});
		const input = screen.getByRole("textbox", { name: /label/i });
		expect(input).toHaveValue("hello");
	});

	it("calls onchange with string value on input", async () => {
		const onchange = vi.fn();
		render(StringControl, {
			props: {
				parameter: stringParam,
				value: "hello",
				onchange,
				theme: "dark",
			},
		});
		const input = screen.getByRole("textbox", { name: /label/i });
		await fireEvent.input(input, { target: { value: "world" } });
		expect(onchange).toHaveBeenCalledWith("world");
	});

	it("shows empty string when value is undefined", () => {
		render(StringControl, {
			props: {
				parameter: stringParam,
				value: undefined as unknown as string,
				onchange: vi.fn(),
				theme: "dark",
			},
		});
		const input = screen.getByRole("textbox", { name: /label/i });
		expect(input).toHaveValue("");
	});
});
