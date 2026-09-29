/** Pull-request panel data, sourced from the `gh` CLI. */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { PullRequest } from "../types.js";

const execFileAsync = promisify(execFile);

interface RawCheck {
	status?: string;
	conclusion?: string;
	state?: string;
}

interface RawPr {
	number: number;
	title: string;
	state: string;
	isDraft: boolean;
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
	"reviewDecision",
	"mergeable",
	"statusCheckRollup",
	"updatedAt",
	"url",
].join(",");

function classifyChecks(checks: RawCheck[] | null | undefined): PullRequest["checks"] {
	if (!checks || checks.length === 0) return "none";
	let sawFailure = false;
	let sawRunning = false;
	let sawSuccess = false;
	for (const check of checks) {
		const conclusion = (check.conclusion ?? "").toUpperCase();
		const state = (check.state ?? "").toUpperCase();
		const status = (check.status ?? "").toUpperCase();
		if (status && status !== "COMPLETED") {
			sawRunning = true;
			continue;
		}
		if (["FAILURE", "CANCELLED", "TIMED_OUT", "ACTION_REQUIRED", "STARTUP_FAILURE"].includes(conclusion)) {
			sawFailure = true;
		} else if (conclusion === "SUCCESS" || state === "SUCCESS") {
			sawSuccess = true;
		} else if (state === "FAILURE" || state === "ERROR") {
			sawFailure = true;
		} else if (state === "PENDING") {
			sawRunning = true;
		}
	}
	if (sawRunning) return "running";
	if (sawFailure) return "red";
	if (sawSuccess) return "green";
	return "none";
}

export async function scanPullRequests(repo?: string): Promise<PullRequest[]> {
	try {
		const { stdout } = await execFileAsync(
			"gh",
			["pr", "list", "--json", PR_FIELDS, "--limit", "50"],
			{ cwd: repo, maxBuffer: 8 * 1024 * 1024 },
		);
		const parsed = JSON.parse(stdout) as RawPr[];
		return parsed.map((pr) => {
			const checks = classifyChecks(pr.statusCheckRollup);
			return {
				number: pr.number,
				title: pr.title,
				state: pr.state,
				isDraft: pr.isDraft,
				reviewDecision: pr.reviewDecision,
				mergeable: pr.mergeable,
				checks,
				armed:
					!pr.isDraft &&
					pr.reviewDecision === "APPROVED" &&
					pr.mergeable === "MERGEABLE" &&
					checks === "green",
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
