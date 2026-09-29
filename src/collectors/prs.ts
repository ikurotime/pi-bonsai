/** Pull-request panel data, sourced from the `gh` CLI. */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { CheckDetail, CheckState, PullRequest } from "../types.js";

const execFileAsync = promisify(execFile);

interface RawCheck {
	name?: string;
	context?: string;
	status?: string;
	conclusion?: string;
	state?: string;
}

interface RawPr {
	number: number;
	title: string;
	state: string;
	isDraft: boolean;
	headRefName?: string;
	reviewDecision?: string;
	mergeable?: string;
	statusCheckRollup?: RawCheck[] | null;
	updatedAt: string;
	url: string;
}

const PR_FIELDS = [
	"number",
	"title",
	"state",
	"isDraft",
	"headRefName",
	"reviewDecision",
	"mergeable",
	"statusCheckRollup",
	"updatedAt",
	"url",
].join(",");

function classifyCheck(check: RawCheck): CheckDetail["state"] {
	const conclusion = (check.conclusion ?? "").toUpperCase();
	const status = (check.status ?? "").toUpperCase();
	const state = (check.state ?? "").toUpperCase();
	if (status && status !== "COMPLETED") return "running";
	if (["FAILURE", "CANCELLED", "TIMED_OUT", "ACTION_REQUIRED", "STARTUP_FAILURE", "STALE"].includes(conclusion)) return "fail";
	if (conclusion === "SKIPPED" || conclusion === "NEUTRAL") return "skipped";
	if (conclusion === "SUCCESS") return "pass";
	if (state === "SUCCESS") return "pass";
	if (state === "FAILURE" || state === "ERROR") return "fail";
	if (state === "PENDING" || state === "EXPECTED" || state === "QUEUED") return "pending";
	return "pending";
}

/** Roll a PR's checks up into the operator-facing state. */
function summarizeChecks(details: CheckDetail[]): Pick<
	PullRequest,
	"checks" | "checksTotal" | "checksPassed" | "checksFailed" | "checksRunning" | "checksPending" | "failing" | "pending"
> {
	const passed = details.filter((d) => d.state === "pass").length;
	const failed = details.filter((d) => d.state === "fail");
	const running = details.filter((d) => d.state === "running");
	const pending = details.filter((d) => d.state === "pending");
	const total = details.length;

	let checks: CheckState;
	if (total === 0) checks = "none";
	else if (failed.length > 0) checks = "failed";
	else if (running.length > 0) checks = "running";
	else if (pending.length > 0) checks = "waiting";
	else if (passed > 0) checks = "passed";
	else checks = "waiting";

	return {
		checks,
		checksTotal: total,
		checksPassed: passed,
		checksFailed: failed.length,
		checksRunning: running.length,
		checksPending: pending.length,
		failing: failed.map((d) => d.name),
		pending: [...running, ...pending].map((d) => d.name),
	};
}

export async function scanPullRequests(repo?: string): Promise<PullRequest[]> {
	try {
		const { stdout } = await execFileAsync("gh", ["pr", "list", "--json", PR_FIELDS, "--limit", "60"], {
			cwd: repo,
			maxBuffer: 8 * 1024 * 1024,
		});
		const parsed = JSON.parse(stdout) as RawPr[];
		return parsed.map((pr) => {
			const details: CheckDetail[] = (pr.statusCheckRollup ?? []).map((check) => ({
				name: check.name ?? check.context ?? "check",
				state: classifyCheck(check),
			}));
			const summary = summarizeChecks(details);
			return {
				number: pr.number,
				title: pr.title,
				state: pr.state,
				isDraft: pr.isDraft,
				branch: pr.headRefName,
				reviewDecision: pr.reviewDecision,
				mergeable: pr.mergeable,
				...summary,
				details,
				armed:
					!pr.isDraft &&
					pr.reviewDecision === "APPROVED" &&
					pr.mergeable === "MERGEABLE" &&
					summary.checks === "passed",
				updatedAt: pr.updatedAt,
				url: pr.url,
			};
		});
	} catch {
		return [];
	}
}

/** Resolve the repository shown in the panel title. */
export async function resolveRepoName(repo?: string): Promise<string | undefined> {
	try {
		const { stdout } = await execFileAsync("gh", ["repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"], {
			cwd: repo,
		});
		return stdout.trim() || undefined;
	} catch {
		return undefined;
	}
}
