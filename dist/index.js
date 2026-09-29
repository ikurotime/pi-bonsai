#!/usr/bin/env node
/** pi-fleet — a live operations dashboard for pi sessions, agents, and pull requests. */
import { ProcessTerminal, ScrollView, TuiAltScreen, matchesKey } from "@earendil-works/pi-tui";
import { defaultSessionDirs } from "./collectors/sessions.js";
import { buildConfig, DashboardStore } from "./store.js";
import { DashboardComponent } from "./ui/dashboard.js";
const HELP = `pi-fleet — live dashboard for pi sessions, agents, and pull requests

Usage:
  pi-fleet [options]

Options:
  --demo                 Render synthetic data (no live activity required)
  --repo <path>          Repository for the pull-request panel
  --sessions <paths>     Comma-separated session directories
  --interval <ms>        Poll interval in milliseconds (default 1000)
  --snapshot [width]     Render one frame to stdout and exit
  -h, --help             Show this help

Keys:
  q, ctrl+c              Quit
  r                      Force refresh

Environment:
  PI_CODING_AGENT_SESSION_DIR   Overrides the default session directory
`;
function parseArgs(argv) {
    const config = buildConfig();
    let help = false;
    let snapshot;
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === undefined)
            continue;
        switch (arg) {
            case "--demo":
                config.demo = true;
                break;
            case "--snapshot": {
                const next = argv[i + 1];
                if (next && /^\d+$/.test(next)) {
                    snapshot = Number(next);
                    i++;
                }
                else {
                    snapshot = 200;
                }
                break;
            }
            case "--repo": {
                const value = argv[++i];
                if (value)
                    config.repo = value;
                break;
            }
            case "--sessions": {
                const value = argv[++i];
                if (value)
                    config.sessionDirs = value.split(",").map((p) => p.trim()).filter(Boolean);
                break;
            }
            case "--interval": {
                const value = Number(argv[++i]);
                if (Number.isFinite(value) && value >= 100)
                    config.intervalMs = value;
                break;
            }
            case "-h":
            case "--help":
                help = true;
                break;
            default:
                if (arg.startsWith("-")) {
                    process.stderr.write(`Unknown option: ${arg}\n`);
                }
        }
    }
    return { config, help, snapshot };
}
async function main() {
    const { config, help, snapshot } = parseArgs(process.argv.slice(2));
    if (help) {
        process.stdout.write(HELP);
        return;
    }
    if (config.sessionDirs.length === 0)
        config.sessionDirs = defaultSessionDirs();
    if (config.repo === undefined && !config.demo)
        config.repo = process.cwd();
    if (snapshot !== undefined) {
        const store = new DashboardStore(config);
        await store.poll();
        const dashboard = new DashboardComponent(store);
        process.stdout.write(`${dashboard.render(snapshot).join("\n")}\n`);
        return;
    }
    const store = new DashboardStore(config);
    await store.poll(); // load once so the first frame is populated
    store.start();
    const terminal = new ProcessTerminal();
    const tui = new TuiAltScreen(terminal, false, undefined, { mouse: false });
    const dashboard = new DashboardComponent(store);
    const scroll = new ScrollView(dashboard, { primary: true, follow: "none" });
    tui.addChild(scroll);
    dashboard.setUpdateCallback(() => tui.requestRender());
    const shutdown = () => {
        store.stop();
        try {
            tui.stop();
        }
        catch {
            // ignore double-stop
        }
        process.exit(0);
    };
    tui.addInputListener((data) => {
        if (matchesKey(data, "q") || matchesKey(data, "ctrl+c")) {
            shutdown();
            return { consume: true };
        }
        if (matchesKey(data, "r")) {
            void store.poll();
            return { consume: true };
        }
        return undefined;
    });
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
    tui.start();
}
void main();
//# sourceMappingURL=index.js.map