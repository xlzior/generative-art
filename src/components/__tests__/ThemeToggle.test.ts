import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/svelte";
import ThemeToggle from "../ThemeToggle.svelte";

describe("ThemeToggle", () => {
	let toggleCalls = 0;
	function handleToggle() {
		toggleCalls++;
	}

	beforeEach(() => {
		toggleCalls = 0;
	});

	it("shows both Light and Dark labels", () => {
		render(ThemeToggle, {
			props: { currentTheme: "light", ontoggle: handleToggle },
		});

		expect(screen.getByText("Light")).toBeInTheDocument();
		expect(screen.getByText("Dark")).toBeInTheDocument();
	});

	it("sets aria-checked on the active radio button", () => {
		const { rerender } = render(ThemeToggle, {
			props: { currentTheme: "light", ontoggle: handleToggle },
		});

		const light = screen.getByRole("radio", { name: /light/i });
		const dark = screen.getByRole("radio", { name: /dark/i });
		expect(light).toHaveAttribute("aria-checked", "true");
		expect(dark).toHaveAttribute("aria-checked", "false");

		rerender({ currentTheme: "dark", ontoggle: handleToggle });
		expect(light).toHaveAttribute("aria-checked", "false");
		expect(dark).toHaveAttribute("aria-checked", "true");
	});

	it("calls ontoggle when a button is clicked", async () => {
		render(ThemeToggle, {
			props: { currentTheme: "light", ontoggle: handleToggle },
		});

		await fireEvent.click(screen.getByRole("radio", { name: /dark/i }));
		expect(toggleCalls).toBe(1);

		await fireEvent.click(screen.getByRole("radio", { name: /light/i }));
		expect(toggleCalls).toBe(2);
	});
});
