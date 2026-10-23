import { App, PluginSettingTab, Setting } from "obsidian";
import type SpindiSyncPlugin from "../main";

export class SpindiSyncSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: SpindiSyncPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Einstellungen für Download" });

    new Setting(containerEl)
      .setName("Quellverzeichnis")
      .setDesc("Pfad zu dem Ordner, der heruntergeladen werden soll.")
      .addText((text) => {
        text
          .setPlaceholder("Pfad zum Quellordner")
          .setValue(this.plugin.settings.sourceDir)
          .onChange(async (value) => {
            this.plugin.settings.sourceDir = value;
            await this.plugin.saveSettings();
          });
        text.inputEl.style.width = "100%";
      });

    new Setting(containerEl)
      .setName("Log-Datei verwenden")
      .setDesc("Erstellt eine Log-Datei der heruntergeladenen Dateien.")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.logEnabled)
          .onChange(async (value) => {
            this.plugin.settings.logEnabled = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Download beim Start von Obsidian")
      .setDesc("Führt den Download jedes Mal beim Start von Obsidian aus.")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.fetchOnStartup)
          .onChange(async (value) => {
            this.plugin.settings.fetchOnStartup = value;
            await this.plugin.saveSettings();
          });
      });
  }
}
