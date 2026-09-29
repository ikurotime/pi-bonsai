/** Shared data model for the dashboard. */

export interface SessionSummary {
	/** Session id from the JSONL header. */
	id: string;
	/** Absolute path to the session file. */
	file: string;
	/** Working directory the session was started in. */
	cwd: string;
	/** Display name set via `/name` (session_info entry), if any. */
	name?: string;
	/** Epoch ms: session header timestamp. */
	startedAt: number;
	/** Epoch ms: timestamp of the most recent entry. */
	lastActivity: number;
	/** Most recently used provider/model. */
	provider?: string;
	model?: string;
	/** Token accounting across all entries. */
	input: number;
	output: number;
	reasoning: number;
	cacheRead: number;
	cacheWrite: number;
	cost: number;
	/** Counts. */
	toolCalls: number;
	userTurns: number;
	assistantMessages: number;
}

export interface AgentProcess {
	/** Operating system process id. */
	pid: number;
	parentPid: number;
	/** Human-readable label (session name, agent name, or binary). */
	name: string;
	model?: string;
	sessionId?: string;
	cwd?: string;
	/** Coarse state derived from process + session activity. */
	status: "streaming" | "tool" | "idle";
	/** Last observed activity, if known. */
	detail?: string;
	/** Epoch ms when the process started, when known. */
	startedAt?: number;
}

export interface PullRequest {
	number: number;
	title: string;
	state: string;
	isDraft: boolean;
	reviewDecision?: string;
	mergeable?: string;
	checks: "green" | "red" | "running" | "none";
	armed: boolean;
	updatedAt: string;
	url: string;
}

export interface FeedItem {
	at: number;
	agent: string;
	kind: string;
	text: string;
}

export interface ModelUsage {
	model: string;
	tokens: number;
	cost: number;
}

export interface FleetTotals {
	sessions: number;
	liveAgents: number;
	outputTokens: number;
	inputTokens: number;
	reasoningTokens: number;
	cacheRead: number;
	cost: number;
	toolCalls: number;
	/** Output tokens per second, computed from the rate sampler. */
	tokensPerSec: number;
	avgTokensPerSec: number;
	peakTokensPerSec: number;
	toolsPerMin: number;
	tokensPerHour: number;
	perModel: ModelUsage[];
}

export interface DashboardState {
	generatedAt: number;
	repo?: string;
	sessions: SessionSummary[];
	agents: AgentProcess[];
	prs: PullRequest[];
	feed: FeedItem[];
	totals: FleetTotals;
	/** Rolling samples of output tokens/second for the sparkline. */
	rateSamples: number[];
	errors: string[];
}

export interface DashboardConfig {
	/** Directories to scan for session JSONL files. */
	sessionDirs: string[];
	/** Repository used for the pull-request panel. */
	repo?: string;
	/** Poll interval in milliseconds. */
	intervalMs: number;
	/** A session is considered live if active within this window. */
	liveWindowMs: number;
	/** Max feed items to keep. */
	feedLimit: number;
	/** Generate synthetic data instead of reading disk. */
	demo: boolean;
}
