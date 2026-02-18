import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

export const tauriService = {
  async getWorkspace(): Promise<string | null> {
    return await invoke<string | null>("load_workspace_from_config");
  },

  async pickWorkspaceWithDialog(): Promise<string | null> {
    const folder = await open({ directory: true, multiple: false });
    if (!folder) return null;

    const path = String(folder);
    await invoke("set_workspace_folder", { folderPath: path });
    return path;
  },

  async clearWorkspace(): Promise<void> {
    await invoke("clear_workspace_folder");
  },
};
