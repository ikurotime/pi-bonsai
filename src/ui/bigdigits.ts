/** Tiny 3x5 block font for large headline numbers. */

const GLYPHS: Record<string, string[]> = {
	"0": ["███", "█ █", "█ █", "█ █", "███"],
	"1": ["  █", "  █", "  █", "  █", "  █"],
	"2": ["███", "  █", "███", "█  ", "███"],
	"3": ["███", "  █", "███", "  █", "███"],
	"4": ["█ █", "█ █", "███", "  █", "  █"],
	"5": ["███", "█  ", "███", "  █", "███"],
	"6": ["███", "█  ", "███", "█ █", "███"],
	"7": ["███", "  █", "  █", "  █", "  █"],
	"8": ["███", "█ █", "███", "█ █", "███"],
	"9": ["███", "█ █", "███", "  █", "███"],
	",": ["   ", "   ", "   ", "  █", " █ "],
	".": ["   ", "   ", "   ", "   ", " █ "],
	"k": ["█ █", "█ █", "██ ", "█ █", "█ █"],
	"K": ["█ █", "█ █", "██ ", "█ █", "█ █"],
	"M": ["█ █", "███", "█ █", "█ █", "█ █"],
	" ": ["   ", "   ", "   ", "   ", "   "],
};

/** Render text as 5 lines of block glyphs. */
export function bigText(text: string): string[] {
	const chars = [...text];
	const rows = ["", "", "", "", ""];
	for (const [index, char] of chars.entries()) {
		const glyph = GLYPHS[char] ?? GLYPHS[" "];
		if (!glyph) continue;
		for (let row = 0; row < 5; row++) {
			rows[row] += (index > 0 ? " " : "") + (glyph[row] ?? "   ");
		}
	}
	return rows;
}
