import type { SketchParameter } from "../../types/sketch.js";

export function formatParamValue(
	parameter: SketchParameter,
	value: unknown,
): string {
	if (parameter.type === "colour" || parameter.type === "string") {
		return String(value);
	}
	const num = value as number;
	if (Number.isInteger(num)) {
		return String(num);
	}
	return num
		.toFixed(3)
		.replace(/\.0+$/, "")
		.replace(/(\.\d*?)0+$/, "$1");
}
