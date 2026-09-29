# pifleet features

Status legend: `[x]` shipped in this repo, `[ ]` planned.

## Fleet overview

- [x] Throughput: tokens/second now, session average, and peak
- [x] Tools per minute and tokens per hour
- [x] Dual sparklines: per-second rate and a 10-second moving average
- [x] Aggregate counters: sessions, live agents, started in the last week, total tokens and tools
- [x] Model breakdown legend with per-model counts

## Agents and subagents

- [x] Discover live `pi` processes via `ps` (no config required)
- [x] Parent → subagent hierarchy rendered as a tree
- [x] Per-agent status: streaming / running a tool / idle
- [x] Show the command or detail the agent is currently working on
- [x] Collapse overflow with an "N more" row
- [ ] Attribute tokens per agent (requires RPC event stream)
- [ ] Drill-in view for a single agent

## Sessions

- [x] Total sessions, sessions active in the last hour, and per-day average
- [x] Time since the most recent session closed
- [x] Per-session tokens (input, output, reasoning, cache) and cost
- [x] Session names from `/name` where present
- [ ] Session list with search and resume
- [ ] Session detail page (turns, tools, diffs)

## Models and spend

- [x] Per-model output-token bars and cost
- [x] Cache-hit percentage and reasoning-token totals
- [x] Session cost total
- [ ] Per-model rate and latency history
- [ ] Cost budgets and alerts

## Pull requests

- [x] Open / green / red / running / armed-to-merge counters
- [x] Segmented status bar
- [x] PR list with number and title (`gh`)
- [x] Repo name resolved for the panel title
- [ ] Merged-in-24h counter
- [ ] Review decision and merge queue view

## Activity feed

- [x] Timestamped command feed across all sessions
- [x] `cd <cwd> && <command>` rendering
- [ ] Filter by agent, session, or repo
- [ ] Full tool-call feed (not just bash)

## Interface

- [x] Native rendering via `@earendil-works/pi-tui`
- [x] Standalone alt-screen TUI with scrolling and mouse
- [x] `q` to quit, `r` to refresh
- [x] `--demo` synthetic mode for screenshots and first-run
- [x] `--snapshot` single-frame output for CI and docs
- [x] Full-screen `/fleet` overlay inside pi
- [ ] Configurable panel layout and refresh rate
- [ ] Theme selection matching pi themes

## Distribution

- [x] npm `bin` (`npx pifleet`)
- [x] pi package with a `/fleet` command (`pi install`)
- [ ] Homebrew tap
- [ ] Screenshots and gallery preview in the pi package gallery

## Architecture

- [x] Read-only by default; never mutates sessions or repos
- [x] mtime-cached session parsing for cheap polling
- [x] Graceful degradation when `gh`, sessions, or processes are unavailable
- [ ] RPC supervisor mode for control actions (launch / steer / stop)
