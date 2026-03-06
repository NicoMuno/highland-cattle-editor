//! Shared process execution utilities.
//!
//! This module provides reusable logic for running shell commands
//! and streaming their stdout/stderr output to the frontend in real time.
//! It is primarily used by setup and publish workflows.

use tauri::{AppHandle, Emitter};
use tauri_plugin_shell::process::{CommandEvent, Command}; 


/// Controls how stderr output is classified when streaming process logs.
///
/// Some command-line tools write non-critical progress information to stderr.
/// This enum allows the caller to choose whether stderr should always be
/// treated as an error or classified using a simple heuristic.
pub(crate) enum StderrMode {
    /// Treat every stderr line as an error.
    AlwaysError,
    /// Classify stderr lines heuristically into info or error.
    SetupHeuristic,
}

/// Runs a shell command and streams its output line by line to the frontend.
///
/// Stdout lines are always emitted as `info`.
/// Stderr lines are classified according to `stderr_mode`.
///
/// The process is considered successful only if it terminates with exit code 0.
/// Any process-level error or non-zero exit code results in an error return.
///
/// This helper is used for long-running operations where the user should see
/// live progress in the UI, such as cloning a repository or staging changes.
pub(crate) async fn run_cmd_stream_lines(
    app: &AppHandle,
    event_name: &'static str,
    label: &str,
    cmd: Command,
    stderr_mode: StderrMode,
) -> Result<(), String> {
    // spawn() -> returns rx for consol output and process object (child)
    let (mut rx, _child) = cmd
        .spawn()
        .map_err(|e| format!("Fehler beim Starten des Sidecars ({}): {}", label, e))?;


    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(line_bytes) => {
                let line = String::from_utf8_lossy(&line_bytes).trim().to_string();
                if !line.is_empty() {
                    let _ = app.emit(
                        event_name,
                        serde_json::json!({ "type": "info", "message": line, "label": label }),
                    );
                }
            }
            CommandEvent::Stderr(line_bytes) => {
                let line = String::from_utf8_lossy(&line_bytes).trim().to_string();
                if !line.is_empty() {
                    let lvl = match stderr_mode {
                        StderrMode::AlwaysError => "error",
                        StderrMode::SetupHeuristic => {
                            let l = line.to_lowercase();
                            if l.contains("error") || l.contains("fatal") || l.contains("authentication") {
                                "error"
                            } else {
                                "info"
                            }
                        }
                    };
                    let _ = app.emit(
                        event_name,
                        serde_json::json!({ "type": lvl, "message": line, "label": label }),
                    );
                }
            }
            CommandEvent::Error(err) => {
                return Err(format!("Unerwarteter Prozessfehler: {}", err));
            }
            CommandEvent::Terminated(payload) => {
                // Wenn der Prozess beendet ist, prüfen wir, ob er erfolgreich war (Code 0)
                if payload.code != Some(0) {
                    return Err(format!("Vorgang fehlgeschlagen (Exit-Code: {:?})", payload.code));
                }
            }
            _ => {} 
        }
    }
    
    Ok(())
}