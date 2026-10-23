# SpindiSync

SpindiSync ist ein Desktop-Plugin für Obsidian. Es kopiert bereitgestellte
Notizen und Assets aus einem konfigurierbaren Quellverzeichnis in den Vault.
Das Plugin ist in TypeScript geschrieben; esbuild erstellt daraus die von
Obsidian geladene Datei `main.js`.

## Projektstruktur

```text
SpindiSync/
├── src/
│   ├── main.ts                    # Plugin-Einstiegspunkt und Lebenszyklus
│   ├── settings/
│   │   ├── settings.ts            # Einstellungs-Typ und Standardwerte
│   │   └── settingstab.ts         # Oberfläche im Obsidian-Einstellungstab
│   ├── sync/
│   │   └── sync-service.ts        # Kopieren und Synchronisationsprotokoll
│   └── update/
│       ├── update-service.ts      # Versionsprüfung und Update-Download
│       └── update-modals.ts       # Dialoge für Update und Obsidian-Neustart
├── main.js                         # Von esbuild erzeugtes Plugin-Bundle
├── manifest.json                  # Obsidian-Plugin-Metadaten
├── versions.json                  # Veröffentlichte Plugin-Versionen
├── esbuild.config.mjs             # Build- und Watch-Konfiguration
├── package.json                   # Build-Skripte und Abhängigkeiten
└── tsconfig.json                  # TypeScript-Konfiguration
```

Im Repository liegen außerdem ältere Entwicklungs- und Backup-Dateien, etwa
`main_update_logik.js`, `spindisync_mit_startoption.js`, `ausgangsdateien/` und
`backups/`. Sie gehören nicht zum aktuellen TypeScript-Build.

## Synchronisierung

Das in den Plugin-Einstellungen festgelegte Quellverzeichnis muss die Ordner
`pages` und `assets` enthalten. Die Synchronisierung verarbeitet beide Ordner
rekursiv und kopiert alle darin enthaltenen Dateien und Unterordner an die
entsprechenden Stellen im Vault:

| Quelle | Ziel im Vault |
| --- | --- |
| `<Quellverzeichnis>/pages` | `<Vault>/pages` |
| `<Quellverzeichnis>/assets` | `<Vault>/assets` |

Es werden nur Dateien kopiert, die im Ziel noch nicht vorhanden sind.
Vorhandene Zieldateien werden übersprungen und nicht überschrieben. Da die
Logik rekursiv alle Dateien in `pages` und `assets` berücksichtigt, werden
auch `.canvas`-Dateien synchronisiert, wenn sie in einem dieser Ordner oder
deren Unterordnern liegen. Dateien außerhalb dieser Quellordner werden nicht
gesucht.

Die Synchronisierung kann über den Plugin-Befehl **Run Synchronization**, das
Ribbon-Symbol oder optional automatisch beim Start von Obsidian ausgeführt
werden. Bei Fehlern wird eine Fehlermeldung angezeigt und der Fehler in der
Konsole protokolliert.

Wenn die Protokollierung aktiviert ist, werden Synchronisationsmeldungen an
`<Vault>/pages/log.md` angehängt. Die Benachrichtigung nach dem Lauf zeigt
ebenfalls die kopierten und übersprungenen Dateien an.

## Einstellungen

Der Einstellungstab verwaltet folgende Werte:

| Einstellung | Funktion |
| --- | --- |
| Quellverzeichnis | Lokaler Pfad zum Ordner mit `pages` und `assets` |
| Log-Datei verwenden | Schaltet das Anhängen der Meldungen an `pages/log.md` ein oder aus |
| Download beim Start von Obsidian | Startet die Synchronisierung automatisch beim Plugin-Laden |

`src/settings/settings.ts` definiert den TypeScript-Typ und die Standardwerte.
Obsidian speichert die vom Benutzer eingestellten Werte separat in der
Plugin-Datei `data.json`. Beim Laden werden gespeicherte Werte mit den
Standardwerten zusammengeführt; gespeicherte Werte haben Vorrang. Ein Build
ändert `data.json` nicht.

## Update-Prüfung

Beim Laden des Plugins fragt `UpdateService` die `versions.json` ab, deren URL
in `manifest.json` unter `updateUrl` angegeben ist. Die Versionsnummern werden
numerisch verglichen. Wenn eine neuere Version verfügbar ist, kann der Benutzer
den Download bestätigen. Das Update lädt `manifest.json` und `main.js` aus dem
GitHub-Repository und bietet anschließend an, Obsidian neu zu laden.

Für ein funktionierendes Update müssen die betreffenden Dateien unter dem
Versionsnamen in GitHub erreichbar sein und `versions.json` die veröffentlichte
Version enthalten.

## Entwicklung und Build

Voraussetzung ist eine installierte Node.js-Version mit npm.

```powershell
npm install
npm run typecheck
npm run build
```

`npm run build` erzeugt die produktive `main.js`. Für die Entwicklung kann
`npm run dev` gestartet werden; es beobachtet die TypeScript-Quelldateien und
erstellt das Bundle bei Änderungen neu.

Das Bundle ist CommonJS für Obsidian Desktop und bindet `obsidian` nicht mit
ein, da die Obsidian-API zur Laufzeit bereitgestellt wird. Die Installation
des Plugins benötigt mindestens `manifest.json` und die gebaute `main.js`
im Plugin-Verzeichnis.
