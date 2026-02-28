use std::io::{BufRead, BufReader};
use std::process::{Command, Stdio};
use std::sync::mpsc;
use std::time::Duration;

use tauri::{AppHandle, State};

use crate::modules::core::events::emit_preview;
use crate::modules::core::state::{DevServerState, WorkspaceState};
use crate::modules::utils::node::find_npm;
use crate::modules::utils::git::has_git;
use crate::modules::workspace::workspace::workspace_base_dir;


#[tauri::command]
pub fn reset_preview_changes(
    app: AppHandle,
    state: State<'_, WorkspaceState>,
    dev_state: State<'_, DevServerState>,
) -> Result<(), String> {
    // Safety: don't reset while dev server is running
    {
        let child_guard = dev_state
            .child
            .lock()
            .map_err(|_| "DevServerState poisoned".to_string())?;
        if child_guard.is_some() {
            emit_preview(
                &app,
                "error",
                "Stop the preview server before resetting changes.",
                "git",
            );
            return Err("Stop the preview server before resetting changes.".into());
        }
    }

    if !has_git() {
        emit_preview(&app, "error", "Git is not available on this system.", "git");
        return Err("Git is not available on this system.".into());
    }

    let base = workspace_base_dir(&state)?;
    let site_dir = resolve_site_dir(&base)?;

    // Must be a git repo (you only want to reset the website repo)
    if !site_dir.join(".git").exists() {
        emit_preview(
            &app,
            "error",
            "Selected website folder is not a git repository (missing .git).",
            "git",
        );
        return Err("Selected website folder is not a git repository (missing .git).".into());
    }

    emit_preview(&app, "info", "Checking working tree...", "git");

    // Check if there is anything to reset
    let status_out = Command::new("git")
        .args(["status", "--porcelain"])
        .current_dir(&site_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .map_err(|e| format!("Failed to run git status: {e}"))?;

    if !status_out.status.success() {
        let err = String::from_utf8_lossy(&status_out.stderr).to_string();
        emit_preview(&app, "error", &format!("git status failed: {err}"), "git");
        return Err(format!("git status failed: {err}"));
    }

    let porcelain = String::from_utf8_lossy(&status_out.stdout).trim().to_string();
    if porcelain.is_empty() {
        emit_preview(&app, "info", "No local changes found. Nothing to reset.", "git");
        return Ok(());
    }

    emit_preview(&app, "info", "Discarding changes (git reset --hard HEAD)...", "git");
    let s1 = Command::new("git")
        .args(["reset", "--hard", "HEAD"])
        .current_dir(&site_dir)
        .status()
        .map_err(|e| format!("Failed to run git reset: {e}"))?;
    if !s1.success() {
        emit_preview(&app, "error", "git reset --hard failed.", "git");
        return Err("git reset --hard failed.".into());
    }

    // Optional but safe: ensure staged changes are gone as well
    // (won't hurt even if nothing is staged)
    let _ = Command::new("git")
        .args(["restore", "--staged", "."])
        .current_dir(&site_dir)
        .status();

    emit_preview(&app, "info", "Removing untracked files (git clean -fd)...", "git");
    let s2 = Command::new("git")
        .args(["clean", "-fd"])
        .current_dir(&site_dir)
        .status()
        .map_err(|e| format!("Failed to run git clean: {e}"))?;
    if !s2.success() {
        emit_preview(&app, "error", "git clean -fd failed.", "git");
        return Err("git clean -fd failed.".into());
    }

    emit_preview(&app, "info", "Reset complete. All uncommitted changes were removed.", "git");
    Ok(())
}

#[tauri::command]
pub async fn start_preview_dev_server(
    app: AppHandle,
    state: State<'_, WorkspaceState>,
    dev_state: State<'_, DevServerState>,
) -> Result<String, String> {
    let base = workspace_base_dir(&state)?;
    let site_dir = resolve_site_dir(&base)?;

    // already running?
    {
        let child_guard = dev_state
            .child
            .lock()
            .map_err(|_| "DevServerState poisoned".to_string())?;
        if child_guard.is_some() {
            let url_guard = dev_state
                .url
                .lock()
                .map_err(|_| "DevServerState poisoned".to_string())?;
            if let Some(url) = url_guard.clone() {
                emit_preview(&app, "info", "Dev server already running.", "preview");
                return Ok(url);
            } else {
                return Err("Dev server is running but URL is unknown.".into());
            }
        }
    }

    // npm path
    let npm_path = find_npm()?;
    emit_preview(&app, "info", &format!("Using npm at: {}", npm_path.display()), "npm");

    // sanity
    if !site_dir.join("package.json").exists() {
        return Err("Workspace does not look like a Node/Vite project (missing package.json).".into());
    }

    // npm install if needed
    if !site_dir.join("node_modules").exists() {
        emit_preview(&app, "info", "node_modules not found. Running npm install...", "npm");

        let app2 = app.clone();
        let site2 = site_dir.clone();
        let npm2 = npm_path.clone();

        tauri::async_runtime::spawn_blocking(move || -> Result<(), String> {
            let mut c = npm_command(&npm2, &["install"]);
            c.current_dir(&site2)
                .stdout(Stdio::piped())
                .stderr(Stdio::piped());

            let mut child = c.spawn().map_err(|e| format!("Failed to start command: {e}"))?;

            let stdout = child.stdout.take();
            let stderr = child.stderr.take();

            if let Some(stdout) = stdout {
                let app_stdout = app2.clone();
                std::thread::spawn(move || {
                    let reader = BufReader::new(stdout);
                    for line in reader.lines().flatten() {
                        // Choose one:
                        // - clean logs:
                        let clean = strip_ansi(&line);
                        emit_preview(&app_stdout, "info", &clean, "npm");
                        // - or raw logs:
                        // emit_preview(&app_stdout, "info", &line, "npm");
                    }
                });
            }

            if let Some(stderr) = stderr {
                let app_stderr = app2.clone();
                std::thread::spawn(move || {
                    let reader = BufReader::new(stderr);
                    for line in reader.lines().flatten() {
                        let clean = strip_ansi(&line);
                        emit_preview(&app_stderr, "info", &clean, "npm");
                    }
                });
            }

            let status = child.wait().map_err(|e| e.to_string())?;
            if !status.success() {
                return Err(format!("npm install failed: {status}"));
            }
            Ok(())
        })
        .await
        .map_err(|e| format!("npm install task failed: {e:?}"))??;

        emit_preview(&app, "info", "npm install finished.", "npm");
    } else {
        emit_preview(&app, "info", "node_modules found. Skipping npm install.", "npm");
    }

    // start dev server (long-running)
    emit_preview(&app, "info", "Starting Vite dev server (npm run dev)...", "vite");

    let mut cmd = npm_command(&npm_path, &["run", "dev"]);
    cmd.current_dir(&site_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("Failed to start dev server. ({e})"))?;

    let stdout_opt = child.stdout.take();
    let stderr_opt = child.stderr.take();

    if stdout_opt.is_none() && stderr_opt.is_none() {
        return Err("Failed to capture dev server output (stdout/stderr not piped).".into());
    }

    let (tx, rx) = mpsc::channel::<String>();

    // stdout thread
    if let Some(stdout) = stdout_opt {
        let app_stdout = app.clone();
        let tx_stdout = tx.clone();
        std::thread::spawn(move || {
            let reader = BufReader::new(stdout);
            for line in reader.lines().flatten() {
                let clean = strip_ansi(&line);

                // show clean logs (recommended)
                emit_preview(&app_stdout, "info", &clean, "vite");
                // or raw:
                // emit_preview(&app_stdout, "info", &line, "vite");

                if let Some(url) = extract_vite_url(&clean) {
                    let _ = tx_stdout.send(url);
                }
            }
        });
    } else {
        emit_preview(&app, "info", "Dev server stdout not available (will use stderr only).", "vite");
    }

    // stderr thread
    if let Some(stderr) = stderr_opt {
        let app_stderr = app.clone();
        let tx_stderr = tx.clone();
        std::thread::spawn(move || {
            let reader = BufReader::new(stderr);
            for line in reader.lines().flatten() {
                let clean = strip_ansi(&line);
                let lower = clean.to_lowercase();
                let lvl = if lower.contains("error") || lower.contains("failed") || lower.contains("fatal") {
                    "error"
                } else {
                    "info"
                };

                // show clean logs
                emit_preview(&app_stderr, lvl, &clean, "vite");

                // IMPORTANT: parse URL from the CLEAN line
                if let Some(url) = extract_vite_url(&clean) {
                    let _ = tx_stderr.send(url);
                }
            }
        });
    }

    // Wait for URL
    let url = rx
        .recv_timeout(Duration::from_secs(20))
        .map_err(|_| "Dev server started, but could not detect the Vite URL (timeout).".to_string())?;

    // store state
    {
        let mut child_guard = dev_state
            .child
            .lock()
            .map_err(|_| "DevServerState poisoned".to_string())?;
        *child_guard = Some(child);

        let mut url_guard = dev_state
            .url
            .lock()
            .map_err(|_| "DevServerState poisoned".to_string())?;
        *url_guard = Some(url.clone());
    }

    emit_preview(&app, "info", &format!("Detected Vite URL: {url}"), "vite");
    Ok(url)
}

#[tauri::command]
pub fn stop_preview_dev_server(
    app: AppHandle,
    dev_state: State<'_, DevServerState>,
) -> Result<(), String> {
    let mut child_opt = dev_state
        .child
        .lock()
        .map_err(|_| "DevServerState poisoned".to_string())?
        .take();

    {
        let mut url_guard = dev_state
            .url
            .lock()
            .map_err(|_| "DevServerState poisoned".to_string())?;
        *url_guard = None;
    }

    let Some(mut child) = child_opt.take() else {
        emit_preview(&app, "info", "Dev server not running.", "preview");
        return Ok(());
    };

    let pid = child.id();
    emit_preview(&app, "info", &format!("Stopping dev server (PID={pid})..."), "preview");

    let status = Command::new("taskkill")
        .args(["/PID", &pid.to_string(), "/T", "/F"])
        .status();

    match status {
        Ok(s) if s.success() => {
            let _ = child.wait();
            emit_preview(&app, "info", "Dev server stopped.", "preview");
            Ok(())
        }
        Ok(s) => {
            let _ = child.kill();
            let _ = child.wait();
            Err(format!("taskkill failed (exit {s}). Dev server may not be fully stopped."))
        }
        Err(e) => {
            let _ = child.kill();
            let _ = child.wait();
            Err(format!("Failed to run taskkill: {e}"))
        }
    }
}



///////////////////////////////////////////////////////////////////////////////
////////////////// HELPERS ////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

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

pub(crate) fn strip_ansi(s: &str) -> String {
    // Removes ANSI escape sequences like \x1b[32m, \x1b[1m, etc.
    let mut out = String::with_capacity(s.len());
    let mut chars = s.chars().peekable();

    while let Some(c) = chars.next() {
        if c == '\u{1b}' {
            if matches!(chars.peek(), Some('[')) {
                chars.next(); // '['
                while let Some(cc) = chars.next() {
                    if cc.is_ascii_alphabetic() {
                        break;
                    }
                }
                continue;
            }
        }
        out.push(c);
    }

    out
}

/// If user selected a parent folder, try to locate the actual website dir.
/// - prefer workspace root if it contains package.json
/// - else accept workspace/highland-cattle-dev if that contains package.json
pub(crate) fn resolve_site_dir(base: &std::path::Path) -> Result<std::path::PathBuf, String> {
    if base.join("package.json").exists() {
        return Ok(base.to_path_buf());
    }
    let nested = base.join("highland-cattle-dev");
    if nested.join("package.json").exists() {
        return Ok(nested);
    }
    Err("Could not find package.json in workspace. Select the website folder that contains package.json.".into())
}

/// Build an npm command. If npm is a .cmd/.bat, run through cmd.exe /C.
pub(crate) fn npm_command(npm_path: &std::path::Path, args: &[&str]) -> Command {
    let ext = npm_path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();

    if ext == "cmd" || ext == "bat" {
        let mut c = Command::new("cmd");
        c.arg("/C").arg(npm_path);
        c.args(args);
        c
    } else {
        let mut c = Command::new(npm_path);
        c.args(args);
        c
    }
}

