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

const dimensionsParam: SketchParameter = {
	key: "dimensions",
	label: "Canvas Size",
	type: "dimensions",
};

const selectParam: SketchParameter = {
	key: "viewMode",
	label: "View Mode",
	type: "select",
	options: [
		{ label: "Parallel View", value: "parallel" },
		{ label: "Depth Map", value: "depth" },
		{ label: "Cross View", value: "cross" },
	],
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

		it("renders toggle for boolean parameters", () => {
			const sketch = createMockSketch([booleanParam]);
			render(ParameterControls, {
				props: { sketch, params: { enabled: true }, onchange: handleChange },
			});

			const toggle = screen.getByRole("switch", { name: /enabled/i });
			expect(toggle).toBeInTheDocument();
			expect(toggle).toHaveAttribute("aria-checked", "true");
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

		it("calls onchange with correct key/value when toggle clicks", async () => {
			const sketch = createMockSketch([booleanParam]);
			render(ParameterControls, {
				props: { sketch, params: { enabled: true }, onchange: handleChange },
			});

			const toggle = screen.getByRole("switch", { name: /enabled/i });
			await fireEvent.click(toggle);

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

	describe("dimensions parameter", () => {
		it("renders two text inputs and an 'x' separator", () => {
			const sketch = createMockSketch([dimensionsParam]);
			render(ParameterControls, {
				props: {
					sketch,
					params: { dimensions: { width: null, height: null } },
					onchange: handleChange,
				},
			});

			expect(screen.getByText(/canvas size/i)).toBeInTheDocument();
			expect(screen.getByPlaceholderText("W")).toBeInTheDocument();
			expect(screen.getByPlaceholderText("H")).toBeInTheDocument();
			expect(screen.getByText("×")).toBeInTheDocument();
		});

		it("calls onchange with correct object when width changes", async () => {
			const sketch = createMockSketch([dimensionsParam]);
			render(ParameterControls, {
				props: {
					sketch,
					params: { dimensions: { width: null, height: null } },
					onchange: handleChange,
				},
			});

			const widthInput = screen.getByPlaceholderText("W");
			await fireEvent.input(widthInput, { target: { value: "800" } });

			expect(onChangeCalls).toHaveLength(1);
			expect(onChangeCalls[0]).toEqual([
				"dimensions",
				{ width: 800, height: null },
			]);
		});

		it("calls onchange with correct object when height changes", async () => {
			const sketch = createMockSketch([dimensionsParam]);
			render(ParameterControls, {
				props: {
					sketch,
					params: { dimensions: { width: 800, height: null } },
					onchange: handleChange,
				},
			});

			const heightInput = screen.getByPlaceholderText("H");
			await fireEvent.input(heightInput, { target: { value: "600" } });

			expect(onChangeCalls).toHaveLength(1);
			expect(onChangeCalls[0]).toEqual([
				"dimensions",
				{ width: 800, height: 600 },
			]);
		});

		it("handles empty input as null", async () => {
			const sketch = createMockSketch([dimensionsParam]);
			render(ParameterControls, {
				props: {
					sketch,
					params: { dimensions: { width: 800, height: 600 } },
					onchange: handleChange,
				},
			});

			const widthInput = screen.getByPlaceholderText("W");
			await fireEvent.input(widthInput, { target: { value: "" } });

			expect(onChangeCalls).toHaveLength(1);
			expect(onChangeCalls[0]).toEqual([
				"dimensions",
				{ width: null, height: 600 },
			]);
		});

		it("handles non-numeric input as null", async () => {
			const sketch = createMockSketch([dimensionsParam]);
			render(ParameterControls, {
				props: {
					sketch,
					params: { dimensions: { width: 800, height: 600 } },
					onchange: handleChange,
				},
			});

			const heightInput = screen.getByPlaceholderText("H");
			await fireEvent.input(heightInput, { target: { value: "abc" } });

			expect(onChangeCalls).toHaveLength(1);
			expect(onChangeCalls[0]).toEqual([
				"dimensions",
				{ width: 800, height: null },
			]);
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

	describe("select parameter", () => {
		it("renders select element with options", () => {
			const sketch = createMockSketch([selectParam]);
			render(ParameterControls, {
				props: {
					sketch,
					params: { viewMode: "parallel" },
					onchange: handleChange,
				},
			});

			expect(screen.getByLabelText("View Mode")).toBeInTheDocument();
			expect(screen.getByDisplayValue("Parallel View")).toBeInTheDocument();

			const select = screen.getByLabelText("View Mode");
			const options = select.querySelectorAll("option");
			expect(options).toHaveLength(3);
			expect(options[0]).toHaveValue("parallel");
			expect(options[1]).toHaveValue("depth");
			expect(options[2]).toHaveValue("cross");
		});

		it("calls onchange with correct key/value when select changes", async () => {
			const sketch = createMockSketch([selectParam]);
			render(ParameterControls, {
				props: {
					sketch,
					params: { viewMode: "parallel" },
					onchange: handleChange,
				},
			});

			const select = screen.getByLabelText("View Mode");
			await fireEvent.change(select, { target: { value: "depth" } });

			expect(onChangeCalls).toHaveLength(1);
			expect(onChangeCalls[0]).toEqual(["viewMode", "depth"]);
		});
	});
});
