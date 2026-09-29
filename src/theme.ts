/**
 * Warm CRT phosphor palette — amber primary, moss green foliage, bronze bezel.
 *
 * The original pink/purple/cyan names are kept as aliases so panels do not
 * need to know the theme changed; new code should prefer the semantic names.
 */

function fg(r: number, g: number, b: number): (s: string) => string {
	return (s: string) => `\x1b[38;2;${r};${g};${b}m${s}\x1b[0m`;
}

/** Primary warm amber — the CRT "on" color. */
export const phos = fg(255, 176, 58);
/** Hot cream-gold for highlights and the cursor. */
export const phosBright = fg(255, 224, 154);
/** Deeper amber, the classic secondary. */
export const amber = fg(255, 158, 0);
/** Warm yellow-green. */
export const lime = fg(206, 214, 92);
/** Warm sand, the "info" series. */
export const teal = fg(226, 198, 140);
/** Warm cream body copy. */
export const warmText = fg(242, 228, 198);
/** Dim warm brown for labels. */
export const dimPhos = fg(142, 118, 80);
/** Bronze screen bezel. */
export const bezel = fg(186, 138, 62);
/** Moss green — foliage and "ok" states. */
export const moss = fg(168, 214, 96);

export const ok = moss;
export const err = fg(255, 106, 77);
export const warn = fg(255, 176, 58);

/** Back-compat aliases used by the panels. */
export const pink = phos;
export const purple = amber;
export const cyan = teal;
export const green = moss;
export const red = err;
export const yellow = warn;
export const orange = amber;
export const text = warmText;
export const muted = dimPhos;
export const border = bezel;

export const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
/** Reverse video, for the CRT cursor block. */
export const inverse = (s: string) => `\x1b[7m${s}\x1b[27m`;

/** Model legend colors, assigned by index. */
export const modelColors = [
	fg(255, 176, 58),
	fg(168, 214, 96),
	fg(226, 198, 140),
	fg(206, 214, 92),
	fg(255, 224, 154),
	fg(214, 140, 84),
];

export function modelColor(index: number): (s: string) => string {
	return modelColors[index % modelColors.length] ?? phos;
}
