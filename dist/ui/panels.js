/** Body builders for each dashboard panel. */
import { formatAgo, formatClock, formatDuration, formatMoney, formatTokens } from "../format.js";
import { amber, bold, border, green, inverse, modelColor, muted, phos, phosBright, pink, purple, red, text, yellow, } from "../theme.js";
import { bigText } from "./bigdigits.js";
import { bonsaiCaption, bonsaiCompactLines, bonsaiLines } from "./bonsai.js";
import { movingAverage, sparkline } from "./sparkline.js";
const DAY = 86_400_000;
const LIVE_SESSION_MS = 120_000;
const CI_STYLE = {
    failed: { glyph: "✗", color: red, label: "failed" },
    running: { glyph: "◐", color: yellow, label: "running" },
    waiting: { glyph: "○", color: muted, label: "waiting" },
    passed: { glyph: "●", color: green, label: "passed" },
    none: { glyph: "—", color: muted, label: "no checks" },
};
const SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
function spinner() {
    return SPINNER[Math.floor(Date.now() / 120) % SPINNER.length] ?? "⠿";
}
function clip(value, max) {
    const text_ = value.replace(/\s+/g, " ").trim();
    return text_.length > max ? `${text_.slice(0, Math.max(1, max - 1))}…` : text_;
}
function shortenHome(path) {
    const home = process.env.HOME;
    return home && path.startsWith(home) ? `~${path.slice(home.length)}` : path;
}
function statusText(status) {
    if (status === "streaming")
        return green(`${spinner()} streaming`);
    if (status === "tool")
        return yellow("▸ running tool");
    return muted("· idle");
}
function ciBadge(checks) {
    const style = CI_STYLE[checks];
    return `${style.color(style.glyph)} ${style.color(style.label)}`;
}
function sumOutput(sessions) {
    return sessions.reduce((total, session) => total + session.output, 0);
}
function busiestDay(sessions) {
    const byDay = new Map();
    for (const session of sessions) {
        const label = new Date(session.lastActivity).toLocaleDateString("en-US", { weekday: "short" });
        byDay.set(label, (byDay.get(label) ?? 0) + 1);
    }
    let label = "—";
    let count = 0;
    for (const [key, value] of byDay) {
        if (value > count) {
            label = key;
            count = value;
        }
    }
    return { label, count };
}
export function sessionsBody(width, state, showBonsai = false) {
    const now = Date.now();
    const sessions = state.sessions;
    const total = sessions.length;
    const lastHour = sessions.filter((s) => now - s.lastActivity < 3_600_000).length;
    const liveNow = sessions.filter((s) => now - s.lastActivity < LIVE_SESSION_MS).length;
    const oldest = sessions.reduce((min, s) => Math.min(min, s.startedAt), now);
    const days = Math.max(1, (now - oldest) / DAY);
    const perDay = Math.round(total / days);
    const output = sumOutput(sessions);
    const spend = sessions.reduce((sum, s) => sum + s.cost, 0);
    const busiest = busiestDay(sessions);
    const avgOutput = Math.floor(output / Math.max(1, total));
    const stats = [
        `${text(bold(`${total}`))} ${muted("all")}  ·  ${text(`${lastHour}`)} ${muted("last hour")}  ·  ${text(`${perDay}`)}${muted("/day")}`,
        `${muted("tokens")} ${text(formatTokens(output))}  ·  ${muted("spend")} ${text(formatMoney(spend))}  ·  ${muted("live")} ${green(`${liveNow}`)}`,
        `${muted("busiest")} ${text(`${busiest.label} ${busiest.count}`)}  ·  ${muted("avg")} ${text(`${formatTokens(avgOutput)}/session`)}`,
    ];
    if (showBonsai) {
        return [...bonsaiLines(width - 4), bonsaiCaption(width - 4), "", ...stats];
    }
    const lastClose = sessions[0] ? formatAgo(sessions[0].lastActivity, now) : "—";
    return [...bigText(total.toLocaleString("en-US")).map((line) => pink(line)), "", ...stats, muted(`last close ${lastClose}`)];
}
export function fleetBody(width, state) {
    const totals = state.totals;
    const samples = state.rateSamples;
    const avg = samples.length ? samples.reduce((a, b) => a + b, 0) / samples.length : 0;
    const peak = samples.length ? Math.max(...samples) : 0;
    const contentWidth = Math.max(10, width - 4);
    const header = `${pink(bold(`${totals.tokensPerSec.toFixed(0)} tok/s`))}   ` +
        `${muted("avg")} ${text(avg.toFixed(0))}   ` +
        `${muted("peak")} ${text(peak.toFixed(0))}   ` +
        `${muted("tools")} ${text(`${totals.toolsPerMin.toFixed(0)}/min`)}   ` +
        `${phos(`${formatTokens(totals.tokensPerHour)}/h`)}`;
    const raw = sparkline(samples, contentWidth, pink);
    const avgLine = sparkline(movingAverage(samples, 10), contentWidth, purple);
    const weekStart = Date.now() - 7 * DAY;
    const started = state.sessions.filter((s) => s.startedAt >= weekStart).length;
    const liveSessions = state.sessions.filter((s) => Date.now() - s.lastActivity < LIVE_SESSION_MS).length;
    const aggregate = `${text(`${totals.sessions}`)} ${muted("sessions")}  ·  ${text(`${totals.liveAgents}`)} ${muted("working")}  ·  ${green(`${liveSessions}`)} ${muted("recent")}  |  ` +
        `${muted("1w")} ${text(`${started} started`)}  ${text(`${formatTokens(totals.outputTokens)} out`)}  ${text(`${totals.toolCalls} tools`)}`;
    const io = `${muted("in")} ${text(formatTokens(totals.inputTokens))}  ·  ` +
        `${muted("cache")} ${text(formatTokens(totals.cacheRead))}  ·  ` +
        `${muted("think")} ${text(formatTokens(totals.reasoningTokens))}  ·  ` +
        `${muted("spend")} ${text(formatMoney(totals.cost))}`;
    const legend = totals.perModel
        .slice(0, 4)
        .map((usage, index) => `${modelColor(index)("■")} ${text(usage.model)} ${muted(`×${Math.max(1, Math.round(usage.tokens / 10_000))}`)}`)
        .join("  ");
    return [
        header,
        raw,
        avgLine,
        muted(`${samples.length}s window · per second above, 10s average below`),
        aggregate,
        io,
        legend || muted("no model usage yet"),
    ];
}
/**
 * The agent rail: one row per unit of parallel work, showing its PR and CI at a
 * glance. Selecting a row drives the flow panel beside it.
 */
export function agentsBody(width, state, view = { selected: 0, mode: "flow" }) {
    const agents = state.agents;
    if (agents.length === 0)
        return { lines: [muted("no recent sessions")], hits: [] };
    const selected = Math.min(Math.max(0, view.selected), agents.length - 1);
    const lines = [];
    const hits = [];
    agents.forEach((agent, index) => {
        const isSelected = index === selected;
        const cursor = isSelected ? phosBright("▶") : " ";
        const spin = agent.status === "streaming" ? green(spinner()) : agent.status === "tool" ? yellow("▸") : muted("·");
        const name = isSelected ? phosBright(bold(clip(agent.name, 16))) : text(clip(agent.name, 16));
        const git = `${agent.ahead > 0 ? green(`↑${agent.ahead}`) : muted("↑0")}${agent.dirty > 0 ? amber(`±${agent.dirty}`) : ""}`;
        const pr = agent.pr ? `${phos(`#${agent.pr.number}`)} ${CI_STYLE[agent.pr.checks].color(CI_STYLE[agent.pr.checks].glyph)}` : muted("no PR");
        const row = `${cursor} ${spin} ${name}  ${git}  ${pr}`;
        lines.push(isSelected ? inverse(row) : row);
        hits.push(index);
    });
    // A sprig anchors the rail; it fills space that would otherwise pad.
    lines.push("");
    hits.push(undefined);
    for (const line of bonsaiCompactLines(width - 4)) {
        lines.push(line);
        hits.push(undefined);
    }
    return { lines, hits };
}
/** The check-list view: every CI action and whether it is running, waiting, or failed. */
function checksBody(width, work) {
    const pr = work?.pr;
    if (!pr)
        return [muted("no pull request for this branch")];
    const content = Math.max(20, width - 4);
    const order = { fail: 0, running: 1, pending: 2, skipped: 3, pass: 4 };
    const glyph = { fail: red("✗"), running: yellow("◐"), pending: muted("○"), skipped: muted("–"), pass: green("✓") };
    const label = {
        fail: red("failed"),
        running: yellow("running"),
        pending: muted("waiting"),
        skipped: muted("skipped"),
        pass: green("passed"),
    };
    const lines = [
        `${phos(bold(`#${pr.number}`))} ${text(clip(pr.title, content - 10))}`,
        `${ciBadge(pr.checks)}   ${muted("checks")} ${text(`${pr.checksPassed}/${pr.checksTotal}`)}   ${muted("running")} ${text(`${pr.checksRunning}`)}   ${muted("waiting")} ${text(`${pr.checksPending}`)}   ${muted("failed")} ${pr.checksFailed > 0 ? red(`${pr.checksFailed}`) : muted("0")}`,
        "",
    ];
    const sorted = [...pr.details].sort((a, b) => (order[a.state] ?? 9) - (order[b.state] ?? 9));
    for (const detail of sorted) {
        lines.push(`${glyph[detail.state] ?? muted("·")} ${text(detail.name.padEnd(18).slice(0, 18))} ${label[detail.state] ?? muted(detail.state)}`);
    }
    if (sorted.length === 0)
        lines.push(muted("no checks reported"));
    lines.push("");
    lines.push(pr.checksFailed > 0
        ? `${red(`${pr.checksFailed} failed`)} ${muted(`· ${clip(pr.failing.join(", "), content - 14)}`)}`
        : pr.pending.length > 0
            ? `${yellow(`${pr.pending.length} in flight`)} ${muted(`· ${clip(pr.pending.join(", "), content - 16)}`)}`
            : green("all checks clear"));
    return lines;
}
/** The flow panel: what the selected agent has done, what is left, and its PR. */
export function flowBody(width, work, mode = "flow") {
    if (!work)
        return [muted("no agent selected")];
    if (mode === "checks")
        return checksBody(width, work);
    const now = Date.now();
    const content = Math.max(20, width - 4);
    const lines = [];
    lines.push(`${phosBright(bold(work.name))}  ${work.model ? purple(work.model) : muted("—")}  ${statusText(work.status)}`);
    lines.push(`${muted("cwd")} ${text(shortenHome(work.cwd || "—"))}`);
    lines.push(`${muted("branch")} ${work.branch ? text(work.branch) : muted("(detached)")}   ${muted("up")} ${text(formatDuration(now - work.startedAt))}`);
    lines.push(border("── progress " + "─".repeat(Math.max(0, content - 13))));
    const changeSummary = work.insertions || work.deletions
        ? `${green(`+${work.insertions}`)} ${red(`-${work.deletions}`)}`
        : muted("no diff");
    lines.push(`${work.ahead > 0 ? green(`↑${work.ahead} ahead`) : muted("↑0 ahead")}   ` +
        `${work.dirty > 0 ? amber(`${work.dirty} uncommitted`) : green("clean tree")}   ${changeSummary}`);
    if (work.commits.length > 0) {
        for (const commit of work.commits.slice(0, 3)) {
            lines.push(`${muted(commit.sha)} ${text(clip(commit.subject, content - 9))}`);
        }
    }
    else {
        lines.push(muted("no commits on this branch yet"));
    }
    for (const file of work.changedFiles.slice(0, work.commits.length > 0 ? 2 : 4)) {
        lines.push(`${amber("±")} ${muted(clip(file, content - 4))}`);
    }
    lines.push(border("── pull request " + "─".repeat(Math.max(0, content - 17))));
    const pr = work.pr;
    if (pr) {
        lines.push(`${phos(bold(`#${pr.number}`))} ${text(clip(pr.title, content - 10))}`);
        lines.push(`${ciBadge(pr.checks)}   ${muted("checks")} ${text(`${pr.checksPassed}/${pr.checksTotal}`)}   ` +
            `${muted("running")} ${text(`${pr.checksRunning}`)}   ${muted("failed")} ${pr.checksFailed > 0 ? red(`${pr.checksFailed}`) : muted("0")}`);
        const bits = [`${muted("review")} ${text((pr.reviewDecision ?? "none").toLowerCase())}`, `${muted("state")} ${text(pr.state.toLowerCase())}`];
        if (pr.isDraft)
            bits.push(yellow("draft"));
        if (pr.armed)
            bits.push(green("armed to merge"));
        lines.push(bits.join("   "));
        if (pr.failing.length > 0)
            lines.push(`${red("✗")} ${red(clip(pr.failing.join(", "), content - 4))}`);
        else if (pr.pending.length > 0)
            lines.push(`${yellow("◐")} ${yellow(clip(pr.pending.join(", "), content - 4))}`);
    }
    else {
        lines.push(muted(work.branch ? "no pull request for this branch yet" : "not on a branch"));
    }
    lines.push(border("── activity " + "─".repeat(Math.max(0, content - 13))));
    lines.push(`${muted("last tool")} ${text(work.lastTool ?? "—")}   ${muted("turns")} ${text(`${work.turns}`)}   ` +
        `${muted("tokens")} ${text(formatTokens(work.tokens))}   ${muted("spend")} ${text(formatMoney(work.spend))}`);
    if (work.note)
        lines.push(`${muted("note")} ${border(clip(work.note, content - 7))}`);
    return lines;
}
export function modelsBody(width, state) {
    const models = state.totals.perModel;
    if (models.length === 0)
        return [muted("no model usage yet")];
    const max = Math.max(...models.map((m) => m.tokens), 1);
    const barWidth = Math.max(6, Math.min(14, width - 40));
    const lines = [];
    for (const [index, usage] of models.slice(0, 6).entries()) {
        const filled = Math.max(1, Math.round((usage.tokens / max) * barWidth));
        const bar = modelColor(index)("█".repeat(filled)) + muted("░".repeat(barWidth - filled));
        lines.push(`${modelColor(index)("■")} ${text(usage.model.padEnd(18).slice(0, 18))} ${bar} ${text(formatTokens(usage.tokens))} ${muted(formatMoney(usage.cost))}`);
    }
    const totals = state.totals;
    const cachePct = totals.inputTokens + totals.cacheRead > 0
        ? Math.round((totals.cacheRead / (totals.inputTokens + totals.cacheRead)) * 100)
        : 0;
    lines.push(`${muted("cache read")} ${text(formatTokens(totals.cacheRead))}  ·  ${muted("hit")} ${text(`${cachePct}%`)}  ·  ${muted("think")} ${text(formatTokens(totals.reasoningTokens))}`);
    lines.push(`${muted("total spend")} ${text(formatMoney(totals.cost))}`);
    return lines;
}
export function prsBody(width, state, limit = 8) {
    const prs = state.prs;
    if (prs.length === 0)
        return [muted(state.repo ? "no open pull requests" : "no pull requests (needs gh + a repo)")];
    const counts = { failed: 0, running: 0, waiting: 0, passed: 0, none: 0 };
    for (const pr of prs)
        counts[pr.checks]++;
    const armed = prs.filter((pr) => pr.armed).length;
    const open = prs.filter((pr) => pr.state === "OPEN").length;
    const stats = `${text(bold(`${open}`))} ${muted("open")}   ` +
        `${yellow(`${counts.running} running`)}   ${muted(`${counts.waiting} waiting`)}   ` +
        `${red(`${counts.failed} failed`)}   ${green(`${counts.passed} passed`)}   ${muted("armed")} ${phos(`${armed}`)}`;
    const contentWidth = Math.max(10, width - 4);
    const total = prs.length || 1;
    const segments = [
        { count: counts.passed, color: green },
        { count: counts.failed, color: red },
        { count: counts.running, color: yellow },
        { count: counts.waiting + counts.none, color: muted },
    ];
    const columns = [];
    let cumulative = 0;
    let segmentIndex = 0;
    let segmentEnd = (segments[0]?.count ?? 0) / total;
    for (let i = 0; i < contentWidth; i++) {
        const fraction = i / contentWidth;
        while (segmentIndex < segments.length - 1 && fraction >= segmentEnd) {
            segmentIndex++;
            cumulative += segments[segmentIndex - 1]?.count ?? 0;
            segmentEnd = (cumulative + (segments[segmentIndex]?.count ?? 0)) / total;
        }
        columns.push(segments[segmentIndex]?.color ?? muted);
    }
    const bar = [];
    let runColor = columns[0] ?? muted;
    let runLength = 0;
    for (const color of columns) {
        if (color === runColor)
            runLength++;
        else {
            bar.push(runColor("█".repeat(runLength)));
            runColor = color;
            runLength = 1;
        }
    }
    if (runLength > 0)
        bar.push(runColor("█".repeat(runLength)));
    const lines = [stats, bar.join("")];
    for (const pr of prs.slice(0, Math.max(2, limit))) {
        const style = CI_STYLE[pr.checks];
        const detail = pr.failing.length > 0 ? red(` ✗${pr.failing.length}`) : pr.checksRunning > 0 ? yellow(` ◐${pr.checksRunning}`) : "";
        const branch = pr.branch ? muted(` ${clip(pr.branch, 22)}`) : "";
        lines.push(`${style.color(style.glyph)} ${muted(`#${pr.number}`)} ${text(clip(pr.title, contentWidth - 16 - 24))}${branch}${detail}`);
    }
    return lines;
}
export function feedBody(width, state) {
    if (state.feed.length === 0)
        return [muted("no command activity yet")];
    const contentWidth = Math.max(20, width - 4);
    const lines = [];
    for (const item of state.feed.slice(0, 24)) {
        const time = border(formatClock(item.at));
        const agent = pink(item.agent);
        const rawPrefix = `${formatClock(item.at)} › ${item.agent}  `;
        const remaining = Math.max(8, contentWidth - rawPrefix.length);
        const command = item.text.length > remaining ? `${item.text.slice(0, remaining - 1)}…` : item.text;
        lines.push(`${time} ${border("›")} ${agent}  ${muted(command)}`);
    }
    return lines;
}
//# sourceMappingURL=panels.js.map