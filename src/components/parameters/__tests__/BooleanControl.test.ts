import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { SketchParameter } from "../../../types/sketch.js";
import BooleanControl from "../BooleanControl.svelte";

const booleanParam = {
	type: "boolean",
	key: "enabled",
	label: "Enabled",
} as const satisfies SketchParameter;

describe("BooleanControl", () => {
	it("renders label text from parameter definition", () => {
		render(BooleanControl, {
			props: {
				parameter: booleanParam,
				value: true,
				onchange: vi.fn(),
				theme: "dark",
			},
		});
		expect(screen.getByText("Enabled")).toBeInTheDocument();
	});

	it("checkbox reflects value prop (checked when truthy)", () => {
		render(BooleanControl, {
			props: {
				parameter: booleanParam,
				value: true,
				onchange: vi.fn(),
				theme: "dark",
			},
		});
		const toggle = screen.getByRole("switch", { name: /enabled/i });
		expect(toggle).toBeChecked();
	});

	it("aria-checked matches value prop", () => {
		render(BooleanControl, {
			props: {
				parameter: booleanParam,
				value: true,
				onchange: vi.fn(),
				theme: "dark",
			},
		});
		const toggle = screen.getByRole("switch", { name: /enabled/i });
		expect(toggle).toHaveAttribute("aria-checked", "true");
	});

	it("calls onchange with false when checked checkbox is toggled off", async () => {
		const onchange = vi.fn();
		render(BooleanControl, {
			props: {
				parameter: booleanParam,
				value: true,
				onchange,
				theme: "dark",
			},
		});
		const toggle = screen.getByRole("switch", { name: /enabled/i });
		await fireEvent.click(toggle);
		expect(onchange).toHaveBeenCalledWith(false);
	});

	it("calls onchange with true when unchecked checkbox is toggled on", async () => {
		const onchange = vi.fn();
		render(BooleanControl, {
			props: {
				parameter: booleanParam,
				value: false,
				onchange,
				theme: "dark",
			},
		});
		const toggle = screen.getByRole("switch", { name: /enabled/i });
		await fireEvent.click(toggle);
		expect(onchange).toHaveBeenCalledWith(true);
	});
});
