/** Read git branch, working-tree, and recent-commit state for a directory. */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileAsync = promisify(execFile);
const GIT_OPTS = { maxBuffer: 4 * 1024 * 1024 };
function parseStatus(output) {
    const status = { ahead: 0, behind: 0, dirty: 0, files: [], insertions: 0, deletions: 0 };
    for (const line of output.split("\n")) {
        if (!line)
            continue;
        if (line.startsWith("## ")) {
            const header = line.slice(3);
            const [namePart, rest] = header.split("...");
            const name = (namePart ?? "").replace(/^(?:No commits yet on|Initial commit on)\s+/i, "").trim();
            status.branch = name || undefined;
            if (rest)
                status.upstream = rest.split(" ")[0]?.trim();
            const ahead = /ahead (\d+)/.exec(header);
            const behind = /behind (\d+)/.exec(header);
            if (ahead?.[1])
                status.ahead = Number(ahead[1]);
            if (behind?.[1])
                status.behind = Number(behind[1]);
            continue;
        }
        status.dirty++;
        const path = line.slice(3).trim();
        if (path)
            status.files.push(path);
    }
    return status;
}
function parseShortstat(output) {
    const insertions = /(\d+) insertion/.exec(output);
    const deletions = /(\d+) deletion/.exec(output);
    return { insertions: insertions?.[1] ? Number(insertions[1]) : 0, deletions: deletions?.[1] ? Number(deletions[1]) : 0 };
}
export async function gitStatus(cwd) {
    try {
        const [status, diff] = await Promise.all([
            execFileAsync("git", ["-C", cwd, "status", "--porcelain=v1", "--branch"], GIT_OPTS),
            execFileAsync("git", ["-C", cwd, "diff", "HEAD", "--shortstat"], GIT_OPTS).catch(() => ({ stdout: "" })),
        ]);
        const parsed = parseStatus(status.stdout);
        const shortstat = parseShortstat(diff.stdout);
        parsed.insertions = shortstat.insertions;
        parsed.deletions = shortstat.deletions;
        // No upstream: count commits that are not on any remote as "ahead".
        if (parsed.ahead === 0 && !parsed.upstream) {
            try {
                const { stdout } = await execFileAsync("git", ["-C", cwd, "rev-list", "--count", "HEAD", "--not", "--remotes"], GIT_OPTS);
                const count = Number(stdout.trim());
                if (Number.isFinite(count))
                    parsed.ahead = count;
            }
            catch {
                // no remotes or no commits yet
            }
        }
        return parsed;
    }
    catch {
        return undefined;
    }
}
export async function gitLog(cwd, limit = 8) {
    try {
        const { stdout } = await execFileAsync("git", ["-C", cwd, "log", `-n${limit}`, "--pretty=%h%x1f%s%x1f%ct"], GIT_OPTS);
        return stdout
            .split("\n")
            .filter(Boolean)
            .map((line) => {
            const [sha, subject, ct] = line.split("\x1f");
            return { sha: sha ?? "", subject: subject ?? "", at: ct ? Number(ct) * 1000 : 0 };
        })
            .filter((commit) => commit.sha);
    }
    catch {
        return [];
    }
}
/** Commits on HEAD that are not on the given base ref (best effort). */
export async function gitAheadOf(cwd, base, limit = 6) {
    try {
        const { stdout } = await execFileAsync("git", ["-C", cwd, "log", `-n${limit}`, "--pretty=%h%x1f%s%x1f%ct", `${base}..HEAD`], GIT_OPTS);
        return stdout
            .split("\n")
            .filter(Boolean)
            .map((line) => {
            const [sha, subject, ct] = line.split("\x1f");
            return { sha: sha ?? "", subject: subject ?? "", at: ct ? Number(ct) * 1000 : 0 };
        })
            .filter((commit) => commit.sha);
    }
    catch {
        return [];
    }
}
//# sourceMappingURL=git.js.map