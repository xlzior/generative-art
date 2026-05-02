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

	it("displays 'Dark Mode' when current theme is light", () => {
		render(ThemeToggle, {
			props: { currentTheme: "light", ontoggle: handleToggle },
		});

		expect(screen.getByText("Dark Mode")).toBeInTheDocument();
	});

	it("displays 'Light Mode' when current theme is dark", () => {
		render(ThemeToggle, {
			props: { currentTheme: "dark", ontoggle: handleToggle },
		});

		expect(screen.getByText("Light Mode")).toBeInTheDocument();
	});

	it("sets aria-pressed based on current theme", () => {
		const { rerender } = render(ThemeToggle, {
			props: { currentTheme: "light", ontoggle: handleToggle },
		});

		const button = screen.getByRole("button", { name: /dark mode/i });
		expect(button).toHaveAttribute("aria-pressed", "false");

		rerender({ currentTheme: "dark", ontoggle: handleToggle });
		expect(button).toHaveAttribute("aria-pressed", "true");
	});

	it("calls ontoggle when clicked", async () => {
		render(ThemeToggle, {
			props: { currentTheme: "light", ontoggle: handleToggle },
		});

		const button = screen.getByRole("button", { name: /dark mode/i });
		await fireEvent.click(button);

		expect(toggleCalls).toBe(1);
	});
});
