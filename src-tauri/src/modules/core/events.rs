//! Helper functions for sending structured log events to the frontend.
//!
//! Each page in the application listens to its own event channel
//! (`setup:log`, `publish:log`, `preview:log`) so that backend status
//! messages can be displayed in the correct UI view.

use tauri::{AppHandle, Emitter};


/// Emits a structured log message for the setup page.
///
/// The frontend listens on the 'setup:log' event channel and renders
/// the payload inside the setup log viewer.
pub(crate) fn emit_setup(app: &AppHandle, level: &str, msg: &str, label: &str) {
    let _ = app.emit(
        "setup:log",
        serde_json::json!({ "type": level, "message": msg, "label": label }),
    );
}


/// Emits a structured log message for the publish page.
///
/// The frontend listens on the 'publish:log' event channel and renders
/// the payload inside the publish log viewer.
pub(crate) fn emit_publish(app: &AppHandle, level: &str, msg: &str, label: &str) {
    let _ = app.emit(
        "publish:log",
        serde_json::json!({ "type": level, "message": msg, "label": label }),
    );
}

/// Emits a structured log message for the preview page.
///
/// Preview logs are normalized to only two levels:
/// - `error` for actual failures
/// - `info` for all other messages
///
/// This keeps the preview log output simpler and easier to read.
pub(crate) fn emit_preview(app: &AppHandle, level: &str, msg: &str, label: &str) {
    let lvl = if level == "error" { "error" } else { "info" };

    let _ = app.emit(
        "preview:log",
        serde_json::json!({ "type": lvl, "message": msg, "label": label }),
    );
}