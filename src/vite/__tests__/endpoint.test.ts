import type { IncomingMessage } from "node:http";
import { describe, expect, it } from "vitest";
import { readJsonBody } from "../endpoint-utils.js";

describe("readJsonBody()", () => {
	const createMockRequest = (body: string) => {
		const chunks: Buffer[] = [];
		const events: Record<string, Array<(chunk?: Buffer) => void>> = {
			data: [],
			end: [],
		};

		for (let i = 0; i < body.length; i += 1024) {
			const end = Math.min(i + 1024, body.length);
			chunks.push(Buffer.from(body.slice(i, end)));
		}

		const req = {
			on: (event: string, handler: (chunk?: Buffer) => void) => {
				if (events[event]) {
					events[event].push(handler);
				}
				return req;
			},
		} as unknown as IncomingMessage;

		setTimeout(() => {
			chunks.forEach((chunk) => {
				events.data.forEach((handler) => {
					handler(chunk);
				});
			});
			events.end.forEach((handler) => {
				handler();
			});
		}, 0);

		return req;
	};

	it("should parse valid JSON", async () => {
		const req = createMockRequest('{"size": 50, "id": "test-sketch"}');
		const result = await readJsonBody(req);
		expect(result).toEqual({
			size: 50,
			id: "test-sketch",
		});
	});

	it("should reject invalid JSON", async () => {
		const req = createMockRequest("{invalid json}");
		await expect(readJsonBody(req)).rejects.toThrow("Invalid JSON payload");
	});

	it("should handle empty body as empty object", async () => {
		const req = createMockRequest("");
		const result = await readJsonBody(req);
		expect(result).toEqual({});
	});

	it("should reject very large bodies", async () => {
		const largeBody = "x".repeat(2000001);
		const req = createMockRequest(largeBody);
		await expect(readJsonBody(req)).rejects.toThrow("Request body too large");
	});
});
