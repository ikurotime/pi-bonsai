/**
 * pi-crtree extension — open the dashboard as a full-screen overlay inside pi.
 *
 * Loaded as part of the pi-crtree package. Run `/fleet` to open it.
 */

import type { Component, TUI } from "@earendil-works/pi-tui";
import { matchesKey } from "@earendil-works/pi-tui";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { defaultSessionDirs } from "./collectors/sessions.js";
import { buildConfig, DashboardStore } from "./store.js";
import { DashboardComponent } from "./ui/dashboard.js";

class FleetOverlay implements Component {
	private readonly dashboard: DashboardComponent;
	private readonly store: DashboardStore;

	constructor(
		private readonly tui: TUI,
		private readonly done: () => void,
		demo: boolean,
	) {
		const config = buildConfig({
			sessionDirs: defaultSessionDirs(),
			repo: process.cwd(),
			demo,
		});
		this.store = new DashboardStore(config);
		this.dashboard = new DashboardComponent(this.store);
		this.dashboard.setUpdateCallback(() => this.tui.requestRender());
	}

	async start(): Promise<void> {
		await this.store.poll();
		this.store.start();
	}

	dispose(): void {
		this.store.stop();
	}

	invalidate(): void {
		this.dashboard.invalidate();
	}

	render(width: number): string[] {
		return this.dashboard.render(width);
	}

	handleInput(data: string): void {
		if (matchesKey(data, "q") || matchesKey(data, "escape") || matchesKey(data, "ctrl+c")) {
			this.dispose();
			this.done();
		}
	}
}

export default function (pi: ExtensionAPI) {
	pi.registerCommand("fleet", {
		description: "Open the pi-crtree operations dashboard",
		handler: async (args, ctx) => {
			const demo = args.trim() === "demo";
			await ctx.ui.custom<void>(
				async (tui, _theme, _keybindings, done) => {
					const overlay = new FleetOverlay(tui, () => done(), demo);
					await overlay.start();
					return overlay;
				},
				{
					overlay: true,
					overlayOptions: { anchor: "center", width: "98%", maxHeight: "96%", margin: 1 },
				},
			);
		},
	});
}
