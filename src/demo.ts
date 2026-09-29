/** Synthetic data so `pi-crtree --demo` works without any live pi activity. */

import type { AgentProcess, FeedItem, PullRequest, SessionSummary } from "./types.js";

const MODELS = ["glm-5.3", "claude-opus-5.5", "glm-5.2", "claude-sonnet-4.5"];
const NAMES = ["p3-rated", "fixwave2", "wave10", "p3-rated>fix2e", "p3-rated>fix2h", "ci-triage"];

let tick = 0;
let liveOutput = 12_000;
let liveTools = 320;

interface DemoBundle {
	sessions: SessionSummary[];
	agents: AgentProcess[];
	prs: PullRequest[];
	feed: FeedItem[];
}

export function demoData(): DemoBundle {
	tick++;
	liveOutput += 180 + Math.floor(Math.random() * 900);
	liveTools += Math.random() < 0.5 ? 1 : 0;
	const now = Date.now();

	const sessions: SessionSummary[] = [];
	for (let i = 0; i < 9; i++) {
		const live = i < 4;
		const output = live ? Math.floor(liveOutput / (i + 1)) : 4_000 + i * 21_000;
		sessions.push({
			id: `demo${i}${"abcdef".slice(0, 6)}`,
			file: `/demo/session-${i}.jsonl`,
			cwd: `/Users/kuro/Development/hermes-${i}`,
			name: live ? NAMES[i % NAMES.length] : undefined,
			startedAt: now - (live ? 120_000 + i * 30_000 : 86_400_000 * (i + 1)),
			lastActivity: live ? now - i * 4_000 : now - (i + 1) * 3_600_000,
			provider: "nan",
			model: MODELS[i % MODELS.length],
			input: output * 6,
			output,
			reasoning: live ? Math.floor(output * 0.4) : 0,
			cacheRead: output * 3,
			cacheWrite: output,
			cost: 0.02 + i * 0.031,
			toolCalls: live ? Math.floor(liveTools / (i + 1)) : 40 + i * 55,
			userTurns: 3 + i,
			assistantMessages: 6 + i * 2,
		});
	}

	const agents: AgentProcess[] = [
		{
			pid: 41001,
			parentPid: 40000,
			name: "p3 rated",
			model: MODELS[0],
			status: "streaming",
			detail: "receiving stream response",
			startedAt: now - 600_000,
		},
		{
			pid: 41002,
			parentPid: 41001,
			name: "fix2e",
			model: MODELS[0],
			status: "tool",
			detail: "terminal command running (10s elapsed)",
			startedAt: now - 300_000,
		},
		{
			pid: 41003,
			parentPid: 41001,
			name: "fix2h",
			model: MODELS[0],
			status: "tool",
			detail: "grep -n 'kind' apps/desktop/src/plugins/h...",
			startedAt: now - 240_000,
		},
		{
			pid: 41004,
			parentPid: 40000,
			name: "wave10",
			model: MODELS[1],
			status: "streaming",
			detail: "receiving stream response",
			startedAt: now - 420_000,
		},
	];

	const feed: FeedItem[] = [
		{
			at: now - 2_000,
			agent: "p3 rated>#118216",
			kind: "bash",
			text: "cd /Users/kuro/Development/hermes-agent && git show 6ec517c475:apps/desktop/package.json",
		},
		{
			at: now - 6_000,
			agent: "p3 rated>fix2f",
			kind: "bash",
			text: "cd /Users/kuro/Development/hermes-waves/fix2f && grep -n 'kind' apps/desktop/src/plugins/h",
		},
		{
			at: now - 14_000,
			agent: "wave10>ci",
			kind: "bash",
			text: "cd /Users/kuro/Development/hermes && pnpm -w test --filter desktop",
		},
	];

	const prs: PullRequest[] = Array.from({ length: 12 }, (_, i) => {
		const roll = i % 4;
		return {
			number: 122000 + i * 44,
			title: [
				"fix(desktop): statusbar timer shows focus-since on…",
				"fix(desktop): portal dropdown submenu into the pa…",
				"Desktop: archived sessions reappear in the…",
				"fix(desktop): let the boot-failure overlay be dism…",
			][roll] as string,
			state: "OPEN",
			isDraft: false,
			reviewDecision: roll === 0 ? "APPROVED" : undefined,
			mergeable: "MERGEABLE",
			checks: roll === 3 ? "red" : "green",
			armed: roll === 0,
			updatedAt: new Date(now - i * 900_000).toISOString(),
			url: `https://github.com/ikurotime/hermes/pull/${122000 + i * 44}`,
		};
	});

	return { sessions, agents, prs, feed };
}
