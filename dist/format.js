/** Formatting helpers shared by panels. */
export function formatTokens(count) {
    if (count < 1000)
        return `${count}`;
    if (count < 10_000)
        return `${(count / 1000).toFixed(1)}k`;
    if (count < 1_000_000)
        return `${Math.round(count / 1000)}k`;
    return `${(count / 1_000_000).toFixed(1)}M`;
}
export function formatMoney(value) {
    if (value >= 100)
        return `$${value.toFixed(0)}`;
    return `$${value.toFixed(2)}`;
}
export function formatAgo(epochMs, now = Date.now()) {
    const delta = Math.max(0, now - epochMs);
    const s = Math.floor(delta / 1000);
    if (s < 60)
        return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60)
        return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24)
        return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}
export function formatClock(epochMs) {
    const d = new Date(epochMs);
    const pad = (n) => `${n}`.padStart(2, "0");
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
export function formatDuration(ms) {
    const s = Math.floor(ms / 1000);
    if (s < 60)
        return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60)
        return `${m}m${s % 60}s`;
    const h = Math.floor(m / 60);
    return `${h}h${m % 60}m`;
}
//# sourceMappingURL=format.js.map