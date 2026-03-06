//! Workspace selection and workspace state management.
//!
//! This module handles selecting, persisting, clearing, and resolving
//! the active website workspace folder. It also contains helper functions
//! used by other backend modules to access the workspace safely.

use std::{fs, path::{Path, PathBuf}};
use tauri::{AppHandle, State};
use tauri_plugin_opener::OpenerExt;

use crate::modules::core::config;
use crate::modules::core::state::WorkspaceState;


/// Clears the currently selected workspace.
///
/// This removes the workspace from in-memory runtime state and from the
/// persisted application configuration. No files on disk are deleted.
#[tauri::command]
pub fn clear_workspace_folder(app: AppHandle, state: State<WorkspaceState>) -> Result<(), String> {
  // clear in-memory
  {
    let mut guard = state.base_path.lock().unwrap();
    *guard = None;
  }

  // clear persisted config
  let mut cfg = config::read_config(&app)?;
  cfg.workspace_path = None;
  config::write_config(&app, &cfg)?;
  Ok(())
}

/// Returns the default workspace folder path as a string.
///
/// The default workspace is located inside the app data directory
/// under `website/`.
#[tauri::command]
pub fn get_default_workspace_folder(app: AppHandle) -> Result<String, String> {
  Ok(default_workspace_dir(&app)?.to_string_lossy().to_string())
}


/// Loads the workspace path from persistent config into runtime state.
///
/// If the saved folder still exists and is a directory, it becomes the
/// active in-memory workspace and is returned. Otherwise `None` is returned.
#[tauri::command]
pub fn load_workspace_from_config(
  app: AppHandle,
  state: State<WorkspaceState>,
) -> Result<Option<String>, String> {
  let cfg = config::read_config(&app)?;
  if let Some(p) = cfg.workspace_path {
    let pb = PathBuf::from(&p);
    if pb.exists() && pb.is_dir() {
      set_state_workspace(&state, pb);
      return Ok(Some(p));
    }
  }
  Ok(None)
}

/// Returns the currently active workspace from in-memory state.
///
/// This does not read from disk. It only reflects the runtime state
/// currently held by the backend.
#[tauri::command]
pub fn get_workspace_folder(state: State<WorkspaceState>) -> Result<Option<String>, String> {
  Ok(get_state_workspace(&state).map(|p| p.to_string_lossy().to_string()))
}

/// Sets the active workspace folder.
///
/// The folder must already exist and be a directory. On success, the path
/// is stored both in runtime state and in persistent configuration.
#[tauri::command]
pub fn set_workspace_folder(
  app: AppHandle,
  state: State<WorkspaceState>,
  folder_path: String,
) -> Result<(), String> {
  let path = PathBuf::from(&folder_path);
  validate_workspace_folder(&path)?;
  set_state_workspace(&state, path.clone());

  let mut cfg = config::read_config(&app)?;
  cfg.workspace_path = Some(path.to_string_lossy().to_string());
  config::write_config(&app, &cfg)?;
  Ok(())
}

/// Creates and selects the default workspace folder.
///
/// If the default folder does not exist yet, it is created automatically.
/// The resulting path is stored in runtime state and persisted in config.
#[tauri::command]
pub fn use_default_workspace_folder(
  app: AppHandle,
  state: State<WorkspaceState>,
) -> Result<String, String> {
  let path = default_workspace_dir(&app)?;
  fs::create_dir_all(&path).map_err(|e| format!("Failed to create default website dir: {e}"))?;

  set_state_workspace(&state, path.clone());

  let mut cfg = config::read_config(&app)?;
  cfg.workspace_path = Some(path.to_string_lossy().to_string());
  config::write_config(&app, &cfg)?;

  Ok(path.to_string_lossy().to_string())
}


/// Opens the `public/images/legacy` folder in the system file explorer.
///
/// The folder is created automatically if it does not exist yet.
#[tauri::command]
pub fn open_legacy_images_folder(app: AppHandle, state: State<WorkspaceState>) -> Result<(), String> {
  let base = workspace_base_dir(&state)?;
  let legacy_dir = base.join("public").join("images").join("legacy");

  if !legacy_dir.exists() {
    fs::create_dir_all(&legacy_dir)
      .map_err(|e| format!("Konnte den Legacy-Ordner nicht erstellen: {}", e))?;
  }

  let path_str = legacy_dir.to_string_lossy().to_string();
  app.opener().open_path(path_str, None::<&str>)
    .map_err(|e| format!("Konnte den Ordner nicht öffnen: {}", e))?;

  Ok(())
}


///////////////////////////////////////////////////////////////////////////////
////////////////// HELPERS ////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/// Returns the default workspace directory inside the app data folder.
pub(crate) fn default_workspace_dir(app: &AppHandle) -> Result<PathBuf, String> {
  Ok(config::app_data_dir(app)?.join("website"))
}

/// Updates the in-memory workspace state with a new base path.
pub(crate) fn set_state_workspace(state: &State<WorkspaceState>, path: PathBuf) {
  let mut guard = state.base_path.lock().unwrap();
  *guard = Some(path);
}

/// Returns the current in-memory workspace path, if one is set.
pub(crate) fn get_state_workspace(state: &State<WorkspaceState>) -> Option<PathBuf> {
  state.base_path.lock().unwrap().clone()
}

/// Returns the active workspace base directory.
///
/// Fails if no workspace has been selected yet.
pub(crate) fn workspace_base_dir(state: &State<WorkspaceState>) -> Result<PathBuf, String> {
  get_state_workspace(state).ok_or_else(|| "Workspace folder not selected.".into())
}

/// Validates that the provided path exists and is a directory.
pub(crate) fn validate_workspace_folder(path: &Path) -> Result<(), String> {
  if !path.exists() {
    return Err("Selected folder does not exist.".into());
  }
  if !path.is_dir() {
    return Err("Selected path is not a folder.".into());
  }
  Ok(())
}