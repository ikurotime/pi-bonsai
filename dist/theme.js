/**
 * CRT phosphor palette with a bonsai green/amber mood.
 *
 * The original pink/purple/cyan names are kept as aliases so panels do not
 * need to know the theme changed; new code should prefer the semantic names.
 */
function fg(r, g, b) {
    return (s) => `\x1b[38;2;${r};${g};${b}m${s}\x1b[0m`;
}
/** Primary phosphor green, the CRT "on" color. */
export const phos = fg(51, 255, 102);
/** Hotter green for highlights and the cursor. */
export const phosBright = fg(170, 255, 190);
/** Amber, the classic secondary CRT color. */
export const amber = fg(255, 176, 0);
/** Lime, for a third series. */
export const lime = fg(184, 255, 64);
/** Cyan-green, the "info" series. */
export const teal = fg(80, 240, 200);
/** Warm off-white for body copy. */
export const warmText = fg(200, 235, 208);
/** Dim phosphor for labels. */
export const dimPhos = fg(78, 132, 96);
/** Screen bezel / border green. */
export const bezel = fg(48, 148, 90);
export const ok = fg(80, 255, 140);
export const err = fg(255, 85, 85);
export const warn = fg(255, 176, 0);
/** Back-compat aliases used by the panels. */
export const pink = phos;
export const purple = amber;
export const cyan = teal;
export const green = ok;
export const red = err;
export const yellow = warn;
export const orange = amber;
export const text = warmText;
export const muted = dimPhos;
export const border = bezel;
export const bold = (s) => `\x1b[1m${s}\x1b[0m`;
/** Reverse video, for the CRT cursor block. */
export const inverse = (s) => `\x1b[7m${s}\x1b[27m`;
/** Model legend colors, assigned by index. */
export const modelColors = [phos, amber, lime, teal, warmText, phosBright];
export function modelColor(index) {
    return modelColors[index % modelColors.length] ?? phos;
}
//# sourceMappingURL=theme.js.map