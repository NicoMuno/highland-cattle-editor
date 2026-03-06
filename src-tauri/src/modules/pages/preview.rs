//! Preview page backend logic.
//!
//! This module starts and stops the local development preview server,
//! detects the Vite preview URL from process output, and supports resetting
//! uncommitted local changes before publication.

use tauri::{AppHandle, State};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandEvent;
use std::process::Command;

use crate::modules::core::events::emit_preview;
use crate::modules::core::state::{DevServerState, WorkspaceState};
use crate::modules::utils::errors::translate_error_for_farmer;
use crate::modules::workspace::workspace::workspace_base_dir;
use crate::modules::utils::git::get_git_path;


/// Discards all uncommitted local changes in the preview workspace.
///
/// This command is only allowed when the preview server is not running.
/// It performs a hard Git reset and removes untracked files to restore
/// the workspace to the last committed state.
#[tauri::command]
pub async fn reset_preview_changes(
    app: AppHandle,
    state: State<'_, WorkspaceState>,
    dev_state: State<'_, DevServerState>,
) -> Result<(), String> {
    {
        let child_guard = dev_state.child.lock().map_err(|_| "Zustandsfehler")?;
        if child_guard.is_some() {
            let msg = "Bitte stoppe zuerst die Vorschau, bevor du Änderungen zurücksetzt.";
            emit_preview(&app, "error", msg, "git");
            return Err(msg.into());
        }
    }

    let base = workspace_base_dir(&state)?;
    let site_dir = resolve_site_dir(&base)?;

    if !site_dir.join(".git").exists() {
        return Err("Dieser Ordner scheint nicht mit dem Internet verbunden zu sein (kein Git-Ordner).".into());
    }

    emit_preview(&app, "info", "Prüfe auf offene Änderungen...", "git");

    let git_exe = get_git_path(&app);

    let status_out = app.shell().command(&git_exe)
        .args(["status", "--porcelain"])
        .current_dir(&site_dir)
        .output().await
        .map_err(|e| format!("Konnte Git nicht ausführen: {}", e))?;

    let porcelain = String::from_utf8_lossy(&status_out.stdout).trim().to_string();
    if porcelain.is_empty() {
        emit_preview(&app, "info", "Alles ist auf dem neuesten Stand. Nichts zu tun.", "git");
        return Ok(());
    }

    emit_preview(&app, "info", "Verwerfe aktuelle Entwürfe...", "git");
    
    let reset_out = app.shell().command(&git_exe)
        .args(["reset", "--hard", "HEAD"])
        .current_dir(&site_dir)
        .output().await
        .map_err(|e| e.to_string())?;

    if !reset_out.status.success() {
        let err = translate_error_for_farmer(&String::from_utf8_lossy(&reset_out.stderr));
        emit_preview(&app, "error", &err, "git");
        return Err(err);
    }

    let _ = app.shell().command(&git_exe).args(["clean", "-fd"]).current_dir(&site_dir).output().await;

    emit_preview(&app, "info", "Entwürfe erfolgreich verworfen. Alles ist wieder wie zuvor.", "git");
    Ok(())
}


/// Starts the local development preview server and returns its URL.
///
/// If the server is already running, the existing preview URL is returned.
/// If dependencies are missing, `bun install` is executed first.
/// Once the Vite dev server prints its local URL, that URL is stored in
/// runtime state and returned to the frontend.
#[tauri::command]
pub async fn start_preview_dev_server(
    app: AppHandle,
    state: State<'_, WorkspaceState>,
    dev_state: State<'_, DevServerState>,
) -> Result<String, String> {
    let base = workspace_base_dir(&state)?;
    let site_dir = resolve_site_dir(&base)?;

    {
        let child_guard = dev_state.child.lock().unwrap();
        if child_guard.is_some() {
            let url_guard = dev_state.url.lock().unwrap();
            if let Some(url) = url_guard.clone() {
                emit_preview(&app, "info", "Die Vorschau läuft bereits.", "preview");
                return Ok(url);
            }
        }
    }

    if !site_dir.join("package.json").exists() {
        return Err("Die Website-Struktur ist fehlerhaft (package.json fehlt).".into());
    }

    if !site_dir.join("node_modules").exists() {
        emit_preview(&app, "info", "Bereite Website-Bausteine vor (das passiert nur einmal)...", "npm");

        
        let install_status = app.shell().sidecar("bun")
            .map_err(|e| format!("Konnte Bun nicht finden: {}", e))?
            .args(["install"])
            .current_dir(&site_dir)
            .output().await
            .map_err(|e| format!("Fehler beim Starten der Installation: {}", e))?;

        if !install_status.status.success() {
            let err_txt = String::from_utf8_lossy(&install_status.stderr);
            let friendly_err = translate_error_for_farmer(&err_txt);
            return Err(friendly_err);
        }
        emit_preview(&app, "info", "Bausteine erfolgreich vorbereitet.", "npm");
    }

    emit_preview(&app, "info", "Starte Vorschau...", "vite");

    let (mut rx, child) = app.shell().sidecar("bun")
        .map_err(|e| format!("Konnte Bun nicht finden: {}", e))?
        .args(["run", "dev"])
        .current_dir(&site_dir)
        .spawn()
        .map_err(|e| format!("Fehler beim Starten der Vorschau: {}", e))?;

    let mut found_url = None;

    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(bytes) | CommandEvent::Stderr(bytes) => {
                let line = String::from_utf8_lossy(&bytes).to_string();
                let clean = strip_ansi(&line);
                
                if !clean.trim().is_empty() {
                    emit_preview(&app, "info", &clean, "vite");
                }

                if let Some(url) = extract_vite_url(&clean) {
                    found_url = Some(url);
                    break; 
                }
            }
            CommandEvent::Terminated(_) => {
                return Err("Die Vorschau wurde unerwartet direkt nach dem Start beendet.".into());
            }
            _ => {}
        }
    }

    let url = found_url.ok_or_else(|| "Konnte die Adresse der Vorschau nicht erkennen.".to_string())?;

    let app_clone = app.clone();
    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            if let CommandEvent::Stdout(bytes) | CommandEvent::Stderr(bytes) = event {
                let line = String::from_utf8_lossy(&bytes);
                let clean = strip_ansi(&line);
                if !clean.trim().is_empty() {
                    emit_preview(&app_clone, "info", &clean, "vite");
                }
            }
        }
    });

    {
        *dev_state.child.lock().unwrap() = Some(child);
        *dev_state.url.lock().unwrap() = Some(url.clone());
    }

    emit_preview(&app, "success", &format!("Vorschau ist bereit unter: {}", url), "vite");
    Ok(url)
}


/// Stops the running preview development server.
///
/// On Windows, `taskkill /T /F` is used to terminate the full process tree,
/// including child processes spawned by Bun or Vite. A fallback to the
/// normal child kill method is used if taskkill fails.
#[tauri::command]
pub fn stop_preview_dev_server(
    app: AppHandle,
    dev_state: State<'_, DevServerState>,
) -> Result<(), String> {
    let mut child_opt = dev_state.child.lock().unwrap().take();
    *dev_state.url.lock().unwrap() = None;

    let Some(child) = child_opt.take() else {
        emit_preview(&app, "info", "Die Vorschau war bereits gestoppt.", "preview");
        return Ok(());
    };

    let pid = child.pid(); // Wir holen uns die Prozess-ID
    emit_preview(&app, "info", &format!("Beende Vorschau (PID: {})...", pid), "preview");

    // Wir nutzen Windows Taskkill, um den Prozess und ALLE seine Kindprozesse (/T) 
    // erzwungen (/F) zu beenden.
    let status = Command::new("taskkill")
        .args(["/PID", &pid.to_string(), "/T", "/F"])
        .status();

    match status {
        Ok(s) if s.success() => {
            // Nach taskkill rufen wir zur Sicherheit noch .kill() auf, 
            // um die Rust-Ressourcen sauber freizugeben.
            let _ = child.kill(); 
            emit_preview(&app, "success", "Vorschau erfolgreich beendet.", "preview");
            Ok(())
        }
        Ok(_) | Err(_) => {
            // Fallback: Falls taskkill fehlschlägt, versuchen wir das normale kill.
            if let Err(e) = child.kill() {
                return Err(format!("Konnte die Vorschau nicht sanft beenden: {}", e));
            }
            emit_preview(&app, "success", "Vorschau beendet (Fallback-Methode).", "preview");
            Ok(())
        }
    }
}


///////////////////////////////////////////////////////////////////////////////
////////////////// HELPERS ////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////


/// Extracts a local Vite preview URL from a log line.
///
/// Recognized URL prefixes include localhost and 127.0.0.1 over HTTP/HTTPS.
pub(crate) fn extract_vite_url(line: &str) -> Option<String> {
    let s = line.trim();
    let candidates = [
        "http://localhost:",
        "http://127.0.0.1:",
        "https://localhost:",
        "https://127.0.0.1:",
    ];
    for c in candidates {
        if let Some(idx) = s.find(c) {
            let rest = &s[idx..];
            let url = rest.split_whitespace().next().unwrap_or(rest).to_string();
            return Some(url);
        }
    }
    None
}


/// Removes ANSI escape sequences from terminal output.
///
/// This is used before forwarding command output to the frontend log viewer
/// so that colored terminal formatting codes do not appear as raw text.
pub(crate) fn strip_ansi(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let mut chars = s.chars().peekable();
    while let Some(c) = chars.next() {
        if c == '\u{1b}' {
            if matches!(chars.peek(), Some('[')) {
                chars.next();
                while let Some(cc) = chars.next() {
                    if cc.is_ascii_alphabetic() { break; }
                }
                continue;
            }
        }
        out.push(c);
    }
    out
}


/// Resolves the actual website project directory from the workspace base path.
///
/// Supported layouts:
/// - the workspace itself is the website repo
/// - the workspace contains a nested `highland-cattle-dev/` repo
///
/// The directory is considered valid if it contains `package.json`.
pub(crate) fn resolve_site_dir(base: &std::path::Path) -> Result<std::path::PathBuf, String> {
    if base.join("package.json").exists() { return Ok(base.to_path_buf()); }
    let nested = base.join("highland-cattle-dev");
    if nested.join("package.json").exists() { return Ok(nested); }
    Err("Konnte package.json nicht finden. Ist das der richtige Ordner?".into())
}