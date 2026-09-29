# pifleet

A live operations dashboard for [pi](https://github.com/earendil-works/pi) —
watch sessions, agents, throughput, token spend, and pull requests in one panel.
Built on `@earendil-works/pi-tui`, so it renders with the same components and
feel as pi itself.

```
╭─ closed · 1w ───────────────────────────────╮  ╭─ fleet ────────────────────────────────────────────╮
│ ███                                         │  │ 835 tok/s   avg 85   peak 2,099   tools 72/min     │
│ █ █                                         │  │ ▁▂▃▅▂▇▃▁▂▅▇▃▂▁▃▅▇▂▁▃▅▂▇▃▁▂▅▇                  │
│ ███                                         │  │ 9 sessions · 4 agents live | 1w 6 started ...      │
│   █                                         │  │ ■ glm-5.3 ×27  ■ claude-sonnet-4.5 ×15             │
│ ███                                         │  ╰────────────────────────────────────────────────────╯
│                                             │
│ 2,232 all · 36 last hour · 84/day           │
╰─────────────────────────────────────────────╯
```

## Features

See [FEATURES.md](./FEATURES.md) for the full list. Highlights:

- **Fleet** — tok/s now / average / peak, tools per minute, tokens per hour, sparklines, model breakdown.
- **Agents** — live `pi` and subagent processes with status and the command they are running.
- **Sessions** — totals, activity per hour/day, last close, per-session tokens and cost.
- **Models** — per-model token bars and spend for the current session, cache-hit rate, reasoning tokens.
- **Pull requests** — open / green / red / running / armed, a status bar, and the PR list (via `gh`).
- **Feed** — a timestamped stream of the commands agents are running.

## Install

Run it without installing:

```bash
npx pifleet --demo
```

Or install globally:

```bash
npm install -g pifleet
pifleet --repo ~/Development/my-project
```

### As a pi package

```bash
pi install git:github.com/ikurotime/pifleet
```

Then run `/fleet` inside pi to open the dashboard as a full-screen overlay.
`/fleet demo` opens it with synthetic data.

## Usage

```
pifleet [options]

  --demo                 Render synthetic data (no live activity required)
  --repo <path>          Repository for the pull-request panel (default: cwd)
  --sessions <paths>     Comma-separated session directories
  --interval <ms>        Poll interval in milliseconds (default 1000)
  --snapshot [width]     Render one frame to stdout and exit
  -h, --help             Show this help
```

Keys: `q` / `ctrl+c` quit, `r` refresh.

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
tmux split-window -h 'pifleet --repo "$PWD"'
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
