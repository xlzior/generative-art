import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import DimensionsInput from "../DimensionsInput.svelte";

describe("DimensionsInput", () => {
	it("renders two inputs with W and H placeholders", () => {
		render(DimensionsInput, {
			props: { width: null, height: null, oninput: vi.fn() },
		});
		expect(screen.getByPlaceholderText("W")).toBeInTheDocument();
		expect(screen.getByPlaceholderText("H")).toBeInTheDocument();
	});

	it("renders × separator between inputs", () => {
		render(DimensionsInput, {
			props: { width: null, height: null, oninput: vi.fn() },
		});
		expect(screen.getByText("×")).toBeInTheDocument();
	});

	it("displays width and height values passed as props", () => {
		render(DimensionsInput, {
			props: { width: 800, height: 600, oninput: vi.fn() },
		});
		const inputs = screen.getAllByRole("textbox");
		expect(inputs[0]).toHaveValue("800");
		expect(inputs[1]).toHaveValue("600");
	});

	it("renders empty inputs when values are null", () => {
		render(DimensionsInput, {
			props: { width: null, height: null, oninput: vi.fn() },
		});
		const inputs = screen.getAllByRole("textbox");
		expect(inputs[0]).toHaveValue("");
		expect(inputs[1]).toHaveValue("");
	});

	it('calls oninput("width", event) when first input changes', async () => {
		const oninput = vi.fn();
		render(DimensionsInput, {
			props: { width: null, height: null, oninput },
		});
		const input = screen.getByPlaceholderText("W");
		await fireEvent.input(input, { target: { value: "800" } });
		expect(oninput).toHaveBeenCalledWith("width", expect.any(Event));
	});

	it('calls oninput("height", event) when second input changes', async () => {
		const oninput = vi.fn();
		render(DimensionsInput, {
			props: { width: null, height: null, oninput },
		});
		const input = screen.getByPlaceholderText("H");
		await fireEvent.input(input, { target: { value: "600" } });
		expect(oninput).toHaveBeenCalledWith("height", expect.any(Event));
	});
});
