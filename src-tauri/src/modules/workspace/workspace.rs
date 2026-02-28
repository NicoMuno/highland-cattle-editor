use std::{fs, path::{Path, PathBuf}};
use tauri::{AppHandle, State};

use crate::modules::core::config;
use crate::modules::core::state::WorkspaceState;


// ---------------- tauri commands ----------------
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

#[tauri::command]
pub fn get_default_workspace_folder(app: AppHandle) -> Result<String, String> {
  Ok(default_workspace_dir(&app)?.to_string_lossy().to_string())
}

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

#[tauri::command]
pub fn get_workspace_folder(state: State<WorkspaceState>) -> Result<Option<String>, String> {
  Ok(get_state_workspace(&state).map(|p| p.to_string_lossy().to_string()))
}

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


///////////////////////////////////////////////////////////////////////////////
////////////////// HELPERS ////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

pub(crate) fn default_workspace_dir(app: &AppHandle) -> Result<PathBuf, String> {
  Ok(config::app_data_dir(app)?.join("website"))
}

pub(crate) fn set_state_workspace(state: &State<WorkspaceState>, path: PathBuf) {
  let mut guard = state.base_path.lock().unwrap();
  *guard = Some(path);
}

pub(crate) fn get_state_workspace(state: &State<WorkspaceState>) -> Option<PathBuf> {
  state.base_path.lock().unwrap().clone()
}

pub(crate) fn workspace_base_dir(state: &State<WorkspaceState>) -> Result<PathBuf, String> {
  get_state_workspace(state).ok_or_else(|| "Workspace folder not selected.".into())
}

pub(crate) fn validate_workspace_folder(path: &Path) -> Result<(), String> {
  if !path.exists() {
    return Err("Selected folder does not exist.".into());
  }
  if !path.is_dir() {
    return Err("Selected path is not a folder.".into());
  }
  Ok(())
}