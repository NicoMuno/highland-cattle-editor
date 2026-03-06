//! Handles persistent application configuration.
//!
//! This module is responsible for storing and loading user-specific settings
//! from the Tauri app data directory. The configuration is written to
//! 'config.json' and currently contains the selected workspace path and
//! the GitHub token used for authenticated repository operations.

use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf};
use tauri::AppHandle;
use tauri::Manager;

/// Persistent application configuration stored in `config.json`.
///
/// This struct contains user-specific settings that must survive
/// application restarts, such as the selected workspace folder
/// and the GitHub token used for authenticated Git operations.
#[derive(Debug, Serialize, Deserialize, Default)]
#[serde(default)]
pub(crate) struct AppConfig {
  pub workspace_path: Option<String>,
  pub github_token: Option<String>,
}

/// Resolves the application data directory used for persistent app files.
///
/// This directory is provided by Tauri and is the base location for
/// configuration data and the default workspace folder.
///
/// Returns an error if the application data directory cannot be resolved.
pub(crate) fn app_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
  app.path()
    .app_data_dir()
    .map_err(|e| format!("Failed to resolve app_data_dir: {e}"))
}

/// Returns the full path to the persistent configuration file.
///
/// The configuration file is stored as `config.json` inside the
/// application data directory.
pub(crate) fn config_path(app: &AppHandle) -> Result<PathBuf, String> {
  Ok(app_data_dir(app)?.join("config.json"))
}

/// Loads the application configuration from disk.
///
/// If the configuration file does not exist yet, a default configuration
/// is returned instead. This makes first-time startup behave cleanly
/// without requiring manual file creation.
///
/// Returns an error if the file exists but cannot be read or parsed.
pub(crate) fn read_config(app: &AppHandle) -> Result<AppConfig, String> {
  let cfg_path = config_path(app)?;
  if !cfg_path.exists() {
    return Ok(AppConfig::default());
  }
  let txt = fs::read_to_string(cfg_path).map_err(|e| format!("Read config failed: {e}"))?;
  serde_json::from_str(&txt).map_err(|e| format!("Parse config failed: {e}"))
}

/// Writes the application configuration to disk.
///
/// The parent directory is created automatically if it does not exist.
/// The configuration is stored as pretty-printed JSON to keep it
/// human-readable for debugging and support purposes.
///
/// Returns an error if directory creation, serialization, or writing fails.
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