/**
 * pi-crtree extension — open the dashboard as a full-screen overlay inside pi.
 *
 * Loaded as part of the pi-crtree package. Run `/fleet` to open it.
 */
import { matchesKey } from "@earendil-works/pi-tui";
import { defaultSessionDirs } from "./collectors/sessions.js";
import { buildConfig, DashboardStore } from "./store.js";
import { DashboardComponent } from "./ui/dashboard.js";
class FleetOverlay {
    tui;
    done;
    dashboard;
    store;
    constructor(tui, done, demo) {
        this.tui = tui;
        this.done = done;
        const config = buildConfig({
            sessionDirs: defaultSessionDirs(),
            repo: process.cwd(),
            demo,
        });
        this.store = new DashboardStore(config);
        this.dashboard = new DashboardComponent(this.store);
        this.dashboard.setUpdateCallback(() => this.tui.requestRender());
    }
    async start() {
        await this.store.poll();
        this.store.start();
    }
    dispose() {
        this.store.stop();
    }
    invalidate() {
        this.dashboard.invalidate();
    }
    render(width) {
        return this.dashboard.render(width);
    }
    handleInput(data) {
        if (matchesKey(data, "q") || matchesKey(data, "escape") || matchesKey(data, "ctrl+c")) {
            this.dispose();
            this.done();
        }
    }
}
export default function (pi) {
    pi.registerCommand("fleet", {
        description: "Open the pi-crtree operations dashboard",
        handler: async (args, ctx) => {
            const demo = args.trim() === "demo";
            await ctx.ui.custom(async (tui, _theme, _keybindings, done) => {
                const overlay = new FleetOverlay(tui, () => done(), demo);
                await overlay.start();
                return overlay;
            }, {
                overlay: true,
                overlayOptions: { anchor: "center", width: "98%", maxHeight: "96%", margin: 1 },
            });
        },
    });
}
//# sourceMappingURL=extension.js.map