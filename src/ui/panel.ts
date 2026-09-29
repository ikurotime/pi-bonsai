/** Bordered panel and column layout helpers. */

import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import { border } from "../theme.js";

export type Colorize = (s: string) => string;

function pad(content: string, width: number): string {
	const clipped = truncateToWidth(content, width);
	const gap = width - visibleWidth(clipped);
	return gap > 0 ? clipped + " ".repeat(gap) : clipped;
}

/** Draw a rounded, titled panel around the supplied body lines. */
export function panel(width: number, title: string, titleColor: Colorize, body: string[]): string[] {
	const w = Math.max(16, width);
	const titleLen = visibleWidth(title);
	const fill = Math.max(0, w - 5 - titleLen);
	const top = border("╭─") + titleColor(` ${title} `) + border(`${"─".repeat(fill)}╮`);
	const inner = w - 2;
	const contentWidth = inner - 2;

	const lines = [top];
	for (const raw of body) {
		lines.push(border("│") + " " + pad(raw, contentWidth) + " " + border("│"));
	}
	lines.push(border("╰" + "─".repeat(inner) + "╯"));
	return lines;
}

/** Lay out two already-rendered panels side by side, padding the shorter one. */
export function twoColumn(
	left: string[],
	right: string[],
	leftWidth: number,
	rightWidth: number,
	gap = 2,
): string[] {
	const rows = Math.max(left.length, right.length);
	const out: string[] = [];
	for (let i = 0; i < rows; i++) {
		const l = pad(left[i] ?? "", leftWidth);
		const r = pad(right[i] ?? "", rightWidth);
		out.push(l + " ".repeat(gap) + r);
	}
	return out;
}

/** Split a total width into a left/right pair with a gap. */
export function splitWidths(width: number, ratio: number, gap = 2): [number, number] {
	const usable = width - gap;
	const left = Math.max(24, Math.floor(usable * ratio));
	const right = Math.max(24, usable - left);
	return [left, right];
}
