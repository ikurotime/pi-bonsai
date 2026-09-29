/** Root dashboard component: a full-screen CRT console that re-renders on store updates. */

import type { Component } from "@earendil-works/pi-tui";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import { formatClock } from "../format.js";
import type { DashboardStore } from "../store.js";
import { bezel, bold, phos, phosBright } from "../theme.js";
import type { DashboardState } from "../types.js";
import { fitBody, panel, splitWidths, twoColumn } from "./panel.js";
import { agentsBody, feedBody, fleetBody, modelsBody, prsBody, sessionsBody } from "./panels.js";

export interface DashboardOptions {
	/** Terminal height provider; defaults to the current stdout rows. */
	getHeight?: () => number;
}

function padCell(content: string, width: number): string {
	const clipped = truncateToWidth(content, width);
	const gap = width - visibleWidth(clipped);
	return gap > 0 ? clipped + " ".repeat(gap) : clipped;
}

export class DashboardComponent implements Component {
	private state: DashboardState;
	private onUpdate?: () => void;
	private readonly getHeight: () => number;

	constructor(
		private readonly store: DashboardStore,
		options: DashboardOptions = {},
	) {
		this.getHeight = options.getHeight ?? (() => process.stdout.rows || 40);
		this.state = store.getState();
		store.subscribe((state) => {
			this.state = state;
			this.onUpdate?.();
		});
	}

	setUpdateCallback(callback: () => void): void {
		this.onUpdate = callback;
	}

	invalidate(): void {}

	render(width: number): string[] {
		const W = Math.max(64, width);
		const H = Math.max(18, this.getHeight());
		const contentWidth = W - 4;
		const contentHeight = H - 2;
		const state = this.state;

		// Row 1: grow log + fleet.
		const [leftW, rightW] = splitWidths(contentWidth, 0.4, 2);
		const showBonsai = contentHeight >= 34;
		const row1 = twoColumn(
			panel(leftW, "grow log · 1w", phos, sessionsBody(leftW, state, showBonsai)),
			panel(rightW, "fleet", phos, fleetBody(rightW, state)),
			leftW,
			rightW,
		);

		// Row 2: agents / canopy.
		const agents = panel(contentWidth, `canopy · ${state.agents.length} live`, phos, agentsBody(contentWidth, state));

		// Row 3: models + pull requests.
		const [l2, r2] = splitWidths(contentWidth, 0.4, 2);
		const row3 = twoColumn(
			panel(l2, "models · session", phos, modelsBody(l2, state)),
			panel(r2, state.repo ? `pull requests · ${state.repo}` : "pull requests", phos, prsBody(r2, state)),
			l2,
			r2,
		);

		// Feed absorbs the leftover height so the console always fills the screen.
		const used = row1.length + agents.length + row3.length;
		const feedHeight = Math.max(5, contentHeight - used);
		const feed = panel(contentWidth, "feed", phos, fitBody(feedBody(contentWidth, state), feedHeight - 2));

		let rows = [...row1, ...agents, ...row3, ...feed];
		if (rows.length < contentHeight) {
			rows = [...rows, ...Array.from({ length: contentHeight - rows.length }, () => "")];
		}
		return this.frame(W, rows);
	}

	/** Wrap the panel rows in a double-line CRT bezel with a status readout. */
	private frame(width: number, rows: string[]): string[] {
		const innerWidth = width - 4;
		const state = this.state;
		const out: string[] = [];

		const lead = "╔═[ PI·BONSAI ]";
		const fill = Math.max(0, width - lead.length - 1);
		out.push(bezel("╔═[ ") + phos(bold("PI·BONSAI")) + bezel(` ]${"═".repeat(fill)}╗`));

		for (const row of rows) {
			out.push(`${bezel("║")} ${padCell(row, innerWidth)} ${bezel("║")}`);
		}

		const blink = Math.floor(Date.now() / 1000) % 2 === 0;
		const cursor = blink ? "█" : " ";
		const clock = formatClock(Date.now());
		const status = state.errors[0] ? "alert" : "live";
		const hintLead = "╚═[ q quit · r refresh ]";
		const hintTailRaw = ` ${clock} [ ${status} ${cursor} ] `;
		const dash = Math.max(0, width - hintLead.length - hintTailRaw.length - 1);
		out.push(
			bezel(hintLead + "═".repeat(dash)) +
				bezel(" ") +
				phos(clock) +
				bezel(` [ ${status} `) +
				phosBright(cursor) +
				bezel(" ] ") +
				bezel("╝"),
		);
		return out;
	}
}
