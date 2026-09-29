/** Best-effort discovery of running pi / subagent processes via `ps`. */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileAsync = promisify(execFile);
const PI_PATTERNS = [
    /\/\.pi\/agent\/bin\/pi\b/,
    /\bpi-coding-agent\b/,
    /@earendil-works\/pi/,
    /(?:^|\s)pi\s+--(?:mode|provider|model|name|session|continue|resume|print)\b/,
    /^\s*pi\s*$/,
];
function looksLikePi(command) {
    return PI_PATTERNS.some((pattern) => pattern.test(command));
}
/** Parse `etime` ([[dd-]hh:]mm:ss) into milliseconds. */
function parseElapsed(etime) {
    const match = etime.trim().match(/^(?:(\d+)-)?(?:(\d+):)?(\d+):(\d+)$/);
    if (!match)
        return undefined;
    const [, days, hours, minutes, seconds] = match;
    return (((Number(days ?? 0) * 24 + Number(hours ?? 0)) * 60 + Number(minutes ?? 0)) * 60_000 +
        Number(seconds ?? 0) * 1000);
}
function extractFlag(command, flag) {
    const match = command.match(new RegExp(`${flag}[=\\s]+("[^"]+"|'[^']+'|\\S+)`));
    if (!match || !match[1])
        return undefined;
    return match[1].replace(/^['"]|['"]$/g, "");
}
export async function scanProcesses() {
    let stdout;
    try {
        const result = await execFileAsync("ps", ["-axo", "pid=,ppid=,etime=,command="], {
            maxBuffer: 8 * 1024 * 1024,
        });
        stdout = result.stdout;
    }
    catch {
        return [];
    }
    const now = Date.now();
    const candidates = [];
    for (const line of stdout.split("\n")) {
        const match = line.match(/^\s*(\d+)\s+(\d+)\s+(\S+)\s+(.*)$/);
        if (!match)
            continue;
        const [, pid, ppid, etime, command] = match;
        if (!pid || !ppid || !etime || !command)
            continue;
        if (!looksLikePi(command))
            continue;
        // Skip the dashboard process itself.
        if (command.includes("pi-bonsai") || command.includes("pi-crtree") || command.includes("pifleet") || command.includes("pi-fleet"))
            continue;
        candidates.push({ pid: Number(pid), ppid: Number(ppid), etime, command });
    }
    const piPids = new Set(candidates.map((c) => c.pid));
    return candidates.map((c) => {
        const elapsed = parseElapsed(c.etime);
        const name = extractFlag(c.command, "--name") ??
            extractFlag(c.command, "-n") ??
            `pi ${c.pid}`;
        const model = extractFlag(c.command, "--model") ?? extractFlag(c.command, "-m");
        const cwd = extractFlag(c.command, "--cwd");
        return {
            pid: c.pid,
            parentPid: c.ppid,
            name,
            model,
            cwd,
            status: "idle",
            detail: c.command.length > 120 ? `${c.command.slice(0, 117)}...` : c.command,
            startedAt: elapsed ? now - elapsed : undefined,
            // A pi process parented by another pi process is almost certainly a subagent.
            ...(piPids.has(c.ppid) ? {} : {}),
        };
    });
}
//# sourceMappingURL=processes.js.map