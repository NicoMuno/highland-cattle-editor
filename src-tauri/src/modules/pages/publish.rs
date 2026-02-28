use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

use tauri::{AppHandle, State};

use base64::{engine::general_purpose, Engine as _};


use crate::modules::core::config::read_config;
use crate::modules::core::events::emit_publish;
use crate::modules::core::process::{run_cmd_stream_lines, StderrMode};
use crate::modules::core::state::WorkspaceState;

use crate::modules::utils::git::has_git;
use crate::modules::workspace::workspace::workspace_base_dir;


#[tauri::command]
pub async fn run_publish(app: AppHandle, state: State<'_, WorkspaceState>) -> Result<(), String> {
    let base = workspace_base_dir(&state)?;

    // Ensure git repo
    if !base.join(".git").exists() {
        return Err("Workspace is not a git repository (missing .git).".into());
    }

    // Read token
    let cfg = read_config(&app)?;
    let token = cfg
        .github_token
        .ok_or_else(|| "No GitHub token set. Please add it in Setup/Publish.".to_string())?
        .trim()
        .to_string();

    // Check git is available
    if !has_git() {
        return Err("Git is not installed or not available in PATH.".into());
    }

    emit_publish(&app, "info", "Checking git status...", "git");

    // git status --porcelain (detect changes)
    let out = Command::new("git")
        .current_dir(&base)
        .args(["status", "--porcelain"])
        .output()
        .map_err(|e| format!("git status failed: {e}"))?;

    if !out.status.success() {
        return Err(format!("git status failed: {}", String::from_utf8_lossy(&out.stderr)));
    }

    let porcelain = String::from_utf8_lossy(&out.stdout).trim().to_string();
    if porcelain.is_empty() {
        emit_publish(&app, "info", "No changes to publish.", "git");
        return Ok(());
    }

    // git add -A
    emit_publish(&app, "info", "Staging changes (git add -A)...", "git");

    tauri::async_runtime::spawn_blocking({
        let app2 = app.clone();
        let base2 = base.clone();
        move || {
            let mut c = Command::new("git");
            c.current_dir(&base2).args(["add", "-A"]);

            run_cmd_stream_lines(
                &app2,
                "publish:log",          // event name
                "git",                  // label
                c,                      // command
                StderrMode::AlwaysError // how to classify stderr
            )
        }
    })
    .await
    .map_err(|e| format!("git add task failed: {e:?}"))??;

    // commit message with timestamp
    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_secs();
    let msg = format!("Publish: {}", ts);

    emit_publish(&app, "info", &format!("Committing ({msg})..."), "git");
    let commit_out = Command::new("git")
        .current_dir(&base)
        .args(["commit", "-m", &msg])
        .output()
        .map_err(|e| format!("git commit failed: {e}"))?;

    // git commit returns non-zero if nothing to commit; but we already checked changes
    if !commit_out.status.success() {
        return Err(format!(
            "git commit failed: {}",
            String::from_utf8_lossy(&commit_out.stderr)
        ));
    }
    emit_publish(&app, "success", "Commit created.", "git");

    // Get origin URL
    let origin_out = Command::new("git")
        .current_dir(&base)
        .args(["remote", "get-url", "origin"])
        .output()
        .map_err(|e| format!("git remote get-url failed: {e}"))?;
    if !origin_out.status.success() {
        return Err("Could not read git remote 'origin'. Please set it to your GitHub repo.".into());
    }
    let origin = String::from_utf8_lossy(&origin_out.stdout).trim().to_string();

    // Only support https in MVP
    if origin.starts_with("git@") || origin.starts_with("ssh://") {
        return Err("Remote 'origin' uses SSH. MVP publish supports HTTPS remotes only.".into());
    }
    if !origin.starts_with("https://") {
        return Err("Remote 'origin' is not HTTPS. MVP publish supports HTTPS remotes only.".into());
    }

    // Build Basic auth header: base64("x-access-token:TOKEN")
    let basic = general_purpose::STANDARD.encode(format!("x-access-token:{token}"));

    emit_publish(&app, "info", "Pushing to GitHub (this may take a moment)...", "git");

    let push_out = Command::new("git")
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
        .output()
        .map_err(|e| format!("git push failed: {e}"))?;

    if !push_out.status.success() {
        let mut err = String::from_utf8_lossy(&push_out.stderr).to_string();
        // safety: redact token if it appears anywhere
        err = err.replace(&token, "<redacted>");
        return Err(format!("git push failed: {err}"));
    }

    emit_publish(&app, "success", "Push successful. GitHub Actions will deploy.", "git");
    
    Ok(())
}
