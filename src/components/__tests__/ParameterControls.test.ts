import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/svelte";
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
	}
	return {
		id: "test-sketch",
		title: "Test",
		date: "2026-01-01",
		description: "Test",
		parameters,
		defaults,
		defaultsFile: "",
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

const booleanParam: SketchParameter = {
	key: "enabled",
	label: "Enabled",
	type: "boolean",
};

const stringParam: SketchParameter = {
	key: "label",
	label: "Label",
	type: "string",
};

describe("ParameterControls", () => {
	let onChangeCalls: [string, unknown][] = [];
	function handleChange(key: string, value: unknown) {
		onChangeCalls.push([key, value]);
	}

	beforeEach(() => {
		onChangeCalls = [];
	});

	describe("input type rendering", () => {
		it("renders range input for number parameters", () => {
			const sketch = createMockSketch([numberParam]);
			render(ParameterControls, {
				props: { sketch, params: { size: 50 }, onchange: handleChange },
			});

			const input = screen.getByRole("slider", { name: /size/i });
			expect(input).toBeInTheDocument();
			expect(input).toHaveAttribute("min", "0");
			expect(input).toHaveAttribute("max", "100");
			expect(input).toHaveValue("50");
		});

		it("renders checkbox for boolean parameters", () => {
			const sketch = createMockSketch([booleanParam]);
			render(ParameterControls, {
				props: { sketch, params: { enabled: true }, onchange: handleChange },
			});

			const input = screen.getByRole("checkbox", { name: /enabled/i });
			expect(input).toBeInTheDocument();
			expect(input).toBeChecked();
		});

		it("renders text input for string parameters", () => {
			const sketch = createMockSketch([stringParam]);
			render(ParameterControls, {
				props: { sketch, params: { label: "hello" }, onchange: handleChange },
			});

			const input = screen.getByRole("textbox", { name: /label/i });
			expect(input).toBeInTheDocument();
			expect(input).toHaveValue("hello");
		});
	});

	describe("label and value display", () => {
		it("displays parameter label for each control", () => {
			const sketch = createMockSketch([numberParam, booleanParam]);
			render(ParameterControls, {
				props: {
					sketch,
					params: { size: 50, enabled: true },
					onchange: handleChange,
				},
			});

			expect(screen.getByText("Size")).toBeInTheDocument();
			expect(screen.getByText("Enabled")).toBeInTheDocument();
		});

		it("displays formatted numeric values (3 decimal places, trimmed)", () => {
			const param = { ...numberParam, default: 50.1234 };
			const sketch = createMockSketch([param]);
			render(ParameterControls, {
				props: { sketch, params: { size: 50.1234 }, onchange: handleChange },
			});

			expect(screen.getByText("50.123")).toBeInTheDocument();
		});

		it("displays 'On'/'Off' for boolean values", () => {
			const sketch = createMockSketch([booleanParam]);
			const { rerender } = render(ParameterControls, {
				props: { sketch, params: { enabled: true }, onchange: handleChange },
			});

			expect(screen.getByText("On")).toBeInTheDocument();

			rerender({ sketch, params: { enabled: false }, onchange: handleChange });
			expect(screen.getByText("Off")).toBeInTheDocument();
		});
	});

	describe("event handling", () => {
		it("calls onchange with correct key/value when slider changes", async () => {
			const sketch = createMockSketch([numberParam]);
			render(ParameterControls, {
				props: { sketch, params: { size: 50 }, onchange: handleChange },
			});

			const input = screen.getByRole("slider", { name: /size/i });
			await fireEvent.input(input, { target: { value: "75" } });

			expect(onChangeCalls).toHaveLength(1);
			expect(onChangeCalls[0]).toEqual(["size", 75]);
		});

		it("calls onchange with correct key/value when checkbox toggles", async () => {
			const sketch = createMockSketch([booleanParam]);
			render(ParameterControls, {
				props: { sketch, params: { enabled: true }, onchange: handleChange },
			});

			const input = screen.getByRole("checkbox", { name: /enabled/i });
			await fireEvent.click(input);

			expect(onChangeCalls).toHaveLength(1);
			expect(onChangeCalls[0]).toEqual(["enabled", false]);
		});

		it("calls onchange with correct key/value when text input changes", async () => {
			const sketch = createMockSketch([stringParam]);
			render(ParameterControls, {
				props: { sketch, params: { label: "hello" }, onchange: handleChange },
			});

			const input = screen.getByRole("textbox", { name: /label/i });
			await fireEvent.input(input, { target: { value: "world" } });

			expect(onChangeCalls).toHaveLength(1);
			expect(onChangeCalls[0]).toEqual(["label", "world"]);
		});
	});

	describe("multiple parameters", () => {
		it("renders all parameters in order", () => {
			const sketch = createMockSketch([numberParam, booleanParam, stringParam]);
			render(ParameterControls, {
				props: {
					sketch,
					params: { size: 50, enabled: true, label: "hello" },
					onchange: handleChange,
				},
			});

			const labels = screen.getAllByText(/Size|Enabled|Label/i);
			expect(labels).toHaveLength(3);
		});
	});
});
