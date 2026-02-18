// src/services/tauriService.ts
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

/**
 * Frontend bridge to Rust commands.
 * Keeps UI components free from direct invoke(...) calls.
 */
export const tauriService = {
  // -------------------------
  // Workspace
  // -------------------------
  async getWorkspace(): Promise<string | null> {
    return await invoke<string | null>("load_workspace_from_config");
  },

  async setWorkspace(folderPath: string): Promise<void> {
    // Rust expects param name folderPath (matches your App.tsx usage)
    await invoke("set_workspace_folder", { folderPath });
  },

  async pickWorkspaceWithDialog(): Promise<string | null> {
    const folder = await open({
      directory: true,
      multiple: false,
    });

    if (!folder) return null;

    const path = String(folder);
    await this.setWorkspace(path);
    return path;
  },

  async clearWorkspace(): Promise<void> {
    await invoke("clear_workspace_folder");
  },

  async useDefaultWorkspace(): Promise<string> {
    return await invoke<string>("use_default_workspace_folder");
  },

  // -------------------------
  // Website file I/O
  // -------------------------
  async readText(relativePath: string): Promise<string> {
    return await invoke<string>("read_text_in_website", { relativePath });
  },

  async writeText(relativePath: string, content: string): Promise<void> {
    await invoke("write_text_in_website", { relativePath, content });
  },

  async readJson<T>(relativePath: string): Promise<T> {
    const txt = await this.readText(relativePath);
    return JSON.parse(txt) as T;
  },

  async writeJson(relativePath: string, data: unknown): Promise<void> {
    const txt = JSON.stringify(data, null, 2);
    await this.writeText(relativePath, txt);
  },

  // -------------------------
  // Images
  // -------------------------
  async replaceImage(opts: {
    oldRelativePath?: string | null; // "images/..."
    newAbsPath: string;             // absolute path from dialog
    targetSubfolder: string;        // e.g. "pages"
  }): Promise<string> {
    return await invoke<string>("replace_image_in_public", {
      old_relative_path: opts.oldRelativePath ?? null,
      new_abs_path: opts.newAbsPath,
      target_subfolder: opts.targetSubfolder,
    });
  },
};
