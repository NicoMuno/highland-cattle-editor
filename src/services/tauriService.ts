import { invoke } from "@tauri-apps/api/core";
import { open, confirm  } from "@tauri-apps/plugin-dialog";
import { listen } from "@tauri-apps/api/event";
import { openUrl } from "@tauri-apps/plugin-opener";

import type { LogEntry,  PreviewLogPayload, PublishLogPayload, SetupLogPayload } from "../types";

export const tauriService = {

  // GITHUB TOKEN
  async getGithubToken(): Promise<string | null> {
    return await invoke<string | null>("get_github_token");
  },

  async setGithubToken(token: string): Promise<void> {
    await invoke("set_github_token", { token });
  },
  
  async clearGithubToken(): Promise<void> {
    await invoke("clear_github_token");
  },

  async cloneDevRepo(repoUrl: string, onLog: (log: LogEntry) => void): Promise<string> {
    const unlisten = await listen<SetupLogPayload>("setup:log", (event) => {
      const p = event.payload;
      onLog({
        timestamp: new Date().toLocaleTimeString(),
        type: p.type,
        message: p.message,
      });
    });

    try {
      const path = await invoke<string>("clone_dev_repo", { repoUrl });
      return path;
    } finally {
      unlisten();
    }
  },

  // PUBLISH
  async runPublish(onLog: (log: LogEntry) => void): Promise<void> {
    const unlisten = await listen<PublishLogPayload>("publish:log", (event) => {
      const p = event.payload;
      onLog({
        timestamp: new Date().toLocaleTimeString(),
        type: p.type,
        message: p.message,
      });
    });

    try {
      await invoke("run_publish");
    } finally {
      unlisten();
    }
  },

  // PREVIEW
  async startDevServer(onLog: (log: LogEntry) => void){
    const unlisten = await listen<PreviewLogPayload>("preview:log", (event) => {
      const p = event.payload;
      onLog({
        timestamp: new Date().toLocaleTimeString(),
        type: p.type,
        message: p.message,
      });
    });

    try {
      const url = await invoke<string>("start_preview_dev_server");
      return { url, unlisten };
    } catch (e) {
      unlisten();
      throw e;
    }
  },

  async stopDevServer(): Promise<void> {
    await invoke("stop_preview_dev_server");
  },

  async openExternal(url: string) {
    await openUrl(url);
  },

  async resetPreviewChanges(): Promise<void> {
    await invoke("reset_preview_changes");
  },

  async confirmResetChanges(): Promise<boolean> {
    return await confirm(
      "This will discard ALL uncommitted changes in your website repo (git reset --hard + git clean -fd).\n\nContinue?",
      {
        title: "Reset Changes",
        kind: "warning",
        okLabel: "Reset",
        cancelLabel: "Cancel",
      }
    );
  },

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

  async openLegacyImagesFolder(): Promise<void> {
    await invoke("open_legacy_images_folder");
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

  async archiveImage(args: {
    relativePath: string;
    targetSubfolder: "pages" | "cattle";
  }): Promise<void> {
    await invoke("archive_image_in_public", {
      relativePath: args.relativePath,
      targetSubfolder: args.targetSubfolder,
    });
  },

  async readImageDataUrl(relativePath: string): Promise<string> {
    return await invoke<string>("read_image_data_url_in_website", { relativePath });
  },
  
};