use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

use std::ffi::OsStr;
use std::time::{SystemTime, UNIX_EPOCH};

// -------------------- Workspace persistence --------------------

#[derive(Default)]
struct WorkspaceState {
    base_path: Mutex<Option<PathBuf>>,
}

#[derive(Debug, Serialize, Deserialize)]
struct AppConfig {
    workspace_path: Option<String>,
}

fn app_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app_data_dir: {e}"))
}

/// Default legacy hardcoded folder (what you used before)
fn default_workspace_dir(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app_data_dir(app)?.join("website"))
}

/// Config file path (persist selection here)
fn config_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app_data_dir(app)?.join("config.json"))
}

fn read_config(app: &AppHandle) -> Result<AppConfig, String> {
    let cfg_path = config_path(app)?;
    if !cfg_path.exists() {
        return Ok(AppConfig { workspace_path: None });
    }
    let txt = fs::read_to_string(cfg_path).map_err(|e| format!("Read config failed: {e}"))?;
    serde_json::from_str(&txt).map_err(|e| format!("Parse config failed: {e}"))
}

fn write_config(app: &AppHandle, cfg: &AppConfig) -> Result<(), String> {
    let cfg_path = config_path(app)?;
    if let Some(parent) = cfg_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Create config dir failed: {e}"))?;
    }
    let txt = serde_json::to_string_pretty(cfg).map_err(|e| format!("Serialize config failed: {e}"))?;
    fs::write(cfg_path, txt).map_err(|e| format!("Write config failed: {e}"))?;
    Ok(())
}

fn set_state_workspace(state: &tauri::State<WorkspaceState>, path: PathBuf) {
    let mut guard = state.base_path.lock().unwrap();
    *guard = Some(path);
}

fn get_state_workspace(state: &tauri::State<WorkspaceState>) -> Option<PathBuf> {
    state.base_path.lock().unwrap().clone()
}

/// Optional: validate that folder "looks like" your website repo.
/// For now we keep it permissive: it’s enough that the folder exists.
/// If you want strict checking, uncomment the extra checks.
fn validate_workspace_folder(path: &Path) -> Result<(), String> {
    if !path.exists() {
        return Err("Selected folder does not exist.".into());
    }
    if !path.is_dir() {
        return Err("Selected path is not a folder.".into());
    }

    // Strict validation (optional):
    // let expected = path.join("src").join("data");
    // if !expected.exists() {
    //     return Err("Folder does not look like a website repo (missing src/data).".into());
    // }

    Ok(())
}

// -------------------- Safe path resolve --------------------

fn resolve_in_workspace_dir(base: &Path, relative: &str) -> Result<PathBuf, String> {
    let rel = Path::new(relative);

    if rel.is_absolute() {
        return Err("Absolute paths are not allowed.".into());
    }

    for comp in rel.components() {
        if matches!(comp, std::path::Component::ParentDir) {
            return Err("Parent directory '..' is not allowed.".into());
        }
    }

    Ok(base.join(rel))
}

fn workspace_base_dir(state: &tauri::State<WorkspaceState>) -> Result<PathBuf, String> {
    get_state_workspace(state).ok_or_else(|| "Workspace folder not selected.".into())
}

// -------------------- Commands --------------------

#[tauri::command]
fn clear_workspace_folder(app: AppHandle, state: tauri::State<WorkspaceState>) -> Result<(), String> {
    // clear in-memory
    {
        let mut guard = state.base_path.lock().unwrap();
        *guard = None;
    }

    // clear persisted config
    let cfg = AppConfig { workspace_path: None };
    write_config(&app, &cfg)?;

    Ok(())
}


#[tauri::command]
fn get_default_workspace_folder(app: AppHandle) -> Result<String, String> {
    Ok(default_workspace_dir(&app)?.to_string_lossy().to_string())
}

#[tauri::command]
fn load_workspace_from_config(app: AppHandle, state: tauri::State<WorkspaceState>) -> Result<Option<String>, String> {
    let cfg = read_config(&app)?;
    if let Some(p) = cfg.workspace_path {
        let pb = PathBuf::from(&p);
        // If folder no longer exists, treat as not configured.
        if pb.exists() && pb.is_dir() {
            set_state_workspace(&state, pb.clone());
            return Ok(Some(p));
        }
    }
    Ok(None)
}

#[tauri::command]
fn get_workspace_folder(state: tauri::State<WorkspaceState>) -> Result<Option<String>, String> {
    Ok(get_state_workspace(&state).map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
fn set_workspace_folder(
    app: AppHandle,
    state: tauri::State<WorkspaceState>,
    folder_path: String,
) -> Result<(), String> {
    let path = PathBuf::from(&folder_path);
    validate_workspace_folder(&path)?;

    set_state_workspace(&state, path.clone());

    // Persist
    let cfg = AppConfig {
        workspace_path: Some(path.to_string_lossy().to_string()),
    };
    write_config(&app, &cfg)?;

    Ok(())
}

#[tauri::command]
fn use_default_workspace_folder(app: AppHandle, state: tauri::State<WorkspaceState>) -> Result<String, String> {
    let path = default_workspace_dir(&app)?;
    fs::create_dir_all(&path).map_err(|e| format!("Failed to create default website dir: {e}"))?;

    set_state_workspace(&state, path.clone());

    let cfg = AppConfig {
        workspace_path: Some(path.to_string_lossy().to_string()),
    };
    write_config(&app, &cfg)?;

    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
fn file_exists_in_website(state: tauri::State<WorkspaceState>, relative_path: String) -> Result<bool, String> {
    let base = workspace_base_dir(&state)?;
    let path = resolve_in_workspace_dir(&base, &relative_path)?;
    Ok(path.exists())
}

#[tauri::command]
fn read_text_in_website(state: tauri::State<WorkspaceState>, relative_path: String) -> Result<String, String> {
    let base = workspace_base_dir(&state)?;
    let path = resolve_in_workspace_dir(&base, &relative_path)?;
    fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_text_in_website(state: tauri::State<WorkspaceState>, relative_path: String, content: String) -> Result<(), String> {
    let base = workspace_base_dir(&state)?;
    let path = resolve_in_workspace_dir(&base, &relative_path)?;

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create parent dir: {e}"))?;
    }

    fs::write(path, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn replace_image_in_public(
    state: tauri::State<WorkspaceState>,
    old_relative_path: Option<String>,
    new_abs_path: String,
    target_subfolder: String,
) -> Result<String, String> {
    let base = workspace_base_dir(&state)?;
    let public_images_dir = base.join("public").join("images");

    let target_dir = public_images_dir.join(&target_subfolder);
    if target_subfolder.contains("..") || target_subfolder.contains('/') || target_subfolder.contains('\\') {
        return Err("Invalid target_subfolder".into());
    }
    fs::create_dir_all(&target_dir).map_err(|e| format!("Failed to create target folder: {e}"))?;

    // Move old file to legacy
    if let Some(old_rel) = old_relative_path {
        if old_rel.starts_with("images/") {

            // Resolve safely inside workspace
            let old_path = resolve_in_workspace_dir(&base, &format!("public/{}", old_rel))?;
            if !old_path.starts_with(&public_images_dir) {
                return Err("Old image path must stay inside public/images.".into());
            }

            if old_path.exists() {
                let legacy_dir = public_images_dir.join("legacy").join(&target_subfolder);
                fs::create_dir_all(&legacy_dir)
                    .map_err(|e| format!("Failed to create legacy folder: {e}"))?;

                let ts = SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .map_err(|e| e.to_string())?
                    .as_secs();

                let stem = old_path.file_stem().and_then(OsStr::to_str).unwrap_or("old");
                let ext = old_path.extension().and_then(OsStr::to_str).unwrap_or("jpg");

                let legacy_name = format!("{stem}_{ts}.{ext}");
                let legacy_path = legacy_dir.join(legacy_name);

                if let Err(_) = fs::rename(&old_path, &legacy_path) {
                    fs::copy(&old_path, &legacy_path)
                        .map_err(|e| format!("Failed to copy old image to legacy: {e}"))?;
                    fs::remove_file(&old_path)
                        .map_err(|e| format!("Failed to remove old image: {e}"))?;
                }
            }
        }
    }


    // Copy new image
    let new_path = Path::new(&new_abs_path);
    if !new_path.exists() {
        return Err("Selected image does not exist.".into());
    }

    let ext = new_path.extension().and_then(OsStr::to_str).unwrap_or("").to_lowercase();
    let allowed = ["png", "jpg", "jpeg", "webp"];
    if !allowed.contains(&ext.as_str()) {
        return Err("Unsupported image type.".into());
    }
    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_secs();

    let new_filename = format!("img_{ts}.{ext}");
    let final_path = target_dir.join(&new_filename);

    fs::copy(new_path, &final_path).map_err(|e| format!("Failed to copy new image: {e}"))?;

    Ok(format!("images/{}/{}", target_subfolder, new_filename))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(WorkspaceState::default())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init()) 
        .invoke_handler(tauri::generate_handler![
            get_default_workspace_folder,
            load_workspace_from_config,
            get_workspace_folder,
            set_workspace_folder,
            use_default_workspace_folder,
            clear_workspace_folder,
            file_exists_in_website,
            read_text_in_website,
            write_text_in_website,
            replace_image_in_public
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

