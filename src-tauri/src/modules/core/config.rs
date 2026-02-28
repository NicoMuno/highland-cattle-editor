use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf};
use tauri::AppHandle;
use tauri::Manager;

#[derive(Debug, Serialize, Deserialize, Default)]
#[serde(default)]
pub(crate) struct AppConfig {
  pub workspace_path: Option<String>,
  pub github_token: Option<String>,
}

pub(crate) fn app_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
  app.path()
    .app_data_dir()
    .map_err(|e| format!("Failed to resolve app_data_dir: {e}"))
}

pub(crate) fn config_path(app: &AppHandle) -> Result<PathBuf, String> {
  Ok(app_data_dir(app)?.join("config.json"))
}

pub(crate) fn read_config(app: &AppHandle) -> Result<AppConfig, String> {
  let cfg_path = config_path(app)?;
  if !cfg_path.exists() {
    return Ok(AppConfig::default());
  }
  let txt = fs::read_to_string(cfg_path).map_err(|e| format!("Read config failed: {e}"))?;
  serde_json::from_str(&txt).map_err(|e| format!("Parse config failed: {e}"))
}

pub(crate) fn write_config(app: &AppHandle, cfg: &AppConfig) -> Result<(), String> {
  let cfg_path = config_path(app)?;
  if let Some(parent) = cfg_path.parent() {
    fs::create_dir_all(parent).map_err(|e| format!("Create config dir failed: {e}"))?;
  }
  let txt =
    serde_json::to_string_pretty(cfg).map_err(|e| format!("Serialize config failed: {e}"))?;
  fs::write(cfg_path, txt).map_err(|e| format!("Write config failed: {e}"))?;
  Ok(())
}