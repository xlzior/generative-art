<script>
import { onMount } from "svelte";
import SketchGallery from "./components/SketchGallery.svelte";
import SketchView from "./components/SketchView.svelte";
import ThemeToggle from "./components/ThemeToggle.svelte";
import { sketches } from "./sketches/index.js";

let currentTheme = $state("light");
let currentSketchId = $state(null);

const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");

function getSketchById(sketchId) {
	return sketches.find((entry) => entry.id === sketchId);
}

function resolveInitialTheme() {
	const stored = window.localStorage.getItem("theme");
	if (stored === "light" || stored === "dark") {
		return stored;
	}
	return prefersDark.matches ? "dark" : "light";
}

function applyTheme(theme) {
	currentTheme = theme;
	document.documentElement.setAttribute("data-theme", theme);
}

function resolveSketchFromUrl() {
	const params = new URLSearchParams(window.location.search);
	const sketchFromUrl = params.get("sketch");
	if (sketchFromUrl && getSketchById(sketchFromUrl)) {
		return sketchFromUrl;
	}
	return null;
}

function handleNavigate(sketchId) {
	const url = new URL(window.location.href);
	url.searchParams.set("sketch", sketchId);
	window.history.pushState({}, "", url);
	currentSketchId = sketchId;
}

function handleBack() {
	const url = new URL(window.location.href);
	url.searchParams.delete("sketch");
	window.history.pushState({}, "", url);
	currentSketchId = null;
}

function handleThemeToggle() {
	const nextTheme = currentTheme === "dark" ? "light" : "dark";
	applyTheme(nextTheme);
	window.localStorage.setItem("theme", nextTheme);
}

onMount(() => {
	applyTheme(resolveInitialTheme());
	currentSketchId = resolveSketchFromUrl();

	function handlePopState() {
		currentSketchId = resolveSketchFromUrl();
	}
	window.addEventListener("popstate", handlePopState);

	return () => {
		window.removeEventListener("popstate", handlePopState);
	};
});
</script>

<div class="app-shell">
	{#if currentSketchId === null}
		<SketchGallery
			{sketches}
			{currentTheme}
			onnavigate={handleNavigate}
			onthemechange={handleThemeToggle}
		/>
	{:else}
		<SketchView
			sketchId={currentSketchId}
			{currentTheme}
			onback={handleBack}
			onthemechange={handleThemeToggle}
		/>
	{/if}
</div>

<style>
	.app-shell {
		min-height: 100vh;
	}

	:global(.app-shell:has(.gallery-shell)) {
		height: auto;
	}
</style>
