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
	/** Name of the most recent tool call. */
	lastTool?: string;
	/** Text of the most recent assistant message, for a quick "what's left" read. */
	lastMessage?: string;
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

export interface GitCommit {
	sha: string;
	subject: string;
	/** Epoch ms. */
	at: number;
}

export interface GitStatus {
	branch?: string;
	upstream?: string;
	ahead: number;
	behind: number;
	/** Count of modified/untracked files. */
	dirty: number;
	/** Paths of modified/untracked files. */
	files: string[];
	insertions: number;
	deletions: number;
}

/** CI status of a pull request, in the terms an operator cares about. */
export type CheckState = "failed" | "running" | "waiting" | "passed" | "none";

export interface CheckDetail {
	name: string;
	state: "pass" | "fail" | "running" | "pending" | "skipped";
}

export interface PullRequest {
	number: number;
	title: string;
	state: string;
	isDraft: boolean;
	/** Head branch, used to pair the PR with the agent working on it. */
	branch?: string;
	reviewDecision?: string;
	mergeable?: string;
	checks: CheckState;
	checksTotal: number;
	checksPassed: number;
	checksFailed: number;
	checksRunning: number;
	checksPending: number;
	/** Names of failing checks. */
	failing: string[];
	/** Names of running/pending checks. */
	pending: string[];
	/** Every check, in report order, for the check-list view. */
	details: CheckDetail[];
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

/**
 * One unit of parallel work: a pi session paired with its process, git branch,
 * and the pull request that branch opened.
 */
export interface AgentWork {
	id: string;
	name: string;
	pid?: number;
	status: "streaming" | "tool" | "idle";
	model?: string;
	cwd: string;
	branch?: string;
	ahead: number;
	behind: number;
	dirty: number;
	changedFiles: string[];
	insertions: number;
	deletions: number;
	commits: GitCommit[];
	pr?: PullRequest;
	lastTool?: string;
	note?: string;
	tokens: number;
	spend: number;
	turns: number;
	startedAt: number;
	lastActivity: number;
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
	agents: AgentWork[];
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
	/** How recently a session must be active to appear in the agent rail. */
	workWindowMs: number;
	/** Max feed items to keep. */
	feedLimit: number;
	/** Generate synthetic data instead of reading disk. */
	demo: boolean;
}
