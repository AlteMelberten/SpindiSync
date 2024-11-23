const { Plugin, Modal, Notice } = require("obsidian");

module.exports = class TestPlugin extends Plugin {
  async onload() {
    console.log("Test-Plugin geladen, Version:", this.manifest.version);

    // Hole die updateUrl aus der manifest.json
    const updateUrl =
      this.manifest.updateUrl ||
      "https://raw.githubusercontent.com/AlteMelberten/test-plugin/main/versions.json";

    // Starte den Update-Checker
    await this.checkForUpdates(updateUrl);
  }

  async checkForUpdates(updateUrl) {
    try {
      // Abrufen der `versions.json` aus der angegebenen URL
      const response = await fetch(updateUrl);
      if (!response.ok) {
        throw new Error(
          `Fehler beim Abrufen der Versions.json: ${response.status}`
        );
      }
      const versions = await response.json();
      console.log("Versions.json abgerufen:", versions);

      // Neueste Version ermitteln
      const latestVersion = Object.keys(versions).sort().pop();
      console.log("Neueste Version:", latestVersion);

      // Versionsvergleich
      if (latestVersion > this.manifest.version) {
        console.log(
          `Update verfügbar: ${latestVersion} > ${this.manifest.version}`
        );
        new Notice(
          `Eine neue Version (${latestVersion}) des Plugins ist verfügbar!`
        );

        // Öffne ein Modal zur Bestätigung
        const modal = new UpdateModal(this.app, latestVersion, this);
        modal.open();
      } else {
        console.log("Keine Updates verfügbar.");
      }
    } catch (error) {
      console.error("Fehler beim Update-Check:", error);
    }
  }

  async downloadAndSave(latestVersion) {
    try {
      const filesToUpdate = ["manifest.json", "main.js"];
      const repoBase = `https://raw.githubusercontent.com/AlteMelberten/test-plugin/${latestVersion}/`;

      // Lade jede Datei herunter und speichere sie
      for (const file of filesToUpdate) {
        const fileUrl = `${repoBase}${file}`;
        const response = await fetch(fileUrl);
        if (!response.ok) {
          throw new Error(
            `Fehler beim Abrufen von ${file}: ${response.status}`
          );
        }

        const content = await response.text();
        console.log(`Datei ${file} heruntergeladen, Länge: ${content.length}`);
        await this.saveFile(file, content);
      }

      // Update-Hinweis anzeigen und Plugin deaktivieren/aktivieren
      const reloadModal = new ReloadPluginModal(this.app, this);
      reloadModal.open();
    } catch (error) {
      console.error("Fehler beim Herunterladen des Updates:", error);
    }
  }

  async saveFile(fileName, content) {
    const pluginFolder =
      this.app.vault.adapter.basePath +
      "/.obsidian/plugins/" +
      this.manifest.id;

    // Verwende Node.js-Funktionen, um Dateien zu speichern
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

// Modal für Update-Bestätigung
class UpdateModal extends Modal {
  constructor(app, latestVersion, plugin) {
    super(app);
    this.latestVersion = latestVersion;
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.setText(
      `Eine neue Version (${this.latestVersion}) des Plugins ist verfügbar. Möchtest du das Update jetzt herunterladen?`
    );

    const buttonContainer = contentEl.createDiv({
      cls: "modal-button-container",
    });

    // "Ja"-Button
    const yesButton = buttonContainer.createEl("button", { text: "Ja" });
    yesButton.onclick = async () => {
      await this.plugin.downloadAndSave(this.latestVersion);
      this.close();
    };

    // "Nein"-Button
    const noButton = buttonContainer.createEl("button", { text: "Nein" });
    noButton.onclick = () => {
      new Notice("Update abgebrochen.");
      this.close();
    };
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

// Modal für Deaktivierung und Reaktivierung des Plugins
class ReloadPluginModal extends Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.setText(
      "Das Plugin wurde erfolgreich aktualisiert. Um die Änderungen wirksam zu machen, wird das Plugin jetzt deaktiviert und wieder aktiviert."
    );

    const buttonContainer = contentEl.createDiv({
      cls: "modal-button-container",
    });

    // "Plugin neu laden"-Button
    const reloadButton = buttonContainer.createEl("button", {
      text: "Plugin neu laden",
    });
    reloadButton.onclick = () => {
      this.close();
      this.plugin.app.plugins
        .disablePlugin(this.plugin.manifest.id)
        .then(() => {
          this.plugin.app.plugins.enablePlugin(this.plugin.manifest.id);
        });
      new Notice("Plugin wird neu geladen.");
    };

    // "Später"-Button
    const laterButton = buttonContainer.createEl("button", { text: "Später" });
    laterButton.onclick = () => {
      this.close();
      new Notice("Bitte lade das Plugin später neu.");
    };
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
