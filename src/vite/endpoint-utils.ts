import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const sketchesRoot = path.resolve(projectRoot, "..", "sketches");

export interface DefaultsPayload {
	defaultsFile: string;
	defaults: Record<string, number>;
}

export function readJsonBody(req: IncomingMessage): Promise<DefaultsPayload> {
	return new Promise((resolve, reject) => {
		const chunks: Buffer[] = [];

		req.on("data", (chunk: Buffer) => {
			chunks.push(chunk);
			if (Buffer.concat(chunks).length > 2_000_000) {
				reject(new Error("Request body too large"));
			}
		});

		req.on("end", () => {
			try {
				const body = Buffer.concat(chunks).toString("utf8");
				resolve(JSON.parse(body || "{}"));
			} catch {
				reject(new Error("Invalid JSON payload"));
			}
		});

		req.on("error", reject);
	});
}

export function isWithinSketchesRoot(
	filePath: string,
	root: string = sketchesRoot,
): boolean {
	const normalizedRoot = path.normalize(root + path.sep);
	const normalizedPath = path.normalize(filePath);
	return normalizedPath.startsWith(normalizedRoot);
}

export function createSaveDefaultsHandler() {
	return async (
		req: IncomingMessage,
		res: ServerResponse,
		next: () => void,
	): Promise<void> => {
		if (req.method !== "POST") {
			next();
			return;
		}

		try {
			const { defaultsFile, defaults } = await readJsonBody(req);

			if (typeof defaultsFile !== "string" || defaultsFile.trim() === "") {
				throw new Error("defaultsFile is required");
			}

			if (!defaults || typeof defaults !== "object") {
				throw new Error("defaults must be an object");
			}

			for (const value of Object.values(defaults)) {
				if (!Number.isFinite(value)) {
					throw new Error("defaults values must be numeric");
				}
			}

			const outputPath = path.resolve(sketchesRoot, defaultsFile);

			if (
				!isWithinSketchesRoot(outputPath) ||
				path.basename(outputPath) !== "defaults.json"
			) {
				throw new Error("Invalid defaults file path");
			}

			const fs = await import("node:fs/promises");
			await fs.writeFile(
				outputPath,
				`${JSON.stringify(defaults, null, 2)}\n`,
				"utf8",
			);

			res.statusCode = 200;
			res.setHeader("Content-Type", "application/json");
			res.end(JSON.stringify({ ok: true }));
		} catch (error) {
			const statusCode =
				error &&
				typeof error === "object" &&
				"code" in error &&
				(error as NodeJS.ErrnoException).code === "EACCES"
					? 403
					: 400;
			res.statusCode = statusCode;
			res.setHeader("Content-Type", "application/json");
			res.end(
				JSON.stringify({
					ok: false,
					message:
						error instanceof Error ? error.message : "Failed to save defaults",
				}),
			);
		}

		return undefined;
	};
}
