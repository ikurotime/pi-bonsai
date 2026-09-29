/**
 * A realistic ASCII bonsai, tinted by part: moss canopy, bark trunk, bronze pot.
 *
 * The art is intentionally left-aligned; callers centre it as a block.
 */

import { amber, bark, bezel, dimPhos, moss, mossBright, mossDim } from "../theme.js";

/** Canopy and branches. */
const FOLIAGE = [
	"         .:&@@&:.",
	"      ,&@@&&@@@@&&@,",
	"   .,&@@@&@\\|/@@@@&@@,",
	"  ,&@@&@@@&\\|/-.@@&@@@'",
	"   `'&@@&~-.||  `'&@@@@,",
	"  .:&&@&~-.__||/-'&@@&@'",
	" ,&@@&@@'`-.||/    `'~",
	"  `'&@&@&:. |||  ,&@@&,",
	"     `'&@@&-.||-'@@&@@'",
];

/** Trunk. */
const TRUNK = ["           .-'||", "           |||)"];

/** Shallow pot with soil. */
const POT = [
	"       ____/||\\____",
	"    .-'~~~~~~~~~~~~'-.",
	"   (  . : . : . : .   )",
	"    `-.__(__)__(__).-'",
];

const ALL = [...FOLIAGE, ...TRUNK, ...POT];

/** Width in columns of the bonsai block. */
export const BONSAI_WIDTH = ALL.reduce((max, line) => Math.max(max, line.length), 0);

function tintFoliage(line: string): string {
	let out = "";
	for (const ch of line) {
		if (ch === " ") out += ch;
		else if (ch === "@") out += mossBright(ch);
		else if (ch === "&") out += moss(ch);
		else if (ch === "|" || ch === "/" || ch === "\\" || ch === "-" || ch === "~" || ch === "_") out += bark(ch);
		else out += mossDim(ch);
	}
	return out;
}

function tintPot(line: string): string {
	let out = "";
	for (const ch of line) {
		if (ch === " ") out += ch;
		else if (ch === "~") out += amber(ch);
		else if (ch === "." || ch === ":") out += dimPhos(ch);
		else out += bezel(ch);
	}
	return out;
}

/** Render the bonsai, centred inside `width` columns. */
export function bonsaiLines(width = BONSAI_WIDTH): string[] {
	const pad = " ".repeat(Math.max(0, Math.floor((width - BONSAI_WIDTH) / 2)));
	return [
		...FOLIAGE.map((line) => pad + tintFoliage(line)),
		...TRUNK.map((line) => pad + [...line].map((ch) => (ch === " " ? ch : bark(ch))).join("")),
		...POT.map((line) => pad + tintPot(line)),
	];
}

export function bonsaiCaption(width = BONSAI_WIDTH): string {
	const text = "bonsai · rooted";
	const pad = " ".repeat(Math.max(0, Math.floor((width - text.length) / 2)));
	return `${pad}${dimPhos(text)}`;
}
