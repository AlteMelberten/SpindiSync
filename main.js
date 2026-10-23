"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => SpindiSyncPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian5 = require("obsidian");

// src/settings/settingstab.ts
var import_obsidian = require("obsidian");
var SpindiSyncSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Einstellungen f\xFCr Download" });
    new import_obsidian.Setting(containerEl).setName("Quellverzeichnis").setDesc("Pfad zu dem Ordner, der heruntergeladen werden soll.").addText((text) => {
      text.setPlaceholder("Pfad zum Quellordner").setValue(this.plugin.settings.sourceDir).onChange(async (value) => {
        this.plugin.settings.sourceDir = value;
        await this.plugin.saveSettings();
      });
      text.inputEl.style.width = "100%";
    });
    new import_obsidian.Setting(containerEl).setName("Log-Datei verwenden").setDesc("Erstellt eine Log-Datei der heruntergeladenen Dateien.").addToggle((toggle) => {
      toggle.setValue(this.plugin.settings.logEnabled).onChange(async (value) => {
        this.plugin.settings.logEnabled = value;
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian.Setting(containerEl).setName("Download beim Start von Obsidian").setDesc("F\xFChrt den Download jedes Mal beim Start von Obsidian aus.").addToggle((toggle) => {
      toggle.setValue(this.plugin.settings.fetchOnStartup).onChange(async (value) => {
        this.plugin.settings.fetchOnStartup = value;
        await this.plugin.saveSettings();
      });
    });
  }
};

// src/settings/settings.ts
var DEFAULT_SETTINGS = {
  sourceDir: "E:\\SpindiSynvDwnl",
  logEnabled: true,
  fetchOnStartup: false
};

// src/sync/sync-service.ts
var fs = __toESM(require("node:fs/promises"));
var path = __toESM(require("node:path"));
var import_obsidian2 = require("obsidian");
function getVaultRoot(adapter) {
  if (!("basePath" in adapter) || typeof adapter.basePath !== "string") {
    throw new Error("Der lokale Dateisystempfad des Vaults ist nicht verf\xFCgbar.");
  }
  return adapter.basePath;
}
function isNotFoundError(error) {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
var SyncService = class {
  constructor(app, getSettings) {
    this.app = app;
    this.getSettings = getSettings;
  }
  async runDownload() {
    try {
      const settings = this.getSettings();
      const sourceRoot = settings.sourceDir.trim();
      if (!sourceRoot) {
        throw new Error("Bitte zuerst ein Quellverzeichnis festlegen.");
      }
      const vaultRoot = getVaultRoot(this.app.vault.adapter);
      const logFilePath = path.join(vaultRoot, "pages", "log.md");
      const logMessages = [];
      await fs.mkdir(path.dirname(logFilePath), { recursive: true });
      const writeLog = async (message2) => {
        logMessages.push(message2);
        if (settings.logEnabled) {
          await fs.appendFile(logFilePath, `${message2}
`, "utf8");
        }
      };
      for (const folder of ["pages", "assets"]) {
        const sourceDir = path.join(sourceRoot, folder);
        const targetDir = path.join(vaultRoot, folder);
        await fs.mkdir(targetDir, { recursive: true });
        await writeLog(
          `
-- im Ordner ${folder} am ${(/* @__PURE__ */ new Date()).toLocaleString()} --`
        );
        await this.copyMissingFiles(sourceDir, targetDir, vaultRoot, writeLog);
        await writeLog("");
      }
      const message = logMessages.length > 0 ? `Download abgeschlossen:
${logMessages.join("\n")}` : "Keine Dateien zum Synchronisieren gefunden.";
      new import_obsidian2.Notice(message, 1e4);
    } catch (error) {
      console.error("Fehler beim Synchronisieren:", error);
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      new import_obsidian2.Notice(`Download fehlgeschlagen: ${message}`, 1e4);
    }
  }
  async copyMissingFiles(sourceDir, targetDir, vaultRoot, writeLog) {
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
          writeLog
        );
      } else if (entry.isFile()) {
        try {
          await fs.access(targetPath);
          await writeLog(`\xDCbersprungen (bereits vorhanden): ${relativePath}`);
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
};

// src/update/update-service.ts
var fs2 = __toESM(require("node:fs/promises"));
var path2 = __toESM(require("node:path"));
var import_obsidian4 = require("obsidian");

// src/update/update-modals.ts
var import_obsidian3 = require("obsidian");
var UpdateModal = class extends import_obsidian3.Modal {
  constructor(app, latestVersion, onConfirm) {
    super(app);
    this.latestVersion = latestVersion;
    this.onConfirm = onConfirm;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.setText(
      `Eine neue Version (${this.latestVersion}) des Plugins ist verf\xFCgbar. M\xF6chtest du das Update jetzt herunterladen?`
    );
    const buttonContainer = contentEl.createDiv({
      cls: "modal-button-container"
    });
    buttonContainer.createEl("button", { text: "Ja" }).onclick = async () => {
      await this.onConfirm();
      this.close();
    };
    buttonContainer.createEl("button", { text: "Nein" }).onclick = () => {
      new import_obsidian3.Notice("Update abgebrochen.");
      this.close();
    };
  }
  onClose() {
    this.contentEl.empty();
  }
};
var ReloadPluginModal = class extends import_obsidian3.Modal {
  onOpen() {
    const { contentEl } = this;
    contentEl.setText(
      "Das Plugin wurde erfolgreich aktualisiert. Um die \xC4nderungen vollst\xE4ndig zu \xFCbernehmen, sollte Obsidian neu geladen werden."
    );
    const buttonContainer = contentEl.createDiv({
      cls: "modal-button-container"
    });
    buttonContainer.createEl("button", {
      text: "Obsidian neu laden"
    }).onclick = () => {
      this.close();
      this.app.commands.executeCommandById("app:reload");
      new import_obsidian3.Notice("Obsidian wird neu geladen...");
    };
    buttonContainer.createEl("button", { text: "Sp\xE4ter" }).onclick = () => {
      this.close();
      new import_obsidian3.Notice("Das Plugin wird nach einem Neustart aktualisiert.");
    };
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/update/update-service.ts
function getVaultRoot2(adapter) {
  if (!("basePath" in adapter) || typeof adapter.basePath !== "string") {
    throw new Error("Der lokale Dateisystempfad des Vaults ist nicht verf\xFCgbar.");
  }
  return adapter.basePath;
}
function compareVersions(left, right) {
  var _a, _b;
  const leftParts = left.split(".").map(Number);
  const rightParts = right.split(".").map(Number);
  const partCount = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < partCount; index += 1) {
    const difference = ((_a = leftParts[index]) != null ? _a : 0) - ((_b = rightParts[index]) != null ? _b : 0);
    if (difference !== 0) {
      return difference;
    }
  }
  return 0;
}
var UpdateService = class {
  constructor(app, manifest) {
    this.app = app;
    this.manifest = manifest;
  }
  async checkForUpdates() {
    const updateUrl = this.manifest.updateUrl;
    if (!updateUrl) {
      return;
    }
    try {
      const response = await fetch(updateUrl);
      if (!response.ok) {
        throw new Error(
          `Fehler beim Abrufen der Versions.json: ${response.status}`
        );
      }
      const versions = await response.json();
      const latestVersion = Object.keys(versions).sort(compareVersions).pop();
      if (latestVersion && compareVersions(latestVersion, this.manifest.version) > 0) {
        new import_obsidian4.Notice(
          `Eine neue Version (${latestVersion}) des Plugins ist verf\xFCgbar!`
        );
        new UpdateModal(
          this.app,
          latestVersion,
          () => this.downloadAndSave(latestVersion)
        ).open();
      }
    } catch (error) {
      console.warn("Fehler beim Update-Check:", error);
      new import_obsidian4.Notice(
        "Update-Check fehlgeschlagen. Das Plugin funktioniert weiterhin."
      );
    }
  }
  async downloadAndSave(latestVersion) {
    var _a;
    try {
      const filesToUpdate = ["manifest.json", "main.js"];
      const repoBase = `https://raw.githubusercontent.com/AlteMelberten/SpindiSync/${latestVersion}/`;
      const vaultRoot = getVaultRoot2(this.app.vault.adapter);
      const pluginFolder = path2.join(
        vaultRoot,
        (_a = this.manifest.dir) != null ? _a : path2.join(this.app.vault.configDir, "plugins", this.manifest.id)
      );
      for (const file of filesToUpdate) {
        const response = await fetch(`${repoBase}${file}`);
        if (!response.ok) {
          throw new Error(`Fehler beim Abrufen von ${file}: ${response.status}`);
        }
        await fs2.writeFile(
          path2.join(pluginFolder, file),
          await response.text(),
          "utf8"
        );
      }
      new ReloadPluginModal(this.app).open();
    } catch (error) {
      console.error("Fehler beim Herunterladen des Updates:", error);
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      new import_obsidian4.Notice(`Update fehlgeschlagen: ${message}`);
    }
  }
};

// src/main.ts
var SpindiSyncPlugin = class extends import_obsidian5.Plugin {
  constructor() {
    super(...arguments);
    this.settings = DEFAULT_SETTINGS;
  }
  async onload() {
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
      callback: () => this.syncService.runDownload()
    });
    this.addRibbonIcon(
      "refresh-cw",
      "Run Spindi Download",
      () => this.syncService.runDownload()
    );
    this.addSettingTab(new SpindiSyncSettingTab(this.app, this));
  }
  onunload() {
    console.log("SpindiSync Plugin entladen.");
  }
  async loadSettings() {
    const savedSettings = await this.loadData();
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...savedSettings
    };
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
};
