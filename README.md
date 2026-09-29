# pi-bonsai

A live operations dashboard for [pi](https://github.com/earendil-works/pi) —
watch sessions, agents, throughput, token spend, and pull requests in one panel.
Built on `@earendil-works/pi-tui`, so it renders with the same components and
feel as pi itself.

```
╔═[ FLEET ] · pi·bonsai ═════════════════════════════════════════════════╗
║ ╭─ bonsai · grow log ────────╮  ╭─ fleet ──────────────────────────╮ ║
║ │            .:&@@&:.        │  │ 835 tok/s  avg 85  peak 2,099     │ ║
║ │         ,&@@&&@@@@&&@,     │  │ ▁▂▃▅▂▇▃▁▂▅▇▃▂▁▃▅▇▂▁▃▅▂▇▃▁▂▅▇    │ ║
║ │      .,&@@@&@\|/@@@@&@@,   │  │ 9 sessions · 4 agents · 4 live    │ ║
║ │     ,&@@&@@@&\|/-.@@&@@@'  │  │ in 4.1M · cache 2.0M · $1.30      │ ║
║ │      `'&@@&~-.||  `'&@@@@, │  ╰──────────────────────────────────╯ ║
║ │     .:&&@&~-.__||/-'&@@&@' │  ╭─ models · session ───────────────╮ ║
║ │    ,&@@&@@'`-.||/    `'~   │  │ ■ glm-5.3       ██████████ 273k   │ ║
║ │     `'&@&@&:. |||  ,&@@&,  │  │ ■ sonnet-4.5    ██████░░░░ 154k   │ ║
║ │        `'&@@&-.||-'@@&@@'  │  │ cache read 2.0M · hit 33% · $1.30 │ ║
║ │              .-'||         │  ╰──────────────────────────────────╯ ║
║ │              |||)          │                                       ║
║ │          ____/||\____      │                                       ║
║ │       .-'~~~~~~~~~~~~'-.   │                                       ║
║ │      (  . : . : . : .   )  │                                       ║
║ │       `-.__(__)__(__).-'   │                                       ║
║ │ 9 all · 676k tokens · $1.30│                                       ║
║ ╰─────────────────────────────╯                                       ║
║ ╭─ canopy · 4 live · 1/4 ───────────────────────────────────────────╮ ║
║ │ ▶ ▍ p3 rated  glm-5.3  streaming  pid 41001  up 10m              │ ║
║ │     └ fix2e  glm-5.3  tool  pid 41002  terminal command…         │ ║
║ ╰───────────────────────────────────────────────────────────────────╯ ║
╚═[ ↑↓ select · enter detail · tab · q quit · r refresh ]══ 03:32:56 ══╝
```

## Features

See [FEATURES.md](./FEATURES.md) for the full list. Highlights:

- **Full-screen CRT console** — a double-line bezel with a `FLEET` banner that adapts to the terminal size, a warm amber phosphor palette, live clock, and a realistic ASCII bonsai tinted by part (moss canopy, bark trunk, bronze pot).
- **Fleet** — tok/s now / average / peak, tools per minute, tokens per hour, sparklines, model breakdown.
- **Agents (interactive)** — live `pi` and subagent processes in a tree; move with `↑/↓` or `j/k`, press `enter`/`tab` for a detail view, or click a row (click again to open). Detail shows pid/parent, uptime, cwd, session tokens/tools/spend, activity, and children.
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

Keys: `↑/↓` or `j/k` select an agent, `enter`/`tab` toggle the agent list/detail view, click a row to select it, `q` / `ctrl+c` quit, `r` refresh.

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
