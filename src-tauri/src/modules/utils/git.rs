use std::process::{Command, Stdio};

pub(crate) fn has_git() -> bool {
    Command::new("git")
        .arg("--version")
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

pub(crate) fn validate_github_https_repo_url(repo_url: &str) -> Result<(), String> {
    if !repo_url.starts_with("https://github.com/") {
        return Err("Repo URL must start with https://github.com/".into());
    }
    Ok(())
}