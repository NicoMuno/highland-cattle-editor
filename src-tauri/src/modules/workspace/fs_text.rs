use std::fs;
use tauri::State;

use crate::modules::utils::path_safety::resolve_in_workspace_dir;
use crate::modules::core::state::WorkspaceState;
use crate::modules::workspace::workspace;

#[tauri::command]
pub fn file_exists_in_website(
    state: State<WorkspaceState>,
    relative_path: String,
) -> Result<bool, String> {
    let base = workspace::workspace_base_dir(&state)?;
    let path = resolve_in_workspace_dir(&base, &relative_path)?;
    Ok(path.exists())
}

#[tauri::command]
pub fn read_text_in_website(
    state: State<WorkspaceState>,
    relative_path: String,
) -> Result<String, String> {
    let base = workspace::workspace_base_dir(&state)?;
    let path = resolve_in_workspace_dir(&base, &relative_path)?;
    fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn write_text_in_website(
    state: State<WorkspaceState>,
    relative_path: String,
    content: String,
) -> Result<(), String> {
    let base = workspace::workspace_base_dir(&state)?;
    let path = resolve_in_workspace_dir(&base, &relative_path)?;

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create parent dir: {e}"))?;
    }

    fs::write(path, content).map_err(|e| e.to_string())
}