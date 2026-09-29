/** Body builders for each dashboard panel. */

import { formatAgo, formatClock, formatMoney, formatTokens } from "../format.js";
import { bold, border, cyan, green, modelColor, muted, pink, purple, red, text, yellow } from "../theme.js";
import type { DashboardState } from "../types.js";
import { bigText } from "./bigdigits.js";
import { BONSAI_WIDTH, bonsaiCaption, bonsaiLines } from "./bonsai.js";
import { movingAverage, sparkline } from "./sparkline.js";

const DAY = 86_400_000;

export function sessionsBody(width: number, state: DashboardState, showBonsai = false): string[] {
	const now = Date.now();
	const total = state.sessions.length;
	const lastHour = state.sessions.filter((s) => now - s.lastActivity < 3_600_000).length;
	const oldest = state.sessions.reduce((min, s) => Math.min(min, s.startedAt), now);
	const days = Math.max(1, (now - oldest) / DAY);
	const perDay = Math.round(total / days);
	const lastClose = state.sessions[0] ? formatAgo(state.sessions[0].lastActivity, now) : "—";
	const big = bigText(total.toLocaleString("en-US"));
	const lines = [
		...big.map((line) => pink(line)),
		"",
		`${text(bold(`${total}`))} ${muted("all")}  ·  ${text(`${lastHour}`)} ${muted("last hour")}  ·  ${text(`${perDay}`)}${muted("/day")}`,
		muted(`last close ${lastClose}`),
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
	const aggregate =
		`${text(`${totals.sessions}`)} ${muted("sessions")}  ·  ${text(`${totals.liveAgents}`)} ${muted("agents live")}  |  ` +
		`${muted("1w")} ${text(`${started} started`)}  ${text(`${formatTokens(totals.outputTokens)} tokens`)}  ${text(`${totals.toolCalls} tools`)}`;

	const legend = totals.perModel
		.slice(0, 4)
		.map((usage, index) => `${modelColor(index)("■")} ${text(usage.model)} ${muted(`×${Math.max(1, Math.round(usage.tokens / 10_000))}`)}`)
		.join("  ");

	return [
		header,
		raw,
		avgLine,
		muted(`${samples.length}s · per second above, 10s average below`),
		aggregate,
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

	const byPid = new Map(agents.map((a) => [a.pid, a]));
	const roots = agents.filter((a) => !byPid.has(a.parentPid));
	const childrenOf = (pid: number) => agents.filter((a) => a.parentPid === pid);
	const lines: string[] = [];
	const MAX = 12;
	let shown = 0;

	const renderAgent = (agent: (typeof agents)[number], depth: number) => {
		if (shown >= MAX) return;
		shown++;
		const marker = depth === 0 ? pink("▍") : muted("└");
		const indent = "  ".repeat(depth);
		const status = STATUS_STYLE[agent.status]?.(agent.status) ?? muted(agent.status);
		const model = agent.model ? purple(agent.model) : muted("—");
		const detail = agent.detail ? muted(agent.detail) : "";
		lines.push(
			`${indent}${marker} ${bold(text(agent.name))}  ${model}  ${status}  ${detail}`,
		);
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
	const cachePct = totals.inputTokens + totals.cacheRead > 0
		? Math.round((totals.cacheRead / (totals.inputTokens + totals.cacheRead)) * 100)
		: 0;
	lines.push(
		muted(`cache hit ${cachePct}%  ·  reasoning ${formatTokens(totals.reasoningTokens)}  ·  total ${formatMoney(totals.cost)}`),
	);
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

	const stats =
		`${text(bold(`${open}`))} ${muted("open")}   ` +
		`${green(`${counts.green} green`)}   ${red(`${counts.red} red`)}   ` +
		`${yellow(`${counts.running} running`)}   ${muted("armed")} ${pink(`${armed}`)}`;

	const contentWidth = Math.max(10, width - 4);
	const total = prs.length || 1;
	const runs: Array<{ color: (s: string) => string; count: number }> = [];
	const push = (n: number, color: (s: string) => string) => {
		const count = Math.round((n / total) * contentWidth);
		if (count > 0) runs.push({ color, count });
	};
	push(counts.green, green);
	push(counts.red, red);
	push(counts.running, yellow);
	push(counts.none, muted);
	let used = runs.reduce((sum, run) => sum + run.count, 0);
	if (used < contentWidth) runs.push({ color: muted, count: contentWidth - used });
	const bar = runs.map((run) => run.color("█".repeat(run.count))).join("");
	const lines = [stats, bar, muted(`${prs.length} shown · ${drafts} draft · ${armed} armed to merge`)];
	for (const pr of prs.slice(0, Math.max(2, contentWidth > 40 ? 7 : 4))) {
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
	for (const item of state.feed.slice(0, 10)) {
		const time = border(formatClock(item.at));
		const agent = pink(item.agent);
		const rawPrefix = `${formatClock(item.at)} › ${item.agent}  `;
		const remaining = Math.max(8, contentWidth - rawPrefix.length);
		const command = item.text.length > remaining ? `${item.text.slice(0, remaining - 1)}…` : item.text;
		lines.push(`${time} ${border("›")} ${agent}  ${muted(command)}`);
	}
	return lines;
}
