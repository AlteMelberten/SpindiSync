const { Plugin } = require("obsidian");

module.exports = class TestPlugin extends Plugin {
  onload() {
    console.log("Test-Plugin Version 1.0.0 erfolgreich geladen!");

     Protokolliere die URL zur Versionsprüfung
     console.log("Update-URL in der Manifest:", this.manifest.updateUrl);
  }

  onunload() {
    console.log("Test-Plugin wurde entladen.");
  }
};
