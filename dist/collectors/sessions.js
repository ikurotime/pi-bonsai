/** Reads pi session JSONL files and derives per-session summaries plus a command feed. */
import { readFile, readdir, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
/** Skip unreasonably large files to keep polling cheap. */
const MAX_FILE_BYTES = 32 * 1024 * 1024;
const cache = new Map();
export function defaultSessionDirs() {
    const env = process.env.PI_CODING_AGENT_SESSION_DIR || process.env.PI_SESSION_DIR;
    if (env)
        return env.split(path.delimiter).filter(Boolean);
    return [path.join(os.homedir(), ".pi", "agent", "sessions")];
}
async function walk(dir, out) {
    let entries;
    try {
        entries = await readdir(dir, { withFileTypes: true });
    }
    catch {
        return;
    }
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory())
            await walk(full, out);
        else if (entry.isFile() && entry.name.endsWith(".jsonl"))
            out.push(full);
    }
}
function addUsage(summary, usage) {
    if (!usage)
        return;
    summary.input += usage.input ?? 0;
    summary.output += usage.output ?? 0;
    summary.cacheRead += usage.cacheRead ?? 0;
    summary.cacheWrite += usage.cacheWrite ?? 0;
    summary.reasoning += usage.reasoning ?? 0;
    summary.cost += usage.cost?.total ?? 0;
}
function commandFromToolArgs(args) {
    if (!args || typeof args !== "object")
        return undefined;
    const record = args;
    for (const key of ["command", "cmd", "script"]) {
        const value = record[key];
        if (typeof value === "string" && value.trim())
            return value.trim();
    }
    return undefined;
}
function parseSession(file, content) {
    const now = Date.now();
    const summary = {
        id: path.basename(file, ".jsonl"),
        file,
        cwd: "",
        startedAt: now,
        lastActivity: 0,
        input: 0,
        output: 0,
        reasoning: 0,
        cacheRead: 0,
        cacheWrite: 0,
        cost: 0,
        toolCalls: 0,
        userTurns: 0,
        assistantMessages: 0,
    };
    const feed = [];
    for (const rawLine of content.split("\n")) {
        const line = rawLine.trim();
        if (!line)
            continue;
        let entry;
        try {
            entry = JSON.parse(line);
        }
        catch {
            continue;
        }
        const type = entry.type;
        const at = entry.timestamp ? Date.parse(entry.timestamp) : NaN;
        if (Number.isFinite(at))
            summary.lastActivity = Math.max(summary.lastActivity, at);
        if (type === "session") {
            summary.id = entry.id ?? summary.id;
            summary.cwd = entry.cwd ?? "";
            const started = entry.timestamp ? Date.parse(entry.timestamp) : NaN;
            if (Number.isFinite(started))
                summary.startedAt = started;
            continue;
        }
        if (type === "session_info") {
            if (typeof entry.name === "string")
                summary.name = entry.name;
            continue;
        }
        if (type === "model_change") {
            summary.provider = entry.provider ?? summary.provider;
            summary.model = entry.modelId ?? summary.model;
            continue;
        }
        if (type === "usage") {
            addUsage(summary, entry.usage);
            continue;
        }
        if (type !== "message")
            continue;
        const message = entry.message;
        if (!message)
            continue;
        const role = message.role;
        if (role === "user") {
            summary.userTurns++;
            continue;
        }
        if (role === "assistant") {
            summary.assistantMessages++;
            if (typeof message.model === "string")
                summary.model = message.model;
            if (typeof message.provider === "string")
                summary.provider = message.provider;
            addUsage(summary, message.usage);
            const blocks = Array.isArray(message.content) ? message.content : [];
            for (const block of blocks) {
                if (!block || typeof block !== "object")
                    continue;
                const b = block;
                if (b.type === "text" && typeof b.text === "string" && b.text.trim()) {
                    summary.lastMessage = b.text.trim();
                    continue;
                }
                if (b.type !== "toolCall")
                    continue;
                summary.toolCalls++;
                const name = typeof b.name === "string" ? b.name : "tool";
                summary.lastTool = name;
                const command = name === "bash" ? commandFromToolArgs(b.arguments) : undefined;
                if (command) {
                    feed.push({
                        at: Number.isFinite(at) ? at : summary.lastActivity || now,
                        agent: summary.name ?? summary.id.slice(0, 8),
                        kind: name,
                        text: `${summary.cwd ? `cd ${summary.cwd} && ` : ""}${command}`,
                    });
                }
            }
            continue;
        }
    }
    if (!summary.lastActivity)
        summary.lastActivity = summary.startedAt;
    if (!summary.name && summary.cwd)
        summary.name = undefined;
    return { summary, feed };
}
/** Scan all session directories, reusing cached parses for unchanged files. */
export async function scanSessions(dirs, feedLimit) {
    const files = [];
    for (const dir of dirs)
        await walk(dir, files);
    const sessions = [];
    const feed = [];
    const seen = new Set();
    for (const file of files) {
        seen.add(file);
        let info;
        try {
            info = await stat(file);
        }
        catch {
            continue;
        }
        if (info.size > MAX_FILE_BYTES)
            continue;
        const cached = cache.get(file);
        if (cached && cached.mtimeMs === info.mtimeMs && cached.size === info.size) {
            sessions.push(cached.summary);
            feed.push(...cached.feed);
            continue;
        }
        let content;
        try {
            content = await readFile(file, "utf8");
        }
        catch {
            continue;
        }
        const parsed = parseSession(file, content);
        cache.set(file, {
            mtimeMs: info.mtimeMs,
            size: info.size,
            summary: parsed.summary,
            feed: parsed.feed,
        });
        sessions.push(parsed.summary);
        feed.push(...parsed.feed);
    }
    for (const key of cache.keys()) {
        if (!seen.has(key))
            cache.delete(key);
    }
    sessions.sort((a, b) => b.lastActivity - a.lastActivity);
    feed.sort((a, b) => b.at - a.at);
    return { sessions, feed: feed.slice(0, feedLimit) };
}
//# sourceMappingURL=sessions.js.map