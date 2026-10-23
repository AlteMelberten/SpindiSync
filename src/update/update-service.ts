//Versionsprüfung und Update-Download für das Plugin SpindiSync

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { App, DataAdapter, Notice, PluginManifest } from "obsidian";
import { ReloadPluginModal, UpdateModal } from "./update-modals";

interface SpindiSyncManifest extends PluginManifest {
  updateUrl?: string;
}

interface VersionMap {
  [version: string]: string;
}

function getVaultRoot(adapter: DataAdapter): string {
  if (!("basePath" in adapter) || typeof adapter.basePath !== "string") {
    throw new Error("Der lokale Dateisystempfad des Vaults ist nicht verfügbar.");
  }

  return adapter.basePath;
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

export class UpdateService {
  constructor(
    private readonly app: App,
    private readonly manifest: SpindiSyncManifest,
  ) {}

  async checkForUpdates(): Promise<void> {
    const updateUrl = this.manifest.updateUrl;
    if (!updateUrl) {
      return;
    }

    try {
      const response = await fetch(updateUrl);
      if (!response.ok) {
        throw new Error(`Fehler beim Abrufen der Versions.json: ${response.status}`);
      }

      const versions = (await response.json()) as VersionMap;
      const latestVersion = Object.keys(versions).sort(compareVersions).pop();

      if (latestVersion && compareVersions(latestVersion, this.manifest.version) > 0) {
        new Notice(`Eine neue Version (${latestVersion}) des Plugins ist verfügbar!`);
        new UpdateModal(this.app, latestVersion, () => this.downloadAndSave(latestVersion)).open();
      }
    } catch (error) {
      console.warn("Fehler beim Update-Check:", error);
      new Notice("Update-Check fehlgeschlagen. Das Plugin funktioniert weiterhin.");
    }
  }

  async downloadAndSave(latestVersion: string): Promise<void> {
    try {
      const filesToUpdate = ["manifest.json", "main.js"];
      const repoBase = `https://raw.githubusercontent.com/AlteMelberten/SpindiSync/${latestVersion}/`;
      const vaultRoot = getVaultRoot(this.app.vault.adapter);
      const pluginFolder = path.join(
        vaultRoot,
        this.manifest.dir ?? path.join(this.app.vault.configDir, "plugins", this.manifest.id),
      );

      for (const file of filesToUpdate) {
        const response = await fetch(`${repoBase}${file}`);
        if (!response.ok) {
          throw new Error(`Fehler beim Abrufen von ${file}: ${response.status}`);
        }
        await fs.writeFile(path.join(pluginFolder, file), await response.text(), "utf8");
      }

      new ReloadPluginModal(this.app).open();
    } catch (error) {
      console.error("Fehler beim Herunterladen des Updates:", error);
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      new Notice(`Update fehlgeschlagen: ${message}`);
    }
  }
}
