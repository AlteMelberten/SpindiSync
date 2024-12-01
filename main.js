const { Plugin, Modal, Notice } = require("obsidian");

module.exports = class TestPlugin extends Plugin {
  async onload() {
    console.log("Test-Plugin geladen, Version:", this.manifest.version);

    // Hole die updateUrl aus der manifest.json
    const updateUrl = this.manifest.updateUrl;

    console.log("updateUrl :", updateUrl);

    //vorherige Version mit ODER-Verknüpfung
    /* const updateUrl =
      this.manifest.updateUrl ||
      "https://raw.githubusercontent.com/AlteMelberten/test-plugin/main/versions.json"; */

    // Starte den Update-Checker
    await this.checkForUpdates(updateUrl);

    // Hauptaufgabe des Plugins ausführen
    //TODO hier Das Herunterladen der pages- und assets einbauen
    //Lade Einstellungen
    await this.loadSettings();

    // Download von Assets/Pages bei Start ausführen, falls aktiviert
    if (this.settings.fetchOnStartup) {
      this.runDownload();
    }
  }

  //DEF der Plugin-Funktionen für onload
  async checkForUpdates(updateUrl) {
    try {
      // Abrufen der `versions.json`
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

        // Modal zur Bestätigung des Updates anzeigen
        const modal = new UpdateModal(this.app, latestVersion, this);
        modal.open();
      } else {
        console.log("Keine Updates verfügbar.");
      }
    } catch (error) {
      // Fehler beim Update-Check ignorieren
      console.warn("Fehler beim Update-Check:", error);
      new Notice(
        "Update-Check fehlgeschlagen. Das Plugin funktioniert weiterhin."
      );
    }
  }

  async downloadAndSave(latestVersion) {
    try {
      const filesToUpdate = ["manifest.json", "main.js"];
      const repoBase = `https://raw.githubusercontent.com/AlteMelberten/test-plugin/${latestVersion}/`;
      // const repoBase = `https://raw.githubusercontent.com/AlteMelberten/test-plugin/${latestVersion}/?cache_bust=${Date.now()}`;

      // Lade jede Datei herunter und speichere sie
      for (const file of filesToUpdate) {
        const fileUrl = `${repoBase}${file}`;

        //check: richtige Datei???
        console.log("downloaden: ", fileUrl);

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
  //Wenn Plugin entladen wird
  onunload() {
    console.log("Test-Plugin entladen.");
  }
  //NOTE : Hauptfunktionen des Plugins : markdown Dateien und Assets kopieren
  // Einstellungen aus data.json laden
  async loadSettings() {
    // Lade die gespeicherten Daten, wenn vorhanden
    const savedSettings = await this.loadData();

    // Verwende gespeicherte Einstellungen, wenn vorhanden, sonst Standardwerte
    this.settings = {
      sourceDir:
        savedSettings?.sourceDir ||
        "E:\\Schule\\Fächer\\INF\\inf 07\\KST7_Sourcesync",
      logEnabled: savedSettings?.logEnabled ?? true,
      fetchOnStartup: savedSettings?.fetchOnStartup ?? false, // Standardwert nur, wenn keine gespeicherten Daten vorhanden sind
    };
  }

  /* rundownload ist übergeordnete Funktion, ruft writeLog und fetchFiles auf,
   die innerhalb von rundownload definiert werden */
  async runDownload() {
    const fs = require("fs");
    const path = require("path");

    const baseSourceDir = this.settings.sourceDir; // Vom Benutzer gesetztes Quellverzeichnis
    const targetDir = app.vault.adapter.basePath; // Zielverzeichnis (Obsidian-Vault)
    const logEnabled = this.settings.logEnabled; // Logging aktivieren oder nicht
    const logDir = path.join(targetDir, "pages");
    const logFilePath = path.join(logDir, "log.md");
    const ordnerListe = ["pages", "assets"]; // Liste der herunterzuladenden Ordner

    function writeLog(message) {
      if (logEnabled) {
        fs.appendFileSync(logFilePath, message + "\n", "utf8");
      }
    }

    function fetchFiles(sourceDir) {
      const timestamp = new Date().toLocaleString();
      writeLog(
        `\n--- Synchronisation für ${path.basename(
          sourceDir
        )} am ${timestamp} ---`
      );

      fs.readdirSync(sourceDir).forEach((file) => {
        const sourceFilePath = path.join(sourceDir, file);
        const targetFilePath = path.join(
          targetDir,
          path.basename(sourceDir),
          file
        );
        const relativePath = path.relative(targetDir, targetFilePath);

        if (!fs.existsSync(targetFilePath)) {
          fs.copyFileSync(sourceFilePath, targetFilePath);
          writeLog(`Kopiert: ${relativePath}`);
        } else {
          writeLog(`Übersprungen (bereits vorhanden): ${relativePath}`);
        }
      });
      writeLog("");
    }

    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

    ordnerListe.forEach((ordner) => {
      const sourceDir = path.join(baseSourceDir, ordner);
      fetchFiles(sourceDir);
    });

    new Notice("Download abgeschlossen.");
  }
  // Einstellungen in data.json speichern
  async saveSettings() {
    await this.saveData(this.settings);
  }
};

//################ Obsidian-EINSTELLUNGS-TAB ###############
class MySyncPluginSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Einstellungen für Download" });

    // Einstellung für den Quellordner
    new Setting(containerEl)
      .setName("Quellverzeichnis")
      .setDesc("Pfad zu dem Ordner, der runtergeladen werden soll.")
      .addText((text) => {
        text
          .setPlaceholder("Pfad zum Quellordner")
          .setValue(this.plugin.settings.sourceDir)
          .onChange(async (value) => {
            this.plugin.settings.sourceDir = value;
            await this.plugin.saveSettings(); // Stelle sicher, dass die Einstellungen gespeichert werden
          });
        text.inputEl.style.width = "100%"; // Breite des Textfeldes anpassen
      });

    // Einstellung für Log-Datei
    new Setting(containerEl)
      .setName("Log-Datei verwenden")
      .setDesc("Erstellt eine Log-Datei der herunterzuladenden Dateien.")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.logEnabled)
          .onChange(async (value) => {
            this.plugin.settings.logEnabled = value;
            await this.plugin.saveSettings(); // Stelle sicher, dass die Einstellungen gespeichert werden
          });
      });

    // Einstellung für Download beim Start
    new Setting(containerEl)
      .setName("Download beim Start von Obsidian")
      .setDesc("Führt den Download jedesmal beim Start von Obsidian aus.")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.fetchOnStartup) // Setze den initialen Wert der Einstellung
          .onChange(async (value) => {
            this.plugin.settings.fetchOnStartup = value; // Aktualisiere die Einstellung
            await this.plugin.saveSettings(); // Speichere die geänderte Einstellung
          });
      });
  }
}

/* ################ Modale Dialoge Für Bestätigung des Plugin-Updates ###############*/
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
/* ################ REAKTIVIERUNG ######### */
// Modal für Deaktivierung und Reaktivierung des Plugins
class ReloadPluginModal extends Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.setText(
      "Das Plugin wurde erfolgreich aktualisiert. Um die Änderungen vollständig zu übernehmen, sollte Obsidian neu geladen werden."
    );

    const buttonContainer = contentEl.createDiv({
      cls: "modal-button-container",
    });

    // "Obsidian neu laden"-Button
    const reloadButton = buttonContainer.createEl("button", {
      text: "Obsidian neu laden",
    });
    reloadButton.onclick = () => {
      this.close();
      // Führe den Obsidian-Befehl aus, um die App neu zu laden
      this.plugin.app.commands.executeCommandById("app:reload");
      new Notice("Obsidian wird neu geladen...");
    };

    // "Später"-Button
    const laterButton = buttonContainer.createEl("button", { text: "Später" });
    laterButton.onclick = () => {
      this.close();
      new Notice("Das Plugin wird nach einem Neustart aktualisiert.");
    };
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
