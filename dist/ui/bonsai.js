/** A pixel-art bonsai rendered in the warm phosphor palette. */
import { amber, bezel, dimPhos, moss } from "../theme.js";
/** Canopy. */
const FOLIAGE = [
    "     ▄▄████▄▄     ",
    "   ▄█▀      ▀█▄   ",
    "  █▀   ▄▄▄▄   ▀█  ",
    "  █   ▐████▌   █  ",
    "  ▀▄   ▀▀▀▀   ▄▀  ",
    "    ▀▀▀▀█▀▀▀▀▀    ",
];
/** Trunk. */
const TRUNK = ["        ▐█▌       ", "        ▐█▌       "];
/** Shallow pot. */
const POT = ["   ▗▄████████▄▖   ", "   ▝▀▀▀▀▀▀▀▀▀▀▘   "];
/** Width in columns of the bonsai art. */
export const BONSAI_WIDTH = 18;
export function bonsaiLines() {
    return [
        ...FOLIAGE.map((line) => moss(line)),
        ...TRUNK.map((line) => amber(line)),
        ...POT.map((line) => bezel(line)),
    ];
}
export function bonsaiCaption() {
    return dimPhos("bonsai · rooted");
}
//# sourceMappingURL=bonsai.js.map