import * as fs from "node:fs/promises";
import * as path from "node:path";
import {
  App,
  DataAdapter,
  Modal,
  Notice,
  Plugin,
  PluginManifest,
} from "obsidian";
import { SpindiSyncSettingTab } from "./settings/settingstab";
import {
  DEFAULT_SETTINGS,
  SpindiSyncSettings,
} from "./settings/settings";

interface VersionMap {
  [version: string]: string;
}

interface AppWithCommands extends App {
  commands: {
    executeCommandById(commandId: string): boolean;
  };
}

function getVaultRoot(adapter: DataAdapter): string {
  if (!("basePath" in adapter) || typeof adapter.basePath !== "string") {
    throw new Error("Der lokale Dateisystempfad des Vaults ist nicht verfügbar.");
  }

  return adapter.basePath;
}

function isNotFoundError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    error.code === "ENOENT"
  );
}

export default class SpindiSyncPlugin extends Plugin {
  settings: SpindiSyncSettings = DEFAULT_SETTINGS;

  async onload(): Promise<void> {
    console.log("SpindiSync-Plugin geladen, Version:", this.manifest.version);

    await this.loadSettings();
    await this.checkForUpdates();

    if (this.settings.fetchOnStartup) {
      void this.runDownload();
    }

    this.addCommand({
      id: "run-fetch",
      name: "Run Synchronization",
      callback: () => this.runDownload(),
    });

    this.addRibbonIcon("refresh-cw", "Run Spindi Download", () =>
      this.runDownload(),
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

  async runDownload(): Promise<void> {
    try {
      const sourceRoot = this.settings.sourceDir.trim();
      if (!sourceRoot) {
        throw new Error("Bitte zuerst ein Quellverzeichnis festlegen.");
      }

      const vaultRoot = getVaultRoot(this.app.vault.adapter);
      const targetFolders = ["pages", "assets"];
      const logFilePath = path.join(vaultRoot, "pages", "log.md");
      const logMessages: string[] = [];

      await fs.mkdir(path.dirname(logFilePath), { recursive: true });

      const writeLog = async (message: string): Promise<void> => {
        logMessages.push(message);
        if (this.settings.logEnabled) {
          await fs.appendFile(logFilePath, `${message}\n`, "utf8");
        }
      };

      for (const folder of targetFolders) {
        const sourceDir = path.join(sourceRoot, folder);
        const targetDir = path.join(vaultRoot, folder);
        await fs.mkdir(targetDir, { recursive: true });
        await writeLog(
          `\n-- im Ordner ${folder} am ${new Date().toLocaleString()} --`,
        );
        await this.copyMissingFiles(sourceDir, targetDir, vaultRoot, writeLog);
        await writeLog("");
      }

      const message =
        logMessages.length > 0
          ? `Download abgeschlossen:\n${logMessages.join("\n")}`
          : "Keine Dateien zum Synchronisieren gefunden.";
      new Notice(message, 10000);
    } catch (error) {
      console.error("Fehler beim Synchronisieren:", error);
      const message =
        error instanceof Error ? error.message : "Unbekannter Fehler";
      new Notice(`Download fehlgeschlagen: ${message}`, 10000);
    }
  }

  private async copyMissingFiles(
    sourceDir: string,
    targetDir: string,
    vaultRoot: string,
    writeLog: (message: string) => Promise<void>,
  ): Promise<void> {
    const entries = await fs.readdir(sourceDir, { withFileTypes: true });

    for (const entry of entries) {
      const sourcePath = path.join(sourceDir, entry.name);
      const targetPath = path.join(targetDir, entry.name);
      const relativePath = path.relative(vaultRoot, targetPath);

      if (entry.isDirectory()) {
        await fs.mkdir(targetPath, { recursive: true });
        await this.copyMissingFiles(
          sourcePath,
          targetPath,
          vaultRoot,
          writeLog,
        );
      } else if (entry.isFile()) {
        try {
          await fs.access(targetPath);
          await writeLog(`Übersprungen (bereits vorhanden): ${relativePath}`);
        } catch (error) {
          if (!isNotFoundError(error)) {
            throw error;
          }
          await fs.copyFile(sourcePath, targetPath);
          await writeLog(`Kopiert: ${relativePath}`);
        }
      }
    }
  }

  private async checkForUpdates(): Promise<void> {
    const updateUrl = (
      this.manifest as PluginManifest & { updateUrl?: string }
    ).updateUrl;
    if (!updateUrl) {
      return;
    }

    try {
      const response = await fetch(updateUrl);
      if (!response.ok) {
        throw new Error(
          `Fehler beim Abrufen der Versions.json: ${response.status}`,
        );
      }

      const versions = (await response.json()) as VersionMap;
      const latestVersion = Object.keys(versions).sort(compareVersions).pop();

      if (
        latestVersion &&
        compareVersions(latestVersion, this.manifest.version) > 0
      ) {
        new Notice(
          `Eine neue Version (${latestVersion}) des Plugins ist verfügbar!`,
        );
        new UpdateModal(this.app, latestVersion, this).open();
      }
    } catch (error) {
      console.warn("Fehler beim Update-Check:", error);
      new Notice(
        "Update-Check fehlgeschlagen. Das Plugin funktioniert weiterhin.",
      );
    }
  }

  async downloadAndSave(latestVersion: string): Promise<void> {
    try {
      const filesToUpdate = ["manifest.json", "main.js"];
      const repoBase = `https://raw.githubusercontent.com/AlteMelberten/SpindiSync/${latestVersion}/`;
      const vaultRoot = getVaultRoot(this.app.vault.adapter);
      const pluginFolder = path.join(
        vaultRoot,
        this.manifest.dir ??
          path.join(this.app.vault.configDir, "plugins", this.manifest.id),
      );

      for (const file of filesToUpdate) {
        const response = await fetch(`${repoBase}${file}`);
        if (!response.ok) {
          throw new Error(`Fehler beim Abrufen von ${file}: ${response.status}`);
        }
        await fs.writeFile(
          path.join(pluginFolder, file),
          await response.text(),
          "utf8",
        );
      }

      new ReloadPluginModal(this.app).open();
    } catch (error) {
      console.error("Fehler beim Herunterladen des Updates:", error);
      const message =
        error instanceof Error ? error.message : "Unbekannter Fehler";
      new Notice(`Update fehlgeschlagen: ${message}`);
    }
  }
}

function compareVersions(left: string, right: string): number {
  const leftParts = left.split(".").map(Number);
  const rightParts = right.split(".").map(Number);
  const partCount = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < partCount; index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (difference !== 0) {
      return difference;
    }
  }

  return 0;
}

class UpdateModal extends Modal {
  constructor(
    app: SpindiSyncPlugin["app"],
    private readonly latestVersion: string,
    private readonly plugin: SpindiSyncPlugin,
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.setText(
      `Eine neue Version (${this.latestVersion}) des Plugins ist verfügbar. Möchtest du das Update jetzt herunterladen?`,
    );

    const buttonContainer = contentEl.createDiv({
      cls: "modal-button-container",
    });
    buttonContainer.createEl("button", { text: "Ja" }).onclick = async () => {
      await this.plugin.downloadAndSave(this.latestVersion);
      this.close();
    };
    buttonContainer.createEl("button", { text: "Nein" }).onclick = () => {
      new Notice("Update abgebrochen.");
      this.close();
    };
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

class ReloadPluginModal extends Modal {
  onOpen(): void {
    const { contentEl } = this;
    contentEl.setText(
      "Das Plugin wurde erfolgreich aktualisiert. Um die Änderungen vollständig zu übernehmen, sollte Obsidian neu geladen werden.",
    );

    const buttonContainer = contentEl.createDiv({
      cls: "modal-button-container",
    });
    buttonContainer.createEl("button", {
      text: "Obsidian neu laden",
    }).onclick = () => {
      this.close();
      (this.app as AppWithCommands).commands.executeCommandById("app:reload");
      new Notice("Obsidian wird neu geladen...");
    };
    buttonContainer.createEl("button", { text: "Später" }).onclick = () => {
      this.close();
      new Notice("Das Plugin wird nach einem Neustart aktualisiert.");
    };
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
