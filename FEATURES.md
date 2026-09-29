# pi-bonsai features

Status legend: `[x]` shipped in this repo, `[ ]` planned.

## Fleet overview

- [x] Throughput: tokens/second now, session average, and peak
- [x] Tools per minute and tokens per hour
- [x] Dual sparklines: per-second rate and a 10-second moving average
- [x] Aggregate counters: sessions, live agents, started in the last week, total tokens and tools
- [x] Model breakdown legend with per-model counts

## Agent flow

- [x] One work item per recent session, joining process + git + PR state
- [x] Rail of agents with status, branch ahead/dirty, and PR number/CI
- [x] **What's done**: commits ahead of the base, commit subjects, `+adds/-dels`
- [x] **What's left**: uncommitted file count/list and the agent's latest note
- [x] Branch, working directory, and session age
- [x] The pull request a branch opened: number, title, review, and merged state
- [x] CI classified as running / waiting / failed / passed, per PR
- [x] Per-check list view (`tab`), failures and running checks first
- [x] Keyboard and mouse selection
- [x] Git state cached (~4s) so a 1s poll stays cheap
- [ ] Attribute tokens per agent (requires the RPC event stream)
- [ ] Diff preview inside the panel

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

- [x] Running / waiting / failed / passed counters and armed-to-merge
- [x] Segmented status bar coloured by CI state
- [x] PR list with number, title, branch, and failing/running counts (`gh`)
- [x] Repo name resolved for the panel title
- [x] Pair each PR with the agent branch that opened it
- [ ] Merged-in-24h counter
- [ ] Review decision and merge queue view

## Activity feed

- [x] Timestamped command feed across all sessions
- [x] `cd <cwd> && <command>` rendering
- [ ] Filter by agent, session, or repo
- [ ] Full tool-call feed (not just bash)

## Interface

- [x] Native rendering via `@earendil-works/pi-tui`
- [x] Full-screen layout that adapts to terminal width and height
- [x] CRT-style double-line bezel with a `FLEET` banner, live clock, and blinking cursor
- [x] Warm amber-and-moss bonsai palette
- [x] Realistic ASCII bonsai, tinted by part: full tree when idle, a sprig in the agent rail
- [x] Interactive agent rail: `↑/↓`/`j/k` select, `enter`/`tab` toggle flow/checks, mouse click to select
- [x] `q` to quit, `r` to refresh
- [x] `--demo` synthetic mode for screenshots and first-run
- [x] `--snapshot` single-frame output for CI and docs
- [x] `--rows` to test the layout at a specific height
- [x] Full-screen `/fleet` overlay inside pi
- [ ] Configurable panel layout and refresh rate
- [ ] Selectable themes

## Distribution

- [x] npm `bin` (`npx pi-bonsai`)
- [x] pi package with a `/fleet` command (`pi install`)
- [ ] Homebrew tap
- [ ] Screenshots and gallery preview in the pi package gallery

## Architecture

- [x] Read-only by default; never mutates sessions or repos
- [x] mtime-cached session parsing for cheap polling
- [x] TTL-cached `git status`/`git log` per working directory
- [x] Graceful degradation when `gh`, sessions, or processes are unavailable
- [ ] RPC supervisor mode for control actions (launch / steer / stop)
