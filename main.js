/*
Was macht dieser Code?

    Manueller Update-Check protokolliert:
        Wir überschreiben die Methode checkForUpdates und loggen alle Schritte:
            updateUrl wird geprüft.
            Der Abruf der versions.json wird protokolliert.
            Ergebnisse der Versionsprüfung werden ausgegeben.

    Fehler werden abgefangen:
        HTTP-Fehler (z. B. 404 Not Found) und Fetch-Fehler werden direkt in der Konsole angezeigt.

    Erweiterte Protokollierung:
        Logs helfen uns zu sehen, ob Obsidian überhaupt versucht, die updateUrl zu verwenden.

*/



const { Plugin } = require('obsidian');

module.exports = class TestPlugin extends Plugin {
  onload() {
    console.log("Test-Plugin erfolgreich geladen!");
    console.log("Aktuelle Version des Plugins:", this.manifest.version);
    console.log("Update-URL in der Manifest:", this.manifest.updateUrl);

    // Überprüfen, ob der Update-Mechanismus überhaupt aufgerufen wird
    this.app.plugins.checkForUpdates = async () => {
      console.log("Update-Check wird manuell ausgelöst...");
      const updateUrl = this.manifest.updateUrl;
      if (!updateUrl) {
        console.warn("Keine Update-URL vorhanden.");
        return;
      }

      try {
        const response = await fetch(updateUrl);
        if (!response.ok) {
          console.error(`HTTP-Fehler bei ${updateUrl}:`, response.status);
          return;
        }
        const data = await response.json();
        console.log("Versions.json-Inhalt:", data);

        const pluginVersion = data.pluginVersion;
        if (pluginVersion > this.manifest.version) {
          console.log(`Update verfügbar: ${pluginVersion} ist neuer als ${this.manifest.version}`);
        } else {
          console.log("Kein Update verfügbar.");
        }
      } catch (error) {
        console.error("Fehler beim Abrufen der Versions.json:", error);
      }
    };
  }

  onunload() {
    console.log("Test-Plugin wurde entladen.");
  }
};
