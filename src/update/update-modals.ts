//Plugin Update Modals

import { App, Modal, Notice } from "obsidian";

interface AppWithCommands extends App {
  commands: {
    executeCommandById(commandId: string): boolean;
  };
}

export class UpdateModal extends Modal {
  constructor(
    app: App,
    private readonly latestVersion: string,
    private readonly onConfirm: () => Promise<void>,
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
      await this.onConfirm();
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

export class ReloadPluginModal extends Modal {
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
