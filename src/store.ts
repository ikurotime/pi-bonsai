/** Aggregates collectors into a single dashboard state and samples throughput. */

import path from "node:path";
import { gitLog, gitStatus } from "./collectors/git.js";
import { scanProcesses } from "./collectors/processes.js";
import { resolveRepoName, scanPullRequests } from "./collectors/prs.js";
import { scanSessions } from "./collectors/sessions.js";
import { demoData } from "./demo.js";
import type {
	AgentProcess,
	AgentWork,
	DashboardConfig,
	DashboardState,
	FeedItem,
	FleetTotals,
	GitCommit,
	GitStatus,
	ModelUsage,
	PullRequest,
	SessionSummary,
} from "./types.js";

const RATE_SAMPLES = 120;
const LIVE_WINDOW_DEFAULT = 120_000;
const WORK_WINDOW_DEFAULT = 6 * 60 * 60 * 1000;
const GIT_TTL_MS = 4_000;
const MAX_AGENTS = 16;

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

function computeTotals(sessions: SessionSummary[], agents: AgentWork[], rates: { tps: number; toolsPerMin: number }): FleetTotals {
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
	totals.liveAgents = agents.filter((agent) => agent.status !== "idle").length;
	totals.perModel = [...byModel.values()].sort((a, b) => b.tokens - a.tokens);
	totals.tokensPerSec = rates.tps;
	totals.toolsPerMin = rates.toolsPerMin;
	totals.tokensPerHour = rates.tps * 3600;
	return totals;
}

const norm = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "");

export class DashboardStore {
	private state: DashboardState;
	private last?: { t: number; output: number; tools: number };
	private repoName?: string;
	private listeners = new Set<(state: DashboardState) => void>();
	private timer?: ReturnType<typeof setInterval>;
	private polling = false;
	private rateSamples: number[] = [];
	private gitCache = new Map<string, { at: number; status?: GitStatus; commits: GitCommit[] }>();

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

	/** Best-effort git state, cached briefly so a 1s poll stays cheap. */
	private async gitFor(cwd: string): Promise<{ status?: GitStatus; commits: GitCommit[] }> {
		const cached = this.gitCache.get(cwd);
		const now = Date.now();
		if (cached && now - cached.at < GIT_TTL_MS) return cached;
		const [status, commits] = await Promise.all([gitStatus(cwd), gitLog(cwd, 10)]);
		const entry = { at: now, status, commits };
		this.gitCache.set(cwd, entry);
		if (this.gitCache.size > 64) {
			const oldest = [...this.gitCache.entries()].sort((a, b) => a[1].at - b[1].at)[0];
			if (oldest) this.gitCache.delete(oldest[0]);
		}
		return entry;
	}

	/** Join sessions, processes, git, and PRs into one record per unit of work. */
	private async buildAgents(
		sessions: SessionSummary[],
		processes: AgentProcess[],
		prs: PullRequest[],
	): Promise<AgentWork[]> {
		const now = Date.now();
		const byName = new Map<string, AgentProcess>();
		for (const process_ of processes) byName.set(norm(process_.name), process_);

		const works: AgentWork[] = [];
		const usedPids = new Set<number>();
		const recent = sessions.filter((session) => now - session.lastActivity < this.config.workWindowMs).slice(0, MAX_AGENTS);

		for (const session of recent) {
			const key = norm(session.name ?? "");
			let process_ = key ? byName.get(key) : undefined;
			if (!process_ && session.cwd) process_ = processes.find((p) => p.cwd && p.cwd === session.cwd);
			if (process_) usedPids.add(process_.pid);

			const git = session.cwd ? await this.gitFor(session.cwd) : { commits: [] as GitCommit[] };
			const branch = git.status?.branch;
			const pr = branch ? prs.find((candidate) => candidate.branch === branch) : undefined;
			const status: AgentWork["status"] = process_?.status ?? (now - session.lastActivity < 30_000 ? "streaming" : "idle");

			works.push({
				id: session.id,
				name: session.name ?? (session.cwd ? path.basename(session.cwd) : session.id.slice(0, 8)),
				pid: process_?.pid,
				status,
				model: session.model ?? process_?.model,
				cwd: session.cwd,
				branch,
				ahead: git.status?.ahead ?? 0,
				behind: git.status?.behind ?? 0,
				dirty: git.status?.dirty ?? 0,
				changedFiles: git.status?.files ?? [],
				insertions: git.status?.insertions ?? 0,
				deletions: git.status?.deletions ?? 0,
				commits: git.commits,
				pr,
				lastTool: session.lastTool,
				note: session.lastMessage,
				tokens: session.output,
				spend: session.cost,
				turns: session.userTurns,
				startedAt: session.startedAt,
				lastActivity: session.lastActivity,
			});
		}

		// Live processes that did not pair with a session still belong in the rail.
		for (const process_ of processes) {
			if (usedPids.has(process_.pid)) continue;
			const git = process_.cwd ? await this.gitFor(process_.cwd) : { commits: [] as GitCommit[] };
			const branch = git.status?.branch;
			works.push({
				id: `pid-${process_.pid}`,
				name: process_.name,
				pid: process_.pid,
				status: process_.status,
				model: process_.model,
				cwd: process_.cwd ?? "",
				branch,
				ahead: git.status?.ahead ?? 0,
				behind: git.status?.behind ?? 0,
				dirty: git.status?.dirty ?? 0,
				changedFiles: git.status?.files ?? [],
				insertions: git.status?.insertions ?? 0,
				deletions: git.status?.deletions ?? 0,
				commits: git.commits,
				pr: branch ? prs.find((candidate) => candidate.branch === branch) : undefined,
				note: process_.detail,
				tokens: 0,
				spend: 0,
				turns: 0,
				startedAt: process_.startedAt ?? now,
				lastActivity: now,
			});
		}

		const rank = (agent: AgentWork) => (agent.status === "streaming" ? 0 : agent.status === "tool" ? 1 : 2);
		works.sort((a, b) => rank(a) - rank(b) || b.lastActivity - a.lastActivity);
		return works.slice(0, MAX_AGENTS);
	}

	private async collect(): Promise<{
		sessions: SessionSummary[];
		agents: AgentWork[];
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
		const [processes, prs] = await Promise.all([scanProcesses(), scanPullRequests(this.config.repo)]);
		const agents = await this.buildAgents(sessions, processes, prs);
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
		workWindowMs: overrides.workWindowMs ?? WORK_WINDOW_DEFAULT,
		feedLimit: overrides.feedLimit ?? 40,
		demo: overrides.demo ?? false,
	};
}
