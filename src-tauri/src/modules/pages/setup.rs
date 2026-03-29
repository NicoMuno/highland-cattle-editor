//! Setup page backend logic.
//!
//! This module manages GitHub credentials and performs the initial repository
//! clone into the default workspace folder. It is the main backend entry point
//! for first-time application setup.

use std::fs;
use tauri_plugin_shell::ShellExt;
use base64::{engine::general_purpose, Engine as _};
use tauri::{AppHandle, State};

use crate::modules::core::config::{read_config, write_config};
use crate::modules::core::events::emit_setup;
use crate::modules::core::process::{run_cmd_stream_lines, StderrMode};
use crate::modules::core::state::WorkspaceState;
use crate::modules::utils::errors::translate_error_for_farmer;
use crate::modules::utils::git::{
    ensure_repo_git_identity,
    get_git_path,
    validate_github_https_repo_url,
};
use crate::modules::workspace::workspace::{default_workspace_dir, set_state_workspace};

/// Clones the website development repository into the default workspace.
///
/// The repository must be a GitHub HTTPS URL. Authentication is performed
/// using the stored GitHub token. The target directory must either not exist
/// yet or be empty.
///
/// After a successful clone, the workspace is stored in runtime state and
/// persisted in the application configuration.
#[tauri::command]
pub async fn clone_dev_repo(
    app: AppHandle,
    state: State<'_, WorkspaceState>,
    repo_url: String,
) -> Result<String, String> {
    let repo_url = repo_url.trim().to_string();

    validate_github_https_repo_url(&repo_url).map_err(|e| {
        emit_setup(&app, "error", &e, "clone");
        e
    })?;

    let cfg = read_config(&app)?;
    let token = cfg
        .github_token
        .ok_or_else(|| "Du hast noch keinen Zugangsschlüssel hinterlegt.".to_string())?;

    let target = default_workspace_dir(&app)?;

    if target.exists() {
        let non_empty = fs::read_dir(&target)
            .map_err(|e| format!("Fehler beim Lesen des Zielordners: {e}"))?
            .next()
            .is_some();
        if non_empty {
            let msg = "Der Zielordner ist nicht leer. Bitte setze den Arbeitsbereich zuerst zurück.";
            emit_setup(&app, "error", msg, "clone");
            return Err(msg.into());
        }
    } else {
        fs::create_dir_all(&target).map_err(|e| format!("Konnte Zielordner nicht erstellen: {e}"))?;
    }

    emit_setup(&app, "info", "Richte deinen digitalen Bauernhof ein...", "clone");

    let basic = general_purpose::STANDARD.encode(format!("x-access-token:{token}"));
    let git_exe = get_git_path(&app);

    let cmd = app.shell().command(&git_exe)
        .env("GIT_TERMINAL_PROMPT", "0")
        .env("GCM_INTERACTIVE", "Never")
        .args([
            "-c",
            &format!("http.https://github.com/.extraheader=AUTHORIZATION: basic {basic}"),
            "clone",
            "--depth",
            "1",
            &repo_url,
            &target.to_string_lossy(),
        ]);

    if let Err(err) = run_cmd_stream_lines(&app, "setup:log", "git", cmd, StderrMode::Heuristic).await {
        let friendly_error = translate_error_for_farmer(&err);
        emit_setup(&app, "error", &friendly_error, "clone");
        
        let _ = fs::remove_dir_all(&target);
        emit_setup(&app, "info", "Reste vom fehlgeschlagenen Vorgang wurden aufgeräumt.", "clone");
        return Err(friendly_error);
    }

    if !target.join("package.json").exists() {
        let msg = "Erfolgreich heruntergeladen, aber es fehlen wichtige Website-Bausteine (package.json).";
        emit_setup(&app, "error", msg, "clone");
        let _ = fs::remove_dir_all(&target);
        return Err(msg.into());
    }

    emit_setup(&app, "info", "Bereite Git für spätere Veröffentlichungen vor...", "clone");

    if let Err(err) = ensure_repo_git_identity(&app, &target).await {
        let friendly_error = translate_error_for_farmer(&err);
        emit_setup(&app, "error", &friendly_error, "clone");
        let _ = fs::remove_dir_all(&target);
        emit_setup(&app, "info", "Reste vom fehlgeschlagenen Vorgang wurden aufgeräumt.", "clone");
        return Err(friendly_error);
    }

    set_state_workspace(&state, target.clone());
    let mut cfg2 = read_config(&app)?;
    cfg2.workspace_path = Some(target.to_string_lossy().to_string());
    write_config(&app, &cfg2)?;

    emit_setup(&app, "success", "Dein Bauernhof ist bereit!", "clone");
    Ok(target.to_string_lossy().to_string())
}


/// Returns the stored GitHub token from persistent configuration, if present.
#[tauri::command]
pub fn get_github_token(app: AppHandle) -> Result<Option<String>, String> {
    Ok(read_config(&app)?.github_token)
}

/// Stores the GitHub token in persistent configuration.
#[tauri::command]
pub fn set_github_token(app: AppHandle, token: String) -> Result<(), String> {
    let mut cfg = read_config(&app)?;
    cfg.github_token = Some(token);
    write_config(&app, &cfg)?;
    Ok(())
}

/// Removes the stored GitHub token from persistent configuration.
#[tauri::command]
pub fn clear_github_token(app: AppHandle) -> Result<(), String> {
    let mut cfg = read_config(&app)?;
    cfg.github_token = None;
    write_config(&app, &cfg)?;
    Ok(())
}