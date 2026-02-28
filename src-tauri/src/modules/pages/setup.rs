use std::fs;
use std::process::Command;

use base64::{engine::general_purpose, Engine as _};
use tauri::{AppHandle, State};

use crate::modules::core::config::{read_config, write_config};
use crate::modules::core::events::emit_setup;
use crate::modules::core::process::{run_cmd_stream_lines, StderrMode};
use crate::modules::core::state::WorkspaceState;

use crate::modules::utils::git::{has_git, validate_github_https_repo_url};
use crate::modules::workspace::workspace::{default_workspace_dir, set_state_workspace};

#[tauri::command]
pub fn get_github_token(app: AppHandle) -> Result<Option<String>, String> {
    Ok(read_config(&app)?.github_token)
}

#[tauri::command]
pub fn set_github_token(app: AppHandle, token: String) -> Result<(), String> {
    let mut cfg = read_config(&app)?;
    cfg.github_token = Some(token);
    write_config(&app, &cfg)?;
    Ok(())
}

#[tauri::command]
pub fn clear_github_token(app: AppHandle) -> Result<(), String> {
    let mut cfg = read_config(&app)?;
    cfg.github_token = None;
    write_config(&app, &cfg)?;
    Ok(())
}

#[tauri::command]
pub async fn clone_dev_repo(
    app: AppHandle,
    state: State<'_, WorkspaceState>,
    repo_url: String,
) -> Result<String, String> {
    let repo_url = repo_url.trim().to_string();

    emit_setup(&app, "info", "Starting clone...", "clone");

    if !has_git() {
        emit_setup(&app, "error", "Git not found in PATH.", "clone");
        return Err("Git is not installed or not available in PATH.".into());
    }

    validate_github_https_repo_url(&repo_url).map_err(|e| {
        emit_setup(&app, "error", &e, "clone");
        e
    })?;

    let cfg = read_config(&app)?;
    let token = cfg
        .github_token
        .ok_or_else(|| "No GitHub token set. Please save a token first.".to_string())?;

    let target = default_workspace_dir(&app)?;
    emit_setup(
        &app,
        "info",
        &format!("Target folder: {}", target.to_string_lossy()),
        "clone",
    );

    // Require empty target
    if target.exists() {
        let non_empty = fs::read_dir(&target)
            .map_err(|e| format!("Failed to read target dir: {e}"))?
            .next()
            .is_some();
        if non_empty {
            emit_setup(&app, "error", "Target folder is not empty. Reset workspace first.", "clone");
            return Err("Target folder already exists and is not empty. Reset workspace first.".into());
        }
    } else {
        fs::create_dir_all(&target).map_err(|e| format!("Create target folder failed: {e}"))?;
    }

    emit_setup(&app, "info", "Running git clone...", "clone");

    // Disable prompts (avoid hangs)
    let basic = general_purpose::STANDARD.encode(format!("x-access-token:{token}"));

    let mut cmd = Command::new("git");
    cmd.env("GIT_TERMINAL_PROMPT", "0")
        .env("GCM_INTERACTIVE", "Never")
        .args([
            "-c",
            &format!("http.https://github.com/.extraheader=AUTHORIZATION: basic {basic}"),
            "clone",
            "--depth",
            "1",
        ])
        .arg(&repo_url)
        .arg(&target);

    let app2 = app.clone();
    let target2 = target.clone();

    let result = tauri::async_runtime::spawn_blocking(move || {
        run_cmd_stream_lines(&app2, "setup:log", "git", cmd, StderrMode::SetupHeuristic)
    })
    .await
    .map_err(|e| format!("Clone task failed: {e:?}"))?;

    if let Err(err) = result {
        emit_setup(&app, "error", &format!("Clone failed: {err}"), "clone");
        let _ = fs::remove_dir_all(&target2);
        emit_setup(&app, "info", "Cleaned up partial clone folder.", "clone");
        return Err(err);
    }

    if !target.join("package.json").exists() {
        emit_setup(&app, "error", "Clone finished but package.json is missing.", "clone");
        let _ = fs::remove_dir_all(&target);
        return Err("Clone finished but repo doesn't look like the website (missing package.json).".into());
    }

    set_state_workspace(&state, target.clone());
    let mut cfg2 = read_config(&app)?;
    cfg2.workspace_path = Some(target.to_string_lossy().to_string());
    write_config(&app, &cfg2)?;

    emit_setup(&app, "success", "Clone complete. Workspace configured ✅", "clone");
    Ok(target.to_string_lossy().to_string())
}