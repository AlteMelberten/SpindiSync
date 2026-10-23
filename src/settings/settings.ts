export interface SpindiSyncSettings {
  sourceDir: string;
  logEnabled: boolean;
  fetchOnStartup: boolean;
}
//nur für den Fall, dass data.json (noch) nicht existiert und Einstellungen trotzdem gesetzt werden können
export const DEFAULT_SETTINGS: SpindiSyncSettings = {
  sourceDir: "E:\\SpindiSynvDwnl",
  logEnabled: true,
  fetchOnStartup: false,
};
