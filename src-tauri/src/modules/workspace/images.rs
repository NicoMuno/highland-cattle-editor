//! Image file operations inside the website workspace.
//!
//! This module supports safe image replacement, archiving, and image loading for preview.
//! Replaced or removed images are archived in `public/images/legacy/...`.

use std::ffi::OsStr;
use std::fs;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

use tauri::State;

use base64::{engine::general_purpose, Engine as _};

use crate::modules::core::state::WorkspaceState;
use crate::modules::utils::path_safety::resolve_in_workspace_dir;
use crate::modules::workspace::workspace::workspace_base_dir;

/// Archives an existing image inside `public/images` into
/// `public/images/legacy/<target_subfolder>/`.
///
/// This is used when an image reference is removed entirely, for example
/// when deleting an animal entry.
///
/// The input path must be relative to the website root, e.g.
/// `images/cattle/20.jpg`.
#[tauri::command]
pub fn archive_image_in_public(
    state: State<WorkspaceState>,
    relative_path: String,
    target_subfolder: String,
) -> Result<(), String> {
    let base = workspace_base_dir(&state)?;
    let public_images_dir = base.join("public").join("images");

    if target_subfolder != "pages" && target_subfolder != "cattle" {
        return Err("Invalid target_subfolder (must be 'pages' or 'cattle')".into());
    }

    if !relative_path.starts_with("images/") {
        return Err("Image path must start with 'images/'.".into());
    }

    let old_path = resolve_in_workspace_dir(&base, &format!("public/{}", relative_path))?;

    if !old_path.starts_with(&public_images_dir) {
        return Err("Image path must stay inside public/images.".into());
    }

    if !old_path.exists() {
        // Nothing to archive. Treat this as success for robustness.
        return Ok(());
    }

    let legacy_dir = public_images_dir.join("legacy").join(&target_subfolder);
    fs::create_dir_all(&legacy_dir)
        .map_err(|e| format!("Failed to create legacy folder: {e}"))?;

    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_secs();

    let stem = old_path
        .file_stem()
        .and_then(OsStr::to_str)
        .unwrap_or("old");

    let ext = old_path
        .extension()
        .and_then(OsStr::to_str)
        .unwrap_or("jpg");

    let legacy_name = format!("{stem}_{ts}.{ext}");
    let legacy_path = legacy_dir.join(legacy_name);

    if let Err(_) = fs::rename(&old_path, &legacy_path) {
        fs::copy(&old_path, &legacy_path)
            .map_err(|e| format!("Failed to copy image to legacy: {e}"))?;
        fs::remove_file(&old_path)
            .map_err(|e| format!("Failed to remove original image: {e}"))?;
    }

    Ok(())
}

/// Replaces an image inside `public/images` and archives the old file.
///
/// If `old_relative_path` is provided and the file exists, the old image is
/// moved to `public/images/legacy/<target_subfolder>/` with a timestamped name.
/// The new image is copied into either `public/images/pages/` or
/// `public/images/cattle/`, depending on `target_subfolder`.
///
/// Returns the new image path relative to the website root, e.g.
/// `images/pages/img_1700000000.jpg`.
#[tauri::command]
pub fn replace_image_in_public(
    state: State<WorkspaceState>,
    old_relative_path: Option<String>,
    new_abs_path: String,
    target_subfolder: String,
) -> Result<String, String> {
    let base = workspace_base_dir(&state)?;
    let public_images_dir = base.join("public").join("images");

    if target_subfolder != "pages" && target_subfolder != "cattle" {
        return Err("Invalid target_subfolder (must be 'pages' or 'cattle')".into());
    }

    let target_dir = public_images_dir.join(&target_subfolder);
    fs::create_dir_all(&target_dir)
        .map_err(|e| format!("Failed to create target folder: {e}"))?;

    // ---------------- Move old image to legacy ----------------
    if let Some(old_rel) = old_relative_path {
        if old_rel.starts_with("images/") {
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

                let stem = old_path
                    .file_stem()
                    .and_then(OsStr::to_str)
                    .unwrap_or("old");

                let ext = old_path
                    .extension()
                    .and_then(OsStr::to_str)
                    .unwrap_or("jpg");

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

    // ---------------- Copy new image ----------------
    let new_path = Path::new(&new_abs_path);

    if !new_path.exists() {
        return Err("Selected image does not exist.".into());
    }

    let ext = new_path
        .extension()
        .and_then(OsStr::to_str)
        .unwrap_or("")
        .to_lowercase();

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

/// Reads an image file from the workspace and returns it as a data URL.
///
/// This is used by the frontend to display local workspace images directly
/// without requiring a separate local web server for the file itself.
///
/// Supported formats are PNG, JPG/JPEG, and WEBP.
#[tauri::command]
pub fn read_image_data_url_in_website(
    state: State<WorkspaceState>,
    relative_path: String,
) -> Result<String, String> {
    let base = workspace_base_dir(&state)?;
    let path = resolve_in_workspace_dir(&base, &relative_path)?;

    if !path.exists() {
        return Err("Image file does not exist.".into());
    }

    let ext = path
        .extension()
        .and_then(OsStr::to_str)
        .unwrap_or("")
        .to_lowercase();

    let mime = match ext.as_str() {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "webp" => "image/webp",
        _ => return Err("Unsupported image type.".into()),
    };

    let bytes = fs::read(&path).map_err(|e| format!("Failed to read image: {e}"))?;

    let b64 = general_purpose::STANDARD.encode(bytes);

    Ok(format!("data:{mime};base64,{b64}"))
}