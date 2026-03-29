//! Git-specific helpers.
//!
//! This module validates GitHub URLs, resolves the bundled Git executable,
//! and provides small helpers for repo-local Git configuration.

use std::path::Path;

use tauri::{AppHandle, Manager};
use tauri_plugin_shell::ShellExt;

/// Default repo-local Git identity used by the editor.
///
/// These values are written into `.git/config` of the cloned repository
/// so commits work even on fresh Windows machines with no global Git setup.
const DEFAULT_GIT_USER_NAME: &str = "Farm Webeditor";
const DEFAULT_GIT_USER_EMAIL: &str = "noreply@farm-webeditor.local";

/// Validates that a repository URL points to GitHub over HTTPS.
///
/// This application only supports GitHub HTTPS repository URLs in order
/// to keep authentication and support flows simple for non-technical users.
pub(crate) fn validate_github_https_repo_url(repo_url: &str) -> Result<(), String> {
    if !repo_url.starts_with("https://github.com/") {
        return Err("Die Repository-Adresse muss mit https://github.com/ beginnen.".into());
    }
    Ok(())
}

/// Returns the absolute path to the bundled `git.exe`.
///
/// The application ships with its own MinGit distribution so Git commands
/// do not depend on a separate system-wide Git installation.
pub(crate) fn get_git_path(app: &AppHandle) -> String {
    let resource_path = app
        .path()
        .resource_dir()
        .unwrap()
        .join("dependencies")
        .join("resources")
        .join("mingit")
        .join("cmd")
        .join("git.exe");

    resource_path.to_string_lossy().to_string()
}

/// Reads a repo-local Git config value.
///
/// Returns `Ok(Some(value))` when the key exists and is non-empty.
/// Returns `Ok(None)` when the key is missing.
/// Returns `Err(...)` only for actual process/command problems.
pub(crate) async fn get_local_git_config(
    app: &AppHandle,
    repo_dir: &Path,
    key: &str,
) -> Result<Option<String>, String> {
    let git_exe = get_git_path(app);

    let out = app
        .shell()
        .command(&git_exe)
        .args(["config", "--local", "--get", key])
        .current_dir(repo_dir)
        .output()
        .await
        .map_err(|e| format!("Konnte Git-Einstellung '{key}' nicht lesen: {e}"))?;

    if !out.status.success() {
        return Ok(None);
    }

    let value = String::from_utf8_lossy(&out.stdout).trim().to_string();
    if value.is_empty() {
        Ok(None)
    } else {
        Ok(Some(value))
    }
}

/// Writes a repo-local Git config value into `.git/config`.
pub(crate) async fn set_local_git_config(
    app: &AppHandle,
    repo_dir: &Path,
    key: &str,
    value: &str,
) -> Result<(), String> {
    let git_exe = get_git_path(app);

    let out = app
        .shell()
        .command(&git_exe)
        .args(["config", "--local", key, value])
        .current_dir(repo_dir)
        .output()
        .await
        .map_err(|e| format!("Konnte Git-Einstellung '{key}' nicht setzen: {e}"))?;

    if !out.status.success() {
        let stderr = String::from_utf8_lossy(&out.stderr).trim().to_string();
        let stdout = String::from_utf8_lossy(&out.stdout).trim().to_string();
        let details = if !stderr.is_empty() { stderr } else { stdout };
        return Err(format!("Git-Einstellung '{key}' konnte nicht gesetzt werden: {details}"));
    }

    Ok(())
}

/// Ensures that the cloned repository has a repo-local Git identity.
///
/// This avoids commit failures on clean machines where no global Git identity
/// is configured yet.
pub(crate) async fn ensure_repo_git_identity(
    app: &AppHandle,
    repo_dir: &Path,
) -> Result<(), String> {
    let current_name = get_local_git_config(app, repo_dir, "user.name").await?;
    let current_email = get_local_git_config(app, repo_dir, "user.email").await?;

    if current_name.is_none() {
        set_local_git_config(app, repo_dir, "user.name", DEFAULT_GIT_USER_NAME).await?;
    }

    if current_email.is_none() {
        set_local_git_config(app, repo_dir, "user.email", DEFAULT_GIT_USER_EMAIL).await?;
    }

    Ok(())
}