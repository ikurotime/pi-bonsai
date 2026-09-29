/** Body builders for each dashboard panel. */

import { formatAgo, formatClock, formatDuration, formatMoney, formatTokens } from "../format.js";
import { bold, border, cyan, green, modelColor, muted, pink, purple, red, text, yellow } from "../theme.js";
import type { DashboardState, SessionSummary } from "../types.js";
import { bigText } from "./bigdigits.js";
import { BONSAI_WIDTH, bonsaiCaption, bonsaiLines } from "./bonsai.js";
import { movingAverage, sparkline } from "./sparkline.js";

const DAY = 86_400_000;
const LIVE_SESSION_MS = 120_000;

function sumOutput(sessions: SessionSummary[]): number {
	return sessions.reduce((total, session) => total + session.output, 0);
}

function busiestDay(sessions: SessionSummary[]): { label: string; count: number } {
	const byDay = new Map<string, number>();
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

export function sessionsBody(width: number, state: DashboardState, showBonsai = false): string[] {
	const now = Date.now();
	const sessions = state.sessions;
	const total = sessions.length;
	const lastHour = sessions.filter((s) => now - s.lastActivity < 3_600_000).length;
	const liveNow = sessions.filter((s) => now - s.lastActivity < LIVE_SESSION_MS).length;
	const oldest = sessions.reduce((min, s) => Math.min(min, s.startedAt), now);
	const days = Math.max(1, (now - oldest) / DAY);
	const perDay = Math.round(total / days);
	const lastClose = sessions[0] ? formatAgo(sessions[0].lastActivity, now) : "—";
	const output = sumOutput(sessions);
	const spend = sessions.reduce((sum, s) => sum + s.cost, 0);
	const busiest = busiestDay(sessions);
	const avgOutput = Math.floor(output / Math.max(1, total));
	const big = bigText(total.toLocaleString("en-US"));
	const lines = [
		...big.map((line) => pink(line)),
		"",
		`${text(bold(`${total}`))} ${muted("all")}  ·  ${text(`${lastHour}`)} ${muted("last hour")}  ·  ${text(`${perDay}`)}${muted("/day")}`,
		`${muted("last close")} ${text(lastClose)}  ·  ${muted("live")} ${green(`${liveNow}`)}`,
		`${muted("tokens")} ${text(formatTokens(output))}  ·  ${muted("spend")} ${text(formatMoney(spend))}`,
		`${muted("busiest")} ${text(`${busiest.label} ${busiest.count}`)}  ·  ${muted("avg")} ${text(`${formatTokens(avgOutput)}/session`)}`,
	];

	if (showBonsai) {
		const pad = " ".repeat(Math.max(0, Math.floor((Math.max(0, width - 4) - BONSAI_WIDTH) / 2)));
		lines.push("", ...bonsaiLines().map((line) => pad + line), `${pad}${bonsaiCaption()}`);
	}
	return lines;
}

export function fleetBody(width: number, state: DashboardState): string[] {
	const totals = state.totals;
	const samples = state.rateSamples;
	const avg = samples.length ? samples.reduce((a, b) => a + b, 0) / samples.length : 0;
	const peak = samples.length ? Math.max(...samples) : 0;
	const contentWidth = Math.max(10, width - 4);

	const header =
		`${pink(bold(`${totals.tokensPerSec.toFixed(0)} tok/s`))}   ` +
		`${muted("avg")} ${text(avg.toFixed(0))}   ` +
		`${muted("peak")} ${text(peak.toFixed(0))}   ` +
		`${muted("tools")} ${text(`${totals.toolsPerMin.toFixed(0)}/min`)}   ` +
		`${cyan(`${formatTokens(totals.tokensPerHour)} tokens/h`)}`;

	const raw = sparkline(samples, contentWidth, pink);
	const avgLine = sparkline(movingAverage(samples, 10), contentWidth, purple);

	const weekStart = Date.now() - 7 * DAY;
	const started = state.sessions.filter((s) => s.startedAt >= weekStart).length;
	const liveSessions = state.sessions.filter((s) => Date.now() - s.lastActivity < LIVE_SESSION_MS).length;
	const aggregate =
		`${text(`${totals.sessions}`)} ${muted("sessions")}  ·  ${text(`${totals.liveAgents}`)} ${muted("agents")}  ·  ${green(`${liveSessions}`)} ${muted("streaming")}  |  ` +
		`${muted("1w")} ${text(`${started} started`)}  ${text(`${formatTokens(totals.outputTokens)} out`)}  ${text(`${totals.toolCalls} tools`)}`;

	const io =
		`${muted("in")} ${text(formatTokens(totals.inputTokens))}  ·  ` +
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

const STATUS_STYLE: Record<string, (s: string) => string> = {
	streaming: green,
	tool: yellow,
	idle: muted,
};

export function agentsBody(width: number, state: DashboardState): string[] {
	const agents = state.agents;
	if (agents.length === 0) return [muted("no live pi processes detected")];

	const now = Date.now();
	const byPid = new Map(agents.map((a) => [a.pid, a]));
	const roots = agents.filter((a) => !byPid.has(a.parentPid));
	const childrenOf = (pid: number) => agents.filter((a) => a.parentPid === pid);
	const lines: string[] = [];
	const MAX = 14;
	let shown = 0;

	const renderAgent = (agent: (typeof agents)[number], depth: number) => {
		if (shown >= MAX) return;
		shown++;
		const branch = depth === 0 ? pink("▍") : muted("└");
		const indent = "  ".repeat(depth);
		const status = STATUS_STYLE[agent.status]?.(agent.status) ?? muted(agent.status);
		const model = agent.model ? purple(agent.model) : muted("—");
		const up = agent.startedAt ? `${muted("up")} ${text(formatDuration(now - agent.startedAt))}` : "";
		const pid = muted(`pid ${agent.pid}`);
		const detail = agent.detail ? border(agent.detail) : "";
		lines.push(`${indent}${branch} ${bold(text(agent.name))}  ${model}  ${status}  ${pid}  ${up}  ${detail}`);
	};

	for (const root of roots) {
		renderAgent(root, 0);
		for (const child of childrenOf(root.pid)) renderAgent(child, 1);
	}
	const hidden = agents.length - shown;
	if (hidden > 0) lines.push(muted(`… ${hidden} more`));
	return lines;
}

export function modelsBody(width: number, state: DashboardState): string[] {
	const models = state.totals.perModel;
	if (models.length === 0) return [muted("no model usage yet")];
	const max = Math.max(...models.map((m) => m.tokens), 1);
	const barWidth = Math.max(6, Math.min(14, width - 40));
	const lines: string[] = [];
	for (const [index, usage] of models.slice(0, 6).entries()) {
		const filled = Math.max(1, Math.round((usage.tokens / max) * barWidth));
		const bar = modelColor(index)("█".repeat(filled)) + muted("░".repeat(barWidth - filled));
		lines.push(
			`${modelColor(index)("■")} ${text(usage.model.padEnd(18).slice(0, 18))} ${bar} ${text(formatTokens(usage.tokens))} ${muted(formatMoney(usage.cost))}`,
		);
	}
	const totals = state.totals;
	const cachePct =
		totals.inputTokens + totals.cacheRead > 0
			? Math.round((totals.cacheRead / (totals.inputTokens + totals.cacheRead)) * 100)
			: 0;
	lines.push(
		`${muted("cache read")} ${text(formatTokens(totals.cacheRead))}  ·  ${muted("hit")} ${text(`${cachePct}%`)}  ·  ${muted("think")} ${text(formatTokens(totals.reasoningTokens))}`,
	);
	lines.push(`${muted("total spend")} ${text(formatMoney(totals.cost))}`);
	return lines;
}

const CHECK_STYLE: Record<string, { glyph: string; color: (s: string) => string }> = {
	green: { glyph: "✓", color: green },
	red: { glyph: "✗", color: red },
	running: { glyph: "◐", color: yellow },
	none: { glyph: "•", color: muted },
};

export function prsBody(width: number, state: DashboardState): string[] {
	const prs = state.prs;
	if (prs.length === 0) {
		return [muted("no pull requests (needs gh + a repo)")];
	}
	const counts = { green: 0, red: 0, running: 0, none: 0 };
	for (const pr of prs) counts[pr.checks]++;
	const armed = prs.filter((pr) => pr.armed).length;
	const open = prs.filter((pr) => pr.state === "OPEN").length;
	const drafts = prs.filter((pr) => pr.isDraft).length;
	const approved = prs.filter((pr) => pr.reviewDecision === "APPROVED").length;

	const stats =
		`${text(bold(`${open}`))} ${muted("open")}   ` +
		`${green(`${counts.green} green`)}   ${red(`${counts.red} red`)}   ` +
		`${yellow(`${counts.running} running`)}   ${muted("armed")} ${pink(`${armed}`)}`;

	const meta =
		`${muted("approved")} ${text(`${approved}`)}  ·  ${muted("draft")} ${text(`${drafts}`)}  ·  ${muted("total")} ${text(`${prs.length}`)}`;

	const contentWidth = Math.max(10, width - 4);
	const total = prs.length || 1;
	const segments: Array<{ count: number; color: (s: string) => string }> = [
		{ count: counts.green, color: green },
		{ count: counts.red, color: red },
		{ count: counts.running, color: yellow },
		{ count: counts.none, color: muted },
	];
	// Assign exactly one column per character using cumulative proportions.
	const columns: Array<(s: string) => string> = [];
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
	const bar: string[] = [];
	let runColor = columns[0] ?? muted;
	let runLength = 0;
	for (const color of columns) {
		if (color === runColor) {
			runLength++;
		} else {
			bar.push(runColor("█".repeat(runLength)));
			runColor = color;
			runLength = 1;
		}
	}
	if (runLength > 0) bar.push(runColor("█".repeat(runLength)));
	const lines = [stats, bar.join(""), meta];
	for (const pr of prs.slice(0, Math.max(2, contentWidth > 40 ? 8 : 4))) {
		const style = CHECK_STYLE[pr.checks] ?? CHECK_STYLE.none;
		if (!style) continue;
		const glyph = style.color(style.glyph);
		const number = muted(`#${pr.number}`);
		const title = text(pr.title);
		lines.push(`${glyph} ${number} ${title}`);
	}
	return lines;
}

export function feedBody(width: number, state: DashboardState): string[] {
	if (state.feed.length === 0) return [muted("no command activity yet")];
	const contentWidth = Math.max(20, width - 4);
	const lines: string[] = [];
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
