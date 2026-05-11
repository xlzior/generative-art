import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DefaultsStore } from "../defaults-store.js";
import { devServerStore, localStorageStore } from "../defaults-store.js";

beforeEach(() => {
	localStorage.clear();
});

afterEach(() => {
	vi.restoreAllMocks();
});

const stores: { name: string; store: DefaultsStore }[] = [
	{ name: "devServerStore", store: devServerStore },
	{ name: "localStorageStore", store: localStorageStore },
];

describe.each(stores)("$name", ({ store }) => {
	beforeEach(() => {
		if (store === devServerStore) {
			vi.stubGlobal(
				"fetch",
				vi.fn().mockResolvedValue({
					ok: true,
					headers: new Map(),
					json: async () => ({}),
				}),
			);
		}
	});

	it("save then load returns saved defaults", async () => {
		const defaults = { size: 100, name: "hello", enabled: true };

		await store.save("test-sketch", defaults);
		const loaded = store.load("test-sketch");

		if (store === devServerStore) {
			// Dev server persists to disk, not to browser storage.
			// Load is a no-op — only save goes to the server.
			expect(loaded).toBeNull();
		} else {
			expect(loaded).toEqual(defaults);
		}
	});

	it("load returns null for unknown sketch id", () => {
		expect(store.load("nonexistent")).toBeNull();
	});

	it("save then load returns latest after overwrite", async () => {
		await store.save("test-sketch", { size: 1 });
		await store.save("test-sketch", { size: 2 });

		const loaded = store.load("test-sketch");

		if (store === devServerStore) {
			expect(loaded).toBeNull();
		} else {
			expect(loaded).toEqual({ size: 2 });
		}
	});
});

describe("devServerStore", () => {
	it("load always returns null", () => {
		expect(devServerStore.load("any-sketch")).toBeNull();
	});

	it("save sends POST to /__sketch-defaults with id and defaults", async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			headers: new Map(),
			json: async () => ({}),
		});
		vi.stubGlobal("fetch", mockFetch);

		const defaults = { size: 42, name: "test" };
		await devServerStore.save("my-sketch", defaults);

		expect(mockFetch).toHaveBeenCalledWith("/__sketch-defaults", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id: "my-sketch", defaults }),
		});
	});

	it("save throws the server error message on failure", async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: false,
			headers: new Map([["content-type", "application/json"]]),
			json: async () => ({ message: "bad request" }),
		});
		vi.stubGlobal("fetch", mockFetch);

		await expect(devServerStore.save("my-sketch", { size: 1 })).rejects.toThrow(
			"bad request",
		);
	});

	it("save throws generic message when server error has no JSON body", async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: false,
			headers: new Map(),
			json: async () => ({}),
		});
		vi.stubGlobal("fetch", mockFetch);

		await expect(devServerStore.save("my-sketch", { size: 1 })).rejects.toThrow(
			"Failed to save defaults",
		);
	});
});

describe("localStorageStore", () => {
	it("different sketches have isolated storage", () => {
		localStorageStore.save("sketch-a", { value: "a" });
		localStorageStore.save("sketch-b", { value: "b" });

		expect(localStorageStore.load("sketch-a")).toEqual({ value: "a" });
		expect(localStorageStore.load("sketch-b")).toEqual({ value: "b" });
	});

	it("load returns null for corrupted JSON", () => {
		localStorage.setItem("sketch-defaults:corrupted", "not-json");
		expect(localStorageStore.load("corrupted")).toBeNull();
	});
});
