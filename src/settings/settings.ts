export interface SpindiSyncSettings {
  sourceDir: string;
  logEnabled: boolean;
  fetchOnStartup: boolean;
}

export const DEFAULT_SETTINGS: SpindiSyncSettings = {
  sourceDir: "E:\\Schule\\Fächer\\INF\\inf 07\\KST7_Src_test",
  logEnabled: true,
  fetchOnStartup: false,
};
