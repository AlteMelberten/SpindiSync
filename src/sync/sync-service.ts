//Kopierlogik und Logfilelogik

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { App, DataAdapter, Notice } from "obsidian";
import type { SpindiSyncSettings } from "../settings/settings";

function getVaultRoot(adapter: DataAdapter): string {
  if (!("basePath" in adapter) || typeof adapter.basePath !== "string") {
    throw new Error("Der lokale Dateisystempfad des Vaults ist nicht verfügbar.");
  }

  return adapter.basePath;
}

function isNotFoundError(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

export class SyncService {
  constructor(
    private readonly app: App,
    private readonly getSettings: () => SpindiSyncSettings,
  ) {}

  async runDownload(): Promise<void> {
    try {
      const settings = this.getSettings();
      const sourceRoot = settings.sourceDir.trim();
      if (!sourceRoot) {
        throw new Error("Bitte zuerst ein Quellverzeichnis festlegen.");
      }

      const vaultRoot = getVaultRoot(this.app.vault.adapter);
      const logFilePath = path.join(vaultRoot, "pages", "log.md");
      const logMessages: string[] = [];

      await fs.mkdir(path.dirname(logFilePath), { recursive: true });

      const writeLog = async (message: string): Promise<void> => {
        logMessages.push(message);
        if (settings.logEnabled) {
          await fs.appendFile(logFilePath, `${message}\n`, "utf8");
        }
      };

      for (const folder of ["pages", "assets"]) {
        const sourceDir = path.join(sourceRoot, folder);
        const targetDir = path.join(vaultRoot, folder);
        await fs.mkdir(targetDir, { recursive: true });
        await writeLog(`\n-- im Ordner ${folder} am ${new Date().toLocaleString()} --`);
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
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
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
        await this.copyMissingFiles(sourcePath, targetPath, vaultRoot, writeLog);
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
}
