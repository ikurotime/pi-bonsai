/** Aggregates collectors into a single dashboard state and samples throughput. */

import { scanProcesses } from "./collectors/processes.js";
import { resolveRepoName, scanPullRequests } from "./collectors/prs.js";
import { scanSessions } from "./collectors/sessions.js";
import { demoData } from "./demo.js";
import type {
	AgentProcess,
	DashboardConfig,
	DashboardState,
	FeedItem,
	FleetTotals,
	ModelUsage,
	PullRequest,
	SessionSummary,
} from "./types.js";

const RATE_SAMPLES = 120;
const LIVE_WINDOW_DEFAULT = 120_000;

function emptyTotals(): FleetTotals {
	return {
		sessions: 0,
		liveAgents: 0,
		outputTokens: 0,
		inputTokens: 0,
		reasoningTokens: 0,
		cacheRead: 0,
		cost: 0,
		toolCalls: 0,
		tokensPerSec: 0,
		avgTokensPerSec: 0,
		peakTokensPerSec: 0,
		toolsPerMin: 0,
		tokensPerHour: 0,
		perModel: [],
	};
}

function computeTotals(
	sessions: SessionSummary[],
	agents: AgentProcess[],
	rates: { tps: number; toolsPerMin: number },
): FleetTotals {
	const totals = emptyTotals();
	const byModel = new Map<string, ModelUsage>();
	for (const session of sessions) {
		totals.sessions++;
		totals.inputTokens += session.input;
		totals.outputTokens += session.output;
		totals.reasoningTokens += session.reasoning;
		totals.cacheRead += session.cacheRead;
		totals.cost += session.cost;
		totals.toolCalls += session.toolCalls;
		const model = session.model ?? "unknown";
		const usage = byModel.get(model) ?? { model, tokens: 0, cost: 0 };
		usage.tokens += session.output;
		usage.cost += session.cost;
		byModel.set(model, usage);
	}
	totals.liveAgents = agents.length;
	totals.perModel = [...byModel.values()].sort((a, b) => b.tokens - a.tokens);
	totals.tokensPerSec = rates.tps;
	totals.toolsPerMin = rates.toolsPerMin;
	totals.tokensPerHour = rates.tps * 3600;
	return totals;
}

export class DashboardStore {
	private state: DashboardState;
	private last?: { t: number; output: number; tools: number };
	private repoName?: string;
	private listeners = new Set<(state: DashboardState) => void>();
	private timer?: ReturnType<typeof setInterval>;
	private polling = false;
	private rateSamples: number[] = [];

	constructor(private readonly config: DashboardConfig) {
		this.state = {
			generatedAt: 0,
			repo: config.repo,
			sessions: [],
			agents: [],
			prs: [],
			feed: [],
			totals: emptyTotals(),
			rateSamples: [],
			errors: [],
		};
	}

	getState(): DashboardState {
		return this.state;
	}

	subscribe(listener: (state: DashboardState) => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	start(): void {
		void this.poll();
		this.timer = setInterval(() => void this.poll(), this.config.intervalMs);
	}

	stop(): void {
		if (this.timer) clearInterval(this.timer);
		this.timer = undefined;
	}

	async poll(): Promise<void> {
		if (this.polling) return;
		this.polling = true;
		try {
			const { sessions, agents, prs, feed, errors } = await this.collect();
			const rates = this.sample(sessions);
			this.state = {
				generatedAt: Date.now(),
				repo: this.repoName ?? this.config.repo,
				sessions,
				agents,
				prs,
				feed,
				totals: computeTotals(sessions, agents, rates),
				rateSamples: [...this.rateSamples],
				errors,
			};
			for (const listener of this.listeners) listener(this.state);
		} finally {
			this.polling = false;
		}
	}

	private sample(sessions: SessionSummary[]): { tps: number; toolsPerMin: number } {
		let output = 0;
		let tools = 0;
		for (const session of sessions) {
			output += session.output;
			tools += session.toolCalls;
		}
		const now = Date.now();
		let tps = 0;
		let toolsPerMin = 0;
		if (this.last) {
			const dt = Math.max(0.2, (now - this.last.t) / 1000);
			tps = Math.max(0, (output - this.last.output) / dt);
			toolsPerMin = Math.max(0, ((tools - this.last.tools) / dt) * 60);
		}
		this.last = { t: now, output, tools };
		this.rateSamples.push(tps);
		if (this.rateSamples.length > RATE_SAMPLES) this.rateSamples.shift();
		return { tps, toolsPerMin };
	}

	private async collect(): Promise<{
		sessions: SessionSummary[];
		agents: AgentProcess[];
		prs: PullRequest[];
		feed: FeedItem[];
		errors: string[];
	}> {
		if (this.config.demo) {
			const demo = demoData();
			return { ...demo, errors: [] };
		}

		const errors: string[] = [];
		const { sessions, feed } = await scanSessions(this.config.sessionDirs, this.config.feedLimit);
		if (sessions.length === 0) {
			errors.push(`No sessions found in ${this.config.sessionDirs.join(", ")}`);
		}
		const agents = await scanProcesses();
		const prs = await scanPullRequests(this.config.repo);
		if (!this.repoName && this.config.repo !== undefined) {
			this.repoName = await resolveRepoName(this.config.repo);
		}
		return { sessions, agents, prs, feed, errors };
	}
}

export function buildConfig(overrides: Partial<DashboardConfig> = {}): DashboardConfig {
	return {
		sessionDirs: overrides.sessionDirs ?? [],
		repo: overrides.repo,
		intervalMs: overrides.intervalMs ?? 1000,
		liveWindowMs: overrides.liveWindowMs ?? LIVE_WINDOW_DEFAULT,
		feedLimit: overrides.feedLimit ?? 40,
		demo: overrides.demo ?? false,
	};
}
