/** A small pixel-art bonsai rendered in the phosphor palette. */
import { amber, dimPhos, phos } from "../theme.js";
/** Foliage rows (green) then trunk/pot rows (amber). */
const TREE = ["   ▄▄█▄▄   ", "  █▀   ▀█  ", " ▐  ▄█▄  ▌ ", "  ▜▄█▀█▄▛  "];
const POT = ["    ▐█▌    ", "  ▗▄███▄▖  ", "  ▝▀▀▀▀▀▘  "];
/** Width in columns of the bonsai art. */
export const BONSAI_WIDTH = 12;
export function bonsaiLines() {
    return [...TREE.map((line) => phos(line)), ...POT.map((line) => amber(line))];
}
export function bonsaiCaption() {
    return dimPhos("bonsai · idle");
}
//# sourceMappingURL=bonsai.js.map