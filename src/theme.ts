/** ANSI truecolor helpers. Each returns a self-contained, reset-terminated string. */

function fg(r: number, g: number, b: number): (s: string) => string {
	return (s: string) => `\x1b[38;2;${r};${g};${b}m${s}\x1b[0m`;
}

/** Catppuccin-inspired palette matching the reference art. */
export const pink = fg(255, 121, 198);
export const purple = fg(189, 147, 249);
export const cyan = fg(139, 233, 253);
export const green = fg(80, 250, 123);
export const red = fg(255, 85, 85);
export const yellow = fg(241, 250, 140);
export const orange = fg(255, 184, 108);
export const text = fg(205, 214, 244);
export const muted = fg(108, 112, 134);
export const border = fg(88, 91, 112);

export const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;

/** A small color sequence for model legend squares, assigned by index. */
export const modelColors = [pink, purple, cyan, green, yellow, orange];

export function modelColor(index: number): (s: string) => string {
	return modelColors[index % modelColors.length] ?? pink;
}
