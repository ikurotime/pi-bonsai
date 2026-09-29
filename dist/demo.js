/** Synthetic data so `pi-bonsai --demo` works without any live pi activity. */
const MODELS = ["glm-5.3", "claude-opus-5.5", "glm-5.2", "claude-sonnet-4.5"];
const NAMES = ["p3-rated", "fixwave2", "wave10", "p3-rated>fix2e", "p3-rated>fix2h", "ci-triage"];
let tick = 0;
let liveOutput = 12_000;
let liveTools = 320;
function commits(list) {
    const now = Date.now();
    return list.map(([sha, subject, minutesAgo]) => ({ sha, subject, at: now - minutesAgo * 60_000 }));
}
const CHECK_NAMES = [
    "build",
    "lint",
    "typecheck",
    "test (ubuntu)",
    "test (macos)",
    "test (windows)",
    "e2e (shard 1)",
    "e2e (shard 2)",
    "bundle-size",
    "codeql",
    "cla",
    "preview",
];
function makePr(number, title, branch, kind, overrides = {}) {
    const details = CHECK_NAMES.map((name) => ({ name, state: "pass" }));
    switch (kind) {
        case "running":
            details[9] = { name: CHECK_NAMES[9], state: "running" };
            details[7] = { name: CHECK_NAMES[7], state: "running" };
            details[11] = { name: CHECK_NAMES[11], state: "pending" };
            break;
        case "failed":
            details[3] = { name: CHECK_NAMES[3], state: "fail" };
            details[2] = { name: CHECK_NAMES[2], state: "fail" };
            details[8] = { name: CHECK_NAMES[8], state: "fail" };
            break;
        case "waiting":
            for (const detail of details)
                detail.state = "pending";
            break;
        case "none":
            details.length = 0;
            break;
        case "passed":
            break;
    }
    const pass = details.filter((d) => d.state === "pass").length;
    const fail = details.filter((d) => d.state === "fail");
    const running = details.filter((d) => d.state === "running");
    const pending = details.filter((d) => d.state === "pending");
    return {
        number,
        title,
        state: "OPEN",
        isDraft: false,
        branch,
        reviewDecision: kind === "passed" ? "APPROVED" : undefined,
        mergeable: "MERGEABLE",
        checks: kind,
        checksTotal: details.length,
        checksPassed: pass,
        checksFailed: fail.length,
        checksRunning: running.length,
        checksPending: pending.length,
        failing: fail.map((d) => d.name),
        pending: [...running, ...pending].map((d) => d.name),
        details,
        armed: false,
        updatedAt: new Date(Date.now() - number * 60_000).toISOString(),
        url: `https://github.com/ikurotime/hermes/pull/${number}`,
        ...overrides,
    };
}
export function demoData() {
    tick++;
    liveOutput += 180 + Math.floor(Math.random() * 900);
    liveTools += Math.random() < 0.5 ? 1 : 0;
    const now = Date.now();
    const sessions = [];
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
            lastTool: live ? ["bash", "edit", "bash", "read"][i % 4] : undefined,
            lastMessage: live
                ? [
                    "Dropdown now renders in a portal; still need keyboard nav + a regression test.",
                    "Timer wired to focus-since; verifying it survives a cold boot next.",
                    "Boot-failure overlay dismisses; fixing the typecheck errors in actions.",
                    "CI cache key updated; waiting on the first green run before opening a PR.",
                ][i % 4]
                : undefined,
        });
    }
    const prs = [
        makePr(118216, "fix(desktop): portal dropdown submenu into the page", "feat/portal-dropdown", "running"),
        makePr(118044, "fix(desktop): statusbar timer shows focus-since", "fix/statusbar-timer", "passed", { armed: true }),
        makePr(118132, "fix(desktop): dismiss boot-failure overlay on retry", "fix/boot-overlay", "failed", {
            reviewDecision: "CHANGES_REQUESTED",
        }),
        ...Array.from({ length: 9 }, (_, i) => makePr(122000 + i * 44, ["chore(ci): cache pnpm store", "docs: refresh contribution guide", "fix(desktop): archived sessions reappear"][i % 3], `chore/batch-${i}`, ["passed", "running", "failed", "waiting"][i % 4])),
    ];
    const agentSeed = [
        {
            name: "wave10",
            model: MODELS[1],
            status: "streaming",
            cwd: "/Users/kuro/Development/hermes-portal",
            branch: "feat/portal-dropdown",
            ahead: 3,
            dirty: 2,
            changedFiles: ["apps/desktop/src/Menu.tsx", "apps/desktop/src/portal.ts"],
            insertions: 128,
            deletions: 14,
            lastTool: "bash",
            note: "Dropdown now renders in a portal; still need keyboard nav + a regression test.",
            pid: 41004,
        },
        {
            name: "p3-rated",
            model: MODELS[0],
            status: "tool",
            cwd: "/Users/kuro/Development/hermes",
            branch: "fix/statusbar-timer",
            ahead: 1,
            dirty: 0,
            changedFiles: [],
            insertions: 0,
            deletions: 0,
            lastTool: "bash",
            note: "Timer wired to focus-since; verifying it survives a cold boot next.",
            pid: 41001,
        },
        {
            name: "fix2e",
            model: MODELS[0],
            status: "tool",
            cwd: "/Users/kuro/Development/hermes-waves/fix2e",
            branch: "fix/boot-overlay",
            ahead: 5,
            dirty: 4,
            changedFiles: ["src/overlay.ts", "src/boot.ts", "src/types.ts", "test/boot.test.ts"],
            insertions: 96,
            deletions: 41,
            lastTool: "edit",
            note: "Boot-failure overlay dismisses; fixing the typecheck errors in actions.",
            pid: 41002,
        },
        {
            name: "ci-triage",
            model: MODELS[3],
            status: "idle",
            cwd: "/Users/kuro/Development/hermes",
            branch: "chore/ci-cache",
            ahead: 0,
            dirty: 1,
            changedFiles: [".github/workflows/ci.yml"],
            insertions: 7,
            deletions: 2,
            lastTool: "read",
            note: "CI cache key updated; waiting on the first green run before opening a PR.",
            pid: undefined,
        },
    ];
    const agentCommits = [
        commits([
            ["a1b2c3d", "feat(desktop): portal the dropdown submenu", 26],
            ["e4f5a6b", "refactor(desktop): extract menu positioning", 58],
            ["c7d8e9f", "test(desktop): menu portal snapshot", 95],
        ]),
        commits([["9a8b7c6", "fix(desktop): statusbar timer uses focus-since", 41]]),
        commits([
            ["1122334", "fix(desktop): allow retry to dismiss boot overlay", 12],
            ["5566778", "fix(desktop): guard overlay when boot fails early", 70],
            ["99aabbc", "test(desktop): cover boot failure retry", 130],
            ["ddeeff0", "chore: bump electron", 200],
            ["0011223", "fix(desktop): handle missing preload", 260],
        ]),
        commits([]),
    ];
    const agents = agentSeed.map((seed, index) => {
        const session = sessions[index];
        const cli = Math.max(1, Math.floor(liveOutput / (index + 1)));
        return {
            id: session?.id ?? `demo-agent-${index}`,
            name: seed.name,
            pid: seed.pid,
            status: seed.status,
            model: seed.model,
            cwd: seed.cwd ?? "",
            branch: seed.branch,
            ahead: seed.ahead ?? 0,
            behind: 0,
            dirty: seed.dirty ?? 0,
            changedFiles: seed.changedFiles ?? [],
            insertions: seed.insertions ?? 0,
            deletions: seed.deletions ?? 0,
            commits: agentCommits[index] ?? [],
            pr: prs.find((pr) => pr.branch === seed.branch),
            lastTool: seed.lastTool,
            note: seed.note,
            tokens: seed.status === "idle" ? 0 : cli,
            spend: 0.05 + index * 0.09,
            turns: 3 + index * 2,
            startedAt: now - (600_000 + index * 180_000),
            lastActivity: seed.status === "idle" ? now - 1_800_000 : now - index * 4_000,
        };
    });
    const feed = [
        {
            at: now - 2_000,
            agent: "p3-rated>#118216",
            kind: "bash",
            text: "cd /Users/kuro/Development/hermes-agent && git show 6ec517c475:apps/desktop/package.json",
        },
        {
            at: now - 6_000,
            agent: "p3-rated>fix2f",
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
    return { sessions, agents, prs, feed };
}
//# sourceMappingURL=demo.js.map