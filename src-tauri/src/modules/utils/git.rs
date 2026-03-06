//! This file module Git-specific helpers. 
//! It handles validating GitHub repo URLs and resolving the bundled Git executable path.

use tauri::{AppHandle,Manager};


/// Validates that a repository URL points to GitHub over HTTPS.
///
/// This application only supports GitHub HTTPS repository URLs in order
/// to keep authentication and support flows simple for non-technical users.
pub(crate) fn validate_github_https_repo_url(repo_url: &str) -> Result<(), String> {
    if !repo_url.starts_with("https://github.com/") {
        return Err("Repo URL must start with https://github.com/".into());
    }
    Ok(())
}

/// Returns the absolute path to the bundled `git.exe`.
///
/// The application ships with its own MinGit distribution so Git commands
/// do not depend on a separate system-wide Git installation.
pub(crate) fn get_git_path(app: &AppHandle) -> String {
    let resource_path = app.path().resource_dir().unwrap()
        .join("dependencies")
        .join("resources")
        .join("mingit")
        .join("cmd")
        .join("git.exe");
    resource_path.to_string_lossy().to_string()
}