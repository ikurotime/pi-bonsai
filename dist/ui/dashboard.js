/** Root dashboard component: a full-screen CRT console organised around agent flow. */
import { matchesKey, truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import { formatClock } from "../format.js";
import { amber, bezel, bold, phos, phosBright } from "../theme.js";
import { fitBody, panel, splitWidths, twoColumn } from "./panel.js";
import { agentsBody, feedBody, fleetBody, flowBody, modelsBody, prsBody, sessionsBody } from "./panels.js";
function padCell(content, width) {
    const clipped = truncateToWidth(content, width);
    const gap = width - visibleWidth(clipped);
    return gap > 0 ? clipped + " ".repeat(gap) : clipped;
}
export class DashboardComponent {
    store;
    state;
    onUpdate;
    getHeight;
    /** Interactive agent selection and which panel view is showing. */
    agentView = { selected: 0, mode: "flow" };
    /** Maps rendered output rows to agent indices for mouse hit-testing. */
    agentHit = new Map();
    constructor(store, options = {}) {
        this.store = store;
        this.getHeight = options.getHeight ?? (() => process.stdout.rows || 40);
        this.state = store.getState();
        store.subscribe((state) => {
            this.state = state;
            this.onUpdate?.();
        });
    }
    setUpdateCallback(callback) {
        this.onUpdate = callback;
    }
    invalidate() { }
    /** Handle navigation keys. Returns true when the key was consumed. */
    handleInput(data) {
        const count = this.state.agents.length;
        if (matchesKey(data, "up") || matchesKey(data, "k")) {
            this.moveSelection(-1, count);
            return true;
        }
        if (matchesKey(data, "down") || matchesKey(data, "j")) {
            this.moveSelection(1, count);
            return true;
        }
        if (matchesKey(data, "tab")) {
            this.agentView.mode = this.agentView.mode === "flow" ? "checks" : "flow";
            this.onUpdate?.();
            return true;
        }
        if (matchesKey(data, "enter") || matchesKey(data, "return")) {
            this.agentView.mode = this.agentView.mode === "flow" ? "checks" : "flow";
            this.onUpdate?.();
            return true;
        }
        if (matchesKey(data, "escape") && this.agentView.mode === "checks") {
            this.agentView.mode = "flow";
            this.onUpdate?.();
            return true;
        }
        return false;
    }
    moveSelection(delta, count) {
        if (count === 0)
            return;
        this.agentView.selected = Math.min(Math.max(0, this.agentView.selected + delta), count - 1);
        this.onUpdate?.();
    }
    /** Click or press on an agent row selects it; clicking it again flips to checks. */
    handleMouse(event) {
        if (event.button !== "left" || (event.type !== "press" && event.type !== "click"))
            return undefined;
        const index = this.agentHit.get(event.y);
        if (index === undefined)
            return undefined;
        const already = this.agentView.selected === index;
        this.agentView.selected = index;
        if (event.type === "click" && (already || event.clickCount === 2)) {
            this.agentView.mode = this.agentView.mode === "flow" ? "checks" : "flow";
        }
        this.onUpdate?.();
        return { handled: true, render: true };
    }
    render(width) {
        const W = Math.max(64, width);
        const H = Math.max(18, this.getHeight());
        const contentWidth = W - 4;
        const contentHeight = H - 2;
        const state = this.state;
        this.agentHit.clear();
        this.agentView.selected = Math.min(Math.max(0, this.agentView.selected), Math.max(0, state.agents.length - 1));
        const rows = state.agents.length === 0 ? this.idleLayout(contentWidth, state) : this.workLayout(contentWidth, state);
        // Pull requests, sized to leave room for the feed.
        const feedMin = 6;
        const remaining = contentHeight - rows.length;
        const prLimit = Math.max(2, Math.min(12, remaining - feedMin - 5));
        rows.push(...panel(contentWidth, state.repo ? `pull requests · ${state.repo}` : "pull requests", phos, prsBody(contentWidth, state, prLimit)));
        // Feed absorbs the leftover height so the console fills the screen.
        const feedHeight = Math.max(feedMin, contentHeight - rows.length);
        rows.push(...panel(contentWidth, "feed", phos, fitBody(feedBody(contentWidth, state), feedHeight - 2)));
        const padded = rows.length < contentHeight ? [...rows, ...Array.from({ length: contentHeight - rows.length }, () => "")] : rows;
        return this.frame(W, padded);
    }
    /** Layout when nothing is running: the grow log gets the full width. */
    idleLayout(contentWidth, state) {
        const [leftW, rightW] = splitWidths(contentWidth, 0.42, 2);
        const row1 = twoColumn(panel(leftW, "bonsai · grow log", phos, sessionsBody(leftW, state, true)), [
            ...panel(rightW, "fleet", phos, fleetBody(rightW, state)),
            ...panel(rightW, "models · session", phos, modelsBody(rightW, state)),
        ], leftW, rightW);
        return [...row1];
    }
    /** Layout when agents are working: rail + flow, then fleet + models. */
    workLayout(contentWidth, state) {
        const [leftW, rightW] = splitWidths(contentWidth, 0.42, 2);
        const rail = agentsBody(leftW, state, this.agentView);
        const work = state.agents[this.agentView.selected];
        const rightTitle = this.agentView.mode === "checks" ? `checks · ${work?.name ?? "—"}` : `flow · ${work?.name ?? "—"}`;
        const row1 = twoColumn(panel(leftW, `agents · ${state.agents.length}`, phos, rail.lines), panel(rightW, rightTitle, phos, flowBody(rightW, work, this.agentView.mode)), leftW, rightW);
        // Output row y = 1 (bezel title) + panel offset (1) + body line index.
        rail.hits.forEach((agentIndex, lineIndex) => {
            if (agentIndex !== undefined)
                this.agentHit.set(1 + 1 + lineIndex, agentIndex);
        });
        const rows = [...row1];
        const [fleetW, modelsW] = splitWidths(contentWidth, 0.52, 2);
        rows.push(...twoColumn(panel(fleetW, "fleet", phos, fleetBody(fleetW, state)), panel(modelsW, "models · session", phos, modelsBody(modelsW, state)), fleetW, modelsW));
        return rows;
    }
    /** Wrap the panel rows in a double-line CRT bezel with a banner and status readout. */
    frame(width, rows) {
        const innerWidth = width - 4;
        const state = this.state;
        const out = [];
        const brand = "FLEET";
        const sub = " · pi·bonsai ";
        const fill = Math.max(0, width - (`╔═[ ${brand} ]`.length + sub.length) - 1);
        out.push(bezel("╔═[ ") + phos(bold(brand)) + bezel(" ]") + amber(sub) + bezel(`${"═".repeat(fill)}╗`));
        for (const row of rows) {
            out.push(`${bezel("║")} ${padCell(row, innerWidth)} ${bezel("║")}`);
        }
        const blink = Math.floor(Date.now() / 1000) % 2 === 0;
        const cursor = blink ? "█" : " ";
        const clock = formatClock(Date.now());
        const status = state.errors[0] ? "alert" : "live";
        const hintLead = "╚═[ ↑↓ agent · tab checks · q quit · r refresh ]";
        const hintTailRaw = ` ${clock} [ ${status} ${cursor} ] `;
        const dash = Math.max(0, width - hintLead.length - hintTailRaw.length - 1);
        out.push(bezel(hintLead + "═".repeat(dash)) +
            bezel(" ") +
            phos(clock) +
            bezel(` [ ${status} `) +
            phosBright(cursor) +
            bezel(" ] ") +
            bezel("╝"));
        return out;
    }
}
//# sourceMappingURL=dashboard.js.map