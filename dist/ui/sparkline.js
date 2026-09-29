/** Unicode block sparkline. */
const BARS = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];
export function sparkline(values, width, color) {
    const data = values.slice(-width);
    const max = Math.max(1, ...data);
    let out = " ".repeat(Math.max(0, width - data.length));
    for (const value of data) {
        const ratio = Math.max(0, value) / max;
        const index = Math.min(BARS.length - 1, Math.round(ratio * (BARS.length - 1)));
        out += BARS[index] ?? "▁";
    }
    return color(out);
}
export function movingAverage(values, window) {
    const out = [];
    let sum = 0;
    for (let i = 0; i < values.length; i++) {
        sum += values[i] ?? 0;
        if (i >= window)
            sum -= values[i - window] ?? 0;
        out.push(sum / Math.min(window, i + 1));
    }
    return out;
}
//# sourceMappingURL=sparkline.js.map