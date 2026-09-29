/** Root dashboard component: composes panels and re-renders on store updates. */

import type { Component } from "@earendil-works/pi-tui";
import { visibleWidth } from "@earendil-works/pi-tui";
import type { DashboardStore } from "../store.js";
import { muted, pink, text } from "../theme.js";
import type { DashboardState } from "../types.js";
import { panel, splitWidths, twoColumn } from "./panel.js";
import { agentsBody, feedBody, fleetBody, modelsBody, prsBody, sessionsBody } from "./panels.js";

export class DashboardComponent implements Component {
	private state: DashboardState;
	private onUpdate?: () => void;

	constructor(private readonly store: DashboardStore) {
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
		const w = Math.max(72, width);
		const [leftW, rightW] = splitWidths(w, 0.4, 2);
		const state = this.state;
		const rows: string[] = [];

		rows.push(
			...twoColumn(
				panel(leftW, "closed · 1w", pink, sessionsBody(leftW, state)),
				panel(rightW, "fleet", pink, fleetBody(rightW, state)),
				leftW,
				rightW,
			),
		);

		rows.push(...panel(w, `agents · ${state.agents.length} live`, pink, agentsBody(w, state)));

		rows.push(
			...twoColumn(
				panel(leftW, "models · session", pink, modelsBody(leftW, state)),
				panel(rightW, state.repo ? `pull requests · ${state.repo}` : "pull requests", pink, prsBody(rightW, state)),
				leftW,
				rightW,
			),
		);

		rows.push(...panel(w, "feed", pink, feedBody(w, state)));
		rows.push(this.renderFooter(w));
		return rows;
	}

	private renderFooter(width: number): string {
		const left = `${pink("pi-fleet")} ${muted("·")} ${text(new Date(this.state.generatedAt).toLocaleTimeString())} ${muted(`· ${this.state.errors[0] ?? "live"}`)}`;
		const right = muted("q quit · r refresh");
		const gap = Math.max(1, width - visibleWidth(left) - visibleWidth(right));
		return `${left}${" ".repeat(gap)}${right}`;
	}
}
