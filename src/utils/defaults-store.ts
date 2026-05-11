export interface DefaultsStore {
	load(sketchId: string): Record<string, unknown> | null;
	save(sketchId: string, defaults: Record<string, unknown>): Promise<void>;
}

const devCache = new Map<string, Record<string, unknown>>();

export const devServerStore: DefaultsStore = {
	load: (id) => devCache.get(id) ?? null,
	save: async (id, defaults) => {
		devCache.set(id, { ...defaults });

		const response = await fetch("/__sketch-defaults", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id, defaults }),
		});

		if (!response.ok) {
			const contentType = response.headers.get("content-type") || "";
			let message = "Failed to save defaults";
			if (contentType.includes("application/json")) {
				const data = await response.json();
				message = data.message || message;
			}
			throw new Error(message);
		}
	},
};

export const localStorageStore: DefaultsStore = {
	load: (id) => {
		const stored = localStorage.getItem(`sketch-defaults:${id}`);
		if (stored === null) return null;
		try {
			return JSON.parse(stored) as Record<string, unknown>;
		} catch {
			return null;
		}
	},
	save: async (id, defaults) => {
		localStorage.setItem(`sketch-defaults:${id}`, JSON.stringify(defaults));
	},
};

export const store: DefaultsStore = import.meta.env.VITE_DEPLOY_STATIC
	? localStorageStore
	: devServerStore;
