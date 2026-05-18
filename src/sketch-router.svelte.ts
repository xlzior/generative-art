import { getSketchById } from "./sketches/index.js";

type NavigationCallback = (id: string | null) => void;

let _onNavigate: NavigationCallback | null = null;

function resolveSketchFromUrl(): string | null {
	const params = new URLSearchParams(window.location.search);
	const sketchFromUrl = params.get("sketch");
	if (sketchFromUrl && getSketchById(sketchFromUrl)) {
		return sketchFromUrl;
	}
	return null;
}

export function navigateToSketch(id: string) {
	const url = new URL(window.location.href);
	url.searchParams.set("sketch", id);
	window.history.pushState({}, "", url);
	_onNavigate?.(id);
}

export function navigateToGallery() {
	const url = new URL(window.location.href);
	url.searchParams.delete("sketch");
	window.history.pushState({}, "", url);
	_onNavigate?.(null);
}

export function initRouter(onNavigate: NavigationCallback): () => void {
	_onNavigate = onNavigate;
	onNavigate(resolveSketchFromUrl());

	function handlePopState() {
		const id = resolveSketchFromUrl();
		onNavigate(id);
	}

	window.addEventListener("popstate", handlePopState);

	return () => {
		_onNavigate = null;
		window.removeEventListener("popstate", handlePopState);
	};
}
