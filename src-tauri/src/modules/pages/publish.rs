//! Publish page backend logic.
//!
//! This module stages, commits, and pushes local website changes to GitHub
//! using the stored personal access token and the configured HTTPS remote.

use std::time::{SystemTime, UNIX_EPOCH};

use tauri::{AppHandle, State};
use base64::{engine::general_purpose, Engine as _};
use tauri_plugin_shell::ShellExt;

use crate::modules::core::config::read_config;
use crate::modules::core::events::emit_publish;
use crate::modules::core::process::{run_cmd_stream_lines, StderrMode};
use crate::modules::core::state::WorkspaceState;
use crate::modules::utils::errors::translate_error_for_farmer;
use crate::modules::workspace::workspace::workspace_base_dir;
use crate::modules::utils::git::get_git_path;


/// Publishes local workspace changes to the remote GitHub repository.
///
/// The workflow performs:
/// 1. change detection via `git status --porcelain`
/// 2. staging via `git add -A`
/// 3. commit creation with a timestamped message
/// 4. authenticated push to `origin main` over HTTPS
///
/// The GitHub token is read from persistent app config and passed as an
/// HTTP authorization header for the push command.
#[tauri::command]
pub async fn run_publish(app: AppHandle, state: State<'_, WorkspaceState>) -> Result<(), String> {
    let base = workspace_base_dir(&state)?;

    if !base.join(".git").exists() {
        return Err("Dieser Ordner scheint nicht mit dem Internet verbunden zu sein (kein Git-Ordner).".into());
    }

    let cfg = read_config(&app)?;
    let token = cfg
        .github_token
        .ok_or_else(|| "Du bist noch nicht angemeldet. Bitte füge dein Passwort im Setup hinzu.".to_string())?
        .trim()
        .to_string();

    emit_publish(&app, "info", "Prüfe auf neue Änderungen...", "git");

    let git_exe = get_git_path(&app);

    let out = app.shell().command(&git_exe)
        .args(["status", "--porcelain"])
        .current_dir(&base)
        .output().await
        .map_err(|e| format!("Konnte Änderungen nicht prüfen: {}", e))?;

    if !out.status.success() {
        let err = translate_error_for_farmer(&String::from_utf8_lossy(&out.stderr));
        return Err(err);
    }

    let porcelain = String::from_utf8_lossy(&out.stdout).trim().to_string();
    if porcelain.is_empty() {
        emit_publish(&app, "info", "Alles ist bereits auf dem neuesten Stand. Nichts zu tun.", "git");
        return Ok(());
    }

    emit_publish(&app, "info", "Sammle deine neuesten Entwürfe...", "git");

    let add_cmd = app.shell().command(&git_exe)
        .args(["add", "-A"])
        .current_dir(&base);

    if let Err(err) = run_cmd_stream_lines(
        &app,
        "publish:log",
        "git",
        add_cmd,
        StderrMode::Heuristic,
    ).await {
        let friendly_err = translate_error_for_farmer(&err);
        return Err(friendly_err);
    }

    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_secs();
    let msg = format!("Publish: {}", ts);

    emit_publish(&app, "info", "Speichere die Entwürfe...", "git");
    
    let commit_out = app.shell().command(&git_exe)
        .args(["commit", "-m", &msg])
        .current_dir(&base)
        .output().await
        .map_err(|e| format!("Fehler beim Speichern: {}", e))?;

    if !commit_out.status.success() {
        let err = translate_error_for_farmer(&String::from_utf8_lossy(&commit_out.stderr));
        return Err(err);
    }
    emit_publish(&app, "success", "Entwürfe erfolgreich gespeichert.", "git");

    let origin_out = app.shell().command(&git_exe)
        .args(["remote", "get-url", "origin"])
        .current_dir(&base)
        .output().await
        .map_err(|e| format!("Konnte die Internetadresse deiner Website nicht lesen: {}", e))?;

    if !origin_out.status.success() {
        return Err("Es ist keine Zieladresse hinterlegt. Bitte überprüfe dein Setup.".into());
    }
    let origin = String::from_utf8_lossy(&origin_out.stdout).trim().to_string();

    if origin.starts_with("git@") || origin.starts_with("ssh://") {
        return Err("Deine Website ist mit einem falschen Schlüssel (SSH) verknüpft. Bitte nutze HTTPS.".into());
    }
    if !origin.starts_with("https://") {
        return Err("Die Zieladresse muss mit https:// beginnen.".into());
    }

    let basic = general_purpose::STANDARD.encode(format!("x-access-token:{token}"));

    emit_publish(&app, "info", "Lade Änderungen ins Internet hoch (das kann einen Moment dauern)...", "git");

    let push_out = app.shell().command(&git_exe)
        .current_dir(&base)
        .env("GIT_TERMINAL_PROMPT", "0")
        .env("GCM_INTERACTIVE", "Never")
        .args([
            "-c",
            &format!("http.https://github.com/.extraheader=AUTHORIZATION: basic {basic}"),
            "push",
            "origin",
            "main",
        ])
        .output().await
        .map_err(|e| format!("Fehler beim Hochladen: {}", e))?;

    if !push_out.status.success() {
        let mut err = String::from_utf8_lossy(&push_out.stderr).to_string();
        err = err.replace(&token, "<PASSWORT VERBORGEN>");
        let friendly_err = translate_error_for_farmer(&err);
        return Err(friendly_err);
    }

    emit_publish(&app, "success", "Erfolgreich hochgeladen! Deine Website aktualisiert sich jetzt in den nächsten Minuten.", "git");
    
    Ok(())
}