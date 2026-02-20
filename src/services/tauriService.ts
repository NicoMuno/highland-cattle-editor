import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

export const tauriService = {

  // WORKSPACE MANAGEMENT
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

  // FILE I/O
  async readText(relativePath: string): Promise<string> {
    return await invoke<string>("read_text_in_website", { relativePath });
  },

  async writeText(relativePath: string, content: string): Promise<void> {
    await invoke("write_text_in_website", { relativePath, content });
  },

  // IMAGE MANAGEMENT
  async pickImageFile(): Promise<string | null> {
    const file = await open({
      multiple: false,
      directory: false,
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp"] }],
    });
    return file ? String(file) : null;
  },

  async replaceImage(args: {
    oldRelativePath: string | null;      
    newAbsPath: string;                
    targetSubfolder: "pages" | "cattle";
  }): Promise<string> {
    return await invoke<string>("replace_image_in_public", {
      oldRelativePath: args.oldRelativePath,
      newAbsPath: args.newAbsPath,
      targetSubfolder: args.targetSubfolder,
    });
  },

  async readImageDataUrl(relativePath: string): Promise<string> {
    return await invoke<string>("read_image_data_url_in_website", { relativePath });
  },
  
};
