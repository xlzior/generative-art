import BooleanControl from "./BooleanControl.svelte";
import ColourControl from "./ColourControl.svelte";
import DimensionsControl from "./DimensionsControl.svelte";
import NumberControl from "./NumberControl.svelte";
import SelectControl from "./SelectControl.svelte";
import StringControl from "./StringControl.svelte";

export const controlMap = {
	number: NumberControl,
	string: StringControl,
	boolean: BooleanControl,
	colour: ColourControl,
	select: SelectControl,
	dimensions: DimensionsControl,
} as const;
