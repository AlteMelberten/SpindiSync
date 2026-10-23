import { Plugin } from "obsidian";
import { SpindiSyncSettingTab } from "./settings/settingstab";
import {
  DEFAULT_SETTINGS,
  SpindiSyncSettings,
} from "./settings/settings";
import { SyncService } from "./sync/sync-service";
import { UpdateService } from "./update/update-service";

export default class SpindiSyncPlugin extends Plugin {
  settings: SpindiSyncSettings = DEFAULT_SETTINGS;
  private syncService!: SyncService;
  private updateService!: UpdateService;

  async onload(): Promise<void> {
    console.log("SpindiSync-Plugin geladen, Version:", this.manifest.version);

    await this.loadSettings();
    this.syncService = new SyncService(this.app, () => this.settings);
    this.updateService = new UpdateService(this.app, this.manifest);
    await this.updateService.checkForUpdates();

    if (this.settings.fetchOnStartup) {
      void this.syncService.runDownload();
    }

    this.addCommand({
      id: "run-fetch",
      name: "Run Synchronization",
      callback: () => this.syncService.runDownload(),
    });

    this.addRibbonIcon("refresh-cw", "Run Spindi Download", () =>
      this.syncService.runDownload(),
    );
    this.addSettingTab(new SpindiSyncSettingTab(this.app, this));
  }

  onunload(): void {
    console.log("SpindiSync Plugin entladen.");
  }

  async loadSettings(): Promise<void> {
    const savedSettings =
      (await this.loadData()) as Partial<SpindiSyncSettings> | null;
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...savedSettings,
    };
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}
