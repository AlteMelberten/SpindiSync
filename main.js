const { Plugin, Notice } = require("obsidian");
const path = require("path");

module.exports = class TestPlugin extends Plugin {
  async onload() {
    console.log(
      this.manifest.name,
      " geladen, Version:",
      this.manifest.version
    );

    const pluginFolder =
      this.app.vault.adapter.basePath +
      "/.obsidian/plugins/" +
      this.manifest.id;

    // Absoluter Pfad zur Datei update.js
    const updatePath = path.join(pluginFolder, "update.js");

    //Modul dynamisch importieren
    const update = require(updatePath);

    // Hole die updateUrl aus der manifest.json
    const updateUrl =
      this.manifest.updateUrl ||
      "https://raw.githubusercontent.com/AlteMelberten/test-plugin/main/versions.json";

    // Starte den Update-Checker
    await update.checkForUpdates(this, updateUrl);
  }

  // Speichern der Dateien
  async saveFile(fileName, content) {
    const pluginFolder =
      this.app.vault.adapter.basePath +
      "/.obsidian/plugins/" +
      this.manifest.id;

    const fs = require("fs");
    const path = require("path");

    const filePath = path.join(pluginFolder, fileName);
    fs.writeFileSync(filePath, content, "utf-8");
    console.log(`Datei gespeichert: ${filePath}`);
  }

  onunload() {
    console.log("Test-Plugin entladen.");
  }
};
