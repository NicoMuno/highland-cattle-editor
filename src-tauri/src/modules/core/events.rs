use tauri::{AppHandle, Emitter};

pub(crate) fn emit_setup(app: &AppHandle, level: &str, msg: &str, label: &str) {
    let _ = app.emit(
        "setup:log",
        serde_json::json!({ "type": level, "message": msg, "label": label }),
    );
}

pub(crate) fn emit_publish(app: &AppHandle, level: &str, msg: &str, label: &str) {
    let _ = app.emit(
        "publish:log",
        serde_json::json!({ "type": level, "message": msg, "label": label }),
    );
}

pub(crate) fn emit_preview(app: &AppHandle, level: &str, msg: &str, label: &str) {
    let lvl = if level == "error" { "error" } else { "info" };

    let _ = app.emit(
        "preview:log",
        serde_json::json!({ "type": lvl, "message": msg, "label": label }),
    );
}