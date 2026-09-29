# pi-bonsai

A live operations dashboard for [pi](https://github.com/earendil-works/pi) —
watch sessions, agents, throughput, token spend, and pull requests in one panel.
Built on `@earendil-works/pi-tui`, so it renders with the same components and
feel as pi itself.

```
╔═[ FLEET ] · pi·bonsai ══════════════════════════════════════════════════╗
║ ╭─ agents · 4 ───────────────╮  ╭─ flow · wave10 ────────────────────╮ ║
║ │ ▶ ⠦ wave10  ↑3±2  #118216 ◐│  │ wave10  opus-5.5  ⠦ streaming      │ ║
║ │   ▸ p3-rated  ↑1  #118044 ●│  │ cwd ~/hermes-portal                │ ║
║ │   ▸ fix2e  ↑5±4  #118132 ✗ │  │ branch feat/portal-dropdown  10m   │ ║
║ │   · ci-triage  ↑0±1  no PR │  │ ── progress ─────────────────────  │ ║
║ │                            │  │ ↑3 ahead  2 uncommitted  +128 -14  │ ║
║ │            .:&@@&:.        │  │ a1b2c3d portal the dropdown menu   │ ║
║ │         ,&@@&&@@@@&&@,     │  │ ± apps/desktop/src/portal.ts       │ ║
║ │        ,&@@&@@@&\|/@@@'    │  │ ── pull request ────────────────   │ ║
║ │        `&@@&~-.|| `&@@&,   │  │ #118216 portal dropdown submenu    │ ║
║ │          `'&@&:.||-'&@@'   │  │ ◐ running   checks 9/12  failed 0  │ ║
║ │              .-'||         │  │ ◐ e2e (shard 2), codeql, preview   │ ║
║ │          ____/||\____      │  │ ── activity ───────────────────    │ ║
║ ╰────────────────────────────╯  │ last tool bash   turns 3   12k tok │ ║
║ ╭─ pull requests ──────────────────────────────────────────────────╮   ║
║ │ 12 open  3 running  2 waiting  3 failed  4 passed   armed 1      │   ║
║ │ ████████████████████████████████████████████████████████████████ │   ║
║ │ ◐ #118216 portal dropdown submenu  feat/portal-dropdown ◐2       │   ║
║ │ ● #118044 statusbar timer  fix/statusbar-timer                   │   ║
║ │ ✗ #118132 dismiss boot-failure overlay  fix/boot-overlay ✗3      │   ║
║ ╰──────────────────────────────────────────────────────────────────╯   ║
╚═[ ↑↓ agent · tab checks · q quit · r refresh ]══ 03:32:56 [live █] ═══╝
```

## Features

See [FEATURES.md](./FEATURES.md) for the full list. Highlights:

- **Agent flow** — one row per parallel agent. Select one to see **what's done** (commits ahead, `+adds/-dels`), **what's left** (uncommitted files, the agent's own note), its **branch**, and the **pull request it opened** (number + title).
- **CI at a glance** — every PR is classified as **running / waiting / failed / passed**. Press `tab` for the per-check list, failures first.
- **Full-screen CRT console** — a double-line bezel with a `FLEET` banner, warm amber phosphor palette, live clock, and a bonsai that fills the idle state.
- **Fleet** — tok/s now / average / peak, tools per minute, tokens per hour, sparklines, model breakdown.
- **Sessions** — totals, activity per hour/day, last close, per-session tokens and cost.
- **Models** — per-model token bars and spend for the current session, cache-hit rate, reasoning tokens.
- **Pull requests** — open / green / red / running / armed, a status bar, and the PR list (via `gh`).
- **Feed** — a timestamped stream of the commands agents are running.

## Install

Run it without installing:

```bash
npx pi-bonsai --demo
```

Or install globally:

```bash
npm install -g pi-bonsai
pi-bonsai --repo ~/Development/my-project
```

### As a pi package

```bash
pi install git:github.com/ikurotime/pi-bonsai
```

Then run `/fleet` inside pi to open the dashboard as a full-screen overlay.
`/fleet demo` opens it with synthetic data.

## Usage

```
pi-bonsai [options]

  --demo                 Render synthetic data (no live activity required)
  --repo <path>          Repository for the pull-request panel (default: cwd)
  --sessions <paths>     Comma-separated session directories
  --interval <ms>        Poll interval in milliseconds (default 1000)
  --snapshot [width]     Render one frame to stdout and exit
  -h, --help             Show this help
```

Keys: `↑/↓` or `j/k` select an agent, `enter`/`tab` toggle that agent's **flow** and **CI checks** view, click a row to select it (click again for checks), `q` / `ctrl+c` quit, `r` refresh.

### Data sources

| Panel | Source |
|---|---|
| Sessions, models, feed | pi session JSONL under `~/.pi/agent/sessions/` |
| Agents | `ps` (running `pi` / subagent processes) |
| Pull requests | the `gh` CLI in `--repo` |

Set `PI_CODING_AGENT_SESSION_DIR` to point at a non-default session directory.

### tmux

The dashboard is designed to live in its own pane:

```bash
tmux split-window -h 'pi-bonsai --repo "$PWD"'
```

## Development

```bash
npm install
npm run dev -- --demo          # run from source (bun)
npm run build                  # compile to dist/
npm run typecheck
```

## Design notes

- Pure read-only by default: the dashboard never mutates sessions or repos.
- Session files are cached by mtime, so polling is cheap after the first pass.
- The extension (`/fleet`) reuses the same components as the standalone CLI.

## Roadmap

- RPC-based supervisor: launch, steer, and stop agents from the panel.
- Timeline and per-model rate history.
- Config file for panel selection and thresholds.

## License

MIT © ikurotime
