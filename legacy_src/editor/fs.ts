import {invoke} from "@tauri-apps/api/core";

export async function readJson<T>(relativePath: string): Promise<T> {
  const txt = await invoke<string>("read_text_in_website", { relativePath });
  return JSON.parse(txt) as T;
}

export async function writeJson(relativePath: string, data: unknown) {
  const txt = JSON.stringify(data, null, 2);
  await invoke("write_text_in_website", { relativePath, content: txt });
}
