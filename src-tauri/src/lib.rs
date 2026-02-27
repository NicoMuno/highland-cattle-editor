use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

use std::ffi::OsStr;
use std::time::{SystemTime, UNIX_EPOCH};

use base64::{engine::general_purpose, Engine as _};

use std::process::{Child, Command, Stdio};
use std::io::{BufRead, BufReader};
use tauri::Emitter; // for emit()

// -------------------- Workspace persistence --------------------


#[derive(Default)]
struct DevServerState {
    child: Mutex<Option<Child>>,
}

#[derive(Default)]
struct WorkspaceState {
    base_path: Mutex<Option<PathBuf>>,
}

#[derive(Debug, Serialize, Deserialize, Default)]
#[serde(default)]
struct AppConfig {
    workspace_path: Option<String>,
    github_token: Option<String>,
}

fn app_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app_data_dir: {e}"))
}

// TOKEN commands:
#[tauri::command]
fn get_github_token(app: AppHandle) -> Result<Option<String>, String> {
    Ok(read_config(&app)?.github_token)
}

#[tauri::command]
fn set_github_token(app: AppHandle, token: String) -> Result<(), String> {
    let mut cfg = read_config(&app)?;
    cfg.github_token = Some(token);
    write_config(&app, &cfg)?;
    Ok(())
}

// publish runner helpers

fn emit_publish(app: &AppHandle, level: &str, msg: &str, label: &str) {
    let _ = app.emit(
        "publish:log",
        serde_json::json!({ "type": level, "message": msg, "label": label }),
    );
}

// Publish logging
fn run_cmd_capture_lines_publish(app: &AppHandle, label: &str, mut cmd: Command) -> Result<(), String> {
    let mut child = cmd
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start command: {e}"))?;

    let stdout = child.stdout.take().ok_or("Missing stdout")?;
    let stderr = child.stderr.take().ok_or("Missing stderr")?;

    let app_stdout = app.clone();
    let label_stdout = label.to_string();
    std::thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines().flatten() {
            let _ = app_stdout.emit(
                "publish:log",
                serde_json::json!({ "type": "info", "message": line, "label": label_stdout }),
            );
        }
    });

    let app_stderr = app.clone();
    let label_stderr = label.to_string();
    std::thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines().flatten() {
            let _ = app_stderr.emit(
                "publish:log",
                serde_json::json!({ "type": "error", "message": line, "label": label_stderr }),
            );
        }
    });

    let status = child.wait().map_err(|e| e.to_string())?;
    if !status.success() {
        return Err(format!("Command failed: {label} ({status})"));
    }
    Ok(())
}

// Git helper 

fn has_git() -> bool {
    Command::new("git")
        .arg("--version")
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

fn validate_github_https_repo_url(repo_url: &str) -> Result<(), String> {
    if !repo_url.starts_with("https://github.com/") {
        return Err("Repo URL must start with https://github.com/".into());
    }
    Ok(())
}

fn emit_setup(app: &AppHandle, level: &str, msg: &str, label: &str) {
    let _ = app.emit(
        "setup:log",
        serde_json::json!({ "type": level, "message": msg, "label": label }),
    );
}

fn run_cmd_stream_setup(app: &AppHandle, label: &str, mut cmd: Command) -> Result<(), String> {
    let mut child = cmd
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start command: {e}"))?;

    let stdout = child.stdout.take().ok_or("Missing stdout")?;
    let stderr = child.stderr.take().ok_or("Missing stderr")?;

    // stdout
    let app_stdout = app.clone();
    let label_stdout = label.to_string();
    std::thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines().flatten() {
            emit_setup(&app_stdout, "info", &line, &label_stdout);
        }
    });

    // stderr (git clone progress is here)
    let app_stderr = app.clone();
    let label_stderr = label.to_string();
    std::thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines().flatten() {
            // treat stderr as info unless it looks like an error
            let lvl = if line.to_lowercase().contains("error")
                || line.to_lowercase().contains("fatal")
                || line.to_lowercase().contains("authentication")
            {
                "error"
            } else {
                "info"
            };
            emit_setup(&app_stderr, lvl, &line, &label_stderr);
        }
    });

    let status = child.wait().map_err(|e| e.to_string())?;
    if !status.success() {
        return Err(format!("Command failed: {label} ({status})"));
    }
    Ok(())
}

#[tauri::command]
async fn clone_dev_repo(
    app: AppHandle,
    state: tauri::State<'_, WorkspaceState>,
    repo_url: String,
) -> Result<String, String> {
    let repo_url = repo_url.trim().to_string();

    emit_setup(&app, "info", "Starting clone...", "clone");

    // Check git exists
    if !has_git() {
        emit_setup(&app, "error", "Git not found in PATH.", "clone");
        return Err("Git is not installed or not available in PATH.".into());
    }

    validate_github_https_repo_url(&repo_url).map_err(|e| {
        emit_setup(&app, "error", &e, "clone");
        e
    })?;

    // Read token from config
    let cfg = read_config(&app)?;
    let token = cfg.github_token.ok_or_else(|| {
        "No GitHub token set. Please save a token first.".to_string()
    })?;

    // Choose clone target (app data website folder)
    let target = default_workspace_dir(&app)?;
    emit_setup(&app, "info", &format!("Target folder: {}", target.to_string_lossy()), "clone");

    // Safety: require empty target folder
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

    // // Auth URL (never log it)
    // let authed_url = repo_url.replacen(
    //     "https://",
    //     &format!("https://x-access-token:{token}@"),
    //     1,
    // );

    emit_setup(&app, "info", "Running git clone...", "clone");

    // IMPORTANT: disable any interactive prompts (otherwise it can hang)
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

    // Run clone with streaming logs (spawn_blocking because it waits)
    let app2 = app.clone();
    let target2 = target.clone();
    let result = tauri::async_runtime::spawn_blocking(move || {
        run_cmd_stream_setup(&app2, "git", cmd)
    })
    .await
    .map_err(|e| format!("Clone task failed: {e:?}"))?;

    if let Err(err) = result {
        emit_setup(&app, "error", &format!("Clone failed: {err}"), "clone");

        // Cleanup partial clone so retries work
        let _ = fs::remove_dir_all(&target2);
        emit_setup(&app, "info", "Cleaned up partial clone folder.", "clone");

        return Err(err);
    }

    // Validate repo looks correct
    if !target.join("package.json").exists() {
        emit_setup(&app, "error", "Clone finished but package.json is missing.", "clone");
        let _ = fs::remove_dir_all(&target);
        return Err("Clone finished but repo doesn't look like the website (missing package.json).".into());
    }

    // Set workspace state + persist config
    set_state_workspace(&state, target.clone());
    let mut cfg2 = read_config(&app)?;
    cfg2.workspace_path = Some(target.to_string_lossy().to_string());
    write_config(&app, &cfg2)?;

    emit_setup(&app, "success", "Clone complete. Workspace configured ✅", "clone");

    Ok(target.to_string_lossy().to_string())
}

#[tauri::command]
async fn run_publish(app: AppHandle, state: tauri::State<'_, WorkspaceState>) -> Result<(), String> {
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
            run_cmd_capture_lines_publish(
                &app2,
                "git",
                {
                    let mut c = Command::new("git");
                    c.current_dir(&base2).args(["add", "-A"]);
                    c
                },
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

/// Default legacy hardcoded folder (what you used before)
fn default_workspace_dir(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app_data_dir(app)?.join("website"))
}

/// Config file path (persist selection here)
fn config_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app_data_dir(app)?.join("config.json"))
}

fn read_config(app: &AppHandle) -> Result<AppConfig, String> {
    let cfg_path = config_path(app)?;
    if !cfg_path.exists() {
        return Ok(AppConfig::default());
    }

    let txt = fs::read_to_string(cfg_path).map_err(|e| format!("Read config failed: {e}"))?;
    serde_json::from_str(&txt).map_err(|e| format!("Parse config failed: {e}"))
}

fn write_config(app: &AppHandle, cfg: &AppConfig) -> Result<(), String> {
    let cfg_path = config_path(app)?;
    if let Some(parent) = cfg_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Create config dir failed: {e}"))?;
    }
    let txt = serde_json::to_string_pretty(cfg).map_err(|e| format!("Serialize config failed: {e}"))?;
    fs::write(cfg_path, txt).map_err(|e| format!("Write config failed: {e}"))?;
    Ok(())
}

fn set_state_workspace(state: &tauri::State<WorkspaceState>, path: PathBuf) {
    let mut guard = state.base_path.lock().unwrap();
    *guard = Some(path);
}

fn get_state_workspace(state: &tauri::State<WorkspaceState>) -> Option<PathBuf> {
    state.base_path.lock().unwrap().clone()
}

fn validate_workspace_folder(path: &Path) -> Result<(), String> {
    if !path.exists() {
        return Err("Selected folder does not exist.".into());
    }
    if !path.is_dir() {
        return Err("Selected path is not a folder.".into());
    }

    // Strict validation (optional):
    // let expected = path.join("src").join("data");
    // if !expected.exists() {
    //     return Err("Folder does not look like a website repo (missing src/data).".into());
    // }

    Ok(())
}

// -------------------- Safe path resolve --------------------

fn resolve_in_workspace_dir(base: &Path, relative: &str) -> Result<PathBuf, String> {
    let rel = Path::new(relative);

    if rel.is_absolute() {
        return Err("Absolute paths are not allowed.".into());
    }

    for comp in rel.components() {
        if matches!(comp, std::path::Component::ParentDir) {
            return Err("Parent directory '..' is not allowed.".into());
        }
    }

    Ok(base.join(rel))
}

fn workspace_base_dir(state: &tauri::State<WorkspaceState>) -> Result<PathBuf, String> {
    get_state_workspace(state).ok_or_else(|| "Workspace folder not selected.".into())
}

// -------------------- Commands --------------------

#[tauri::command]
fn clear_workspace_folder(app: AppHandle, state: tauri::State<WorkspaceState>) -> Result<(), String> {
    // clear in-memory
    {
        let mut guard = state.base_path.lock().unwrap();
        *guard = None;
    }

    // clear persisted config
    let mut cfg = read_config(&app)?;
    cfg.workspace_path = None;
    write_config(&app, &cfg)?;

    Ok(())
}


#[tauri::command]
fn get_default_workspace_folder(app: AppHandle) -> Result<String, String> {
    Ok(default_workspace_dir(&app)?.to_string_lossy().to_string())
}

#[tauri::command]
fn load_workspace_from_config(app: AppHandle, state: tauri::State<WorkspaceState>) -> Result<Option<String>, String> {
    let cfg = read_config(&app)?;
    if let Some(p) = cfg.workspace_path {
        let pb = PathBuf::from(&p);
        // If folder no longer exists, treat as not configured.
        if pb.exists() && pb.is_dir() {
            set_state_workspace(&state, pb.clone());
            return Ok(Some(p));
        }
    }
    Ok(None)
}

#[tauri::command]
fn get_workspace_folder(state: tauri::State<WorkspaceState>) -> Result<Option<String>, String> {
    Ok(get_state_workspace(&state).map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
fn set_workspace_folder(
    app: AppHandle,
    state: tauri::State<WorkspaceState>,
    folder_path: String,
) -> Result<(), String> {
    let path = PathBuf::from(&folder_path);
    validate_workspace_folder(&path)?;

    set_state_workspace(&state, path.clone());

    // Persist (do NOT wipe token)
    let mut cfg = read_config(&app)?;
    cfg.workspace_path = Some(path.to_string_lossy().to_string());
    write_config(&app, &cfg)?;

    Ok(())
}

#[tauri::command]
fn use_default_workspace_folder(app: AppHandle, state: tauri::State<WorkspaceState>) -> Result<String, String> {
    let path = default_workspace_dir(&app)?;
    fs::create_dir_all(&path).map_err(|e| format!("Failed to create default website dir: {e}"))?;

    set_state_workspace(&state, path.clone());

    let mut cfg = read_config(&app)?;
    cfg.workspace_path = Some(path.to_string_lossy().to_string());
    write_config(&app, &cfg)?;
    write_config(&app, &cfg)?;

    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
fn file_exists_in_website(state: tauri::State<WorkspaceState>, relative_path: String) -> Result<bool, String> {
    let base = workspace_base_dir(&state)?;
    let path = resolve_in_workspace_dir(&base, &relative_path)?;
    Ok(path.exists())
}

#[tauri::command]
fn read_text_in_website(state: tauri::State<WorkspaceState>, relative_path: String) -> Result<String, String> {
    let base = workspace_base_dir(&state)?;
    let path = resolve_in_workspace_dir(&base, &relative_path)?;
    fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_text_in_website(state: tauri::State<WorkspaceState>, relative_path: String, content: String) -> Result<(), String> {
    let base = workspace_base_dir(&state)?;
    let path = resolve_in_workspace_dir(&base, &relative_path)?;

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create parent dir: {e}"))?;
    }

    fs::write(path, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn replace_image_in_public(
    state: tauri::State<WorkspaceState>,
    old_relative_path: Option<String>,
    new_abs_path: String,
    target_subfolder: String,
) -> Result<String, String> {
    let base = workspace_base_dir(&state)?;
    let public_images_dir = base.join("public").join("images");

    let target_dir = public_images_dir.join(&target_subfolder);
    if target_subfolder != "pages" && target_subfolder != "cattle" {
        return Err("Invalid target_subfolder (must be 'pages' or 'cattle')".into());
    }

    fs::create_dir_all(&target_dir).map_err(|e| format!("Failed to create target folder: {e}"))?;

    // Move old file to legacy
    if let Some(old_rel) = old_relative_path {
        if old_rel.starts_with("images/") {

            // Resolve safely inside workspace
            let old_path = resolve_in_workspace_dir(&base, &format!("public/{}", old_rel))?;
            if !old_path.starts_with(&public_images_dir) {
                return Err("Old image path must stay inside public/images.".into());
            }

            if old_path.exists() {
                let legacy_dir = public_images_dir.join("legacy").join(&target_subfolder);
                fs::create_dir_all(&legacy_dir)
                    .map_err(|e| format!("Failed to create legacy folder: {e}"))?;

                let ts = SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .map_err(|e| e.to_string())?
                    .as_secs();

                let stem = old_path.file_stem().and_then(OsStr::to_str).unwrap_or("old");
                let ext = old_path.extension().and_then(OsStr::to_str).unwrap_or("jpg");

                let legacy_name = format!("{stem}_{ts}.{ext}");
                let legacy_path = legacy_dir.join(legacy_name);

                if let Err(_) = fs::rename(&old_path, &legacy_path) {
                    fs::copy(&old_path, &legacy_path)
                        .map_err(|e| format!("Failed to copy old image to legacy: {e}"))?;
                    fs::remove_file(&old_path)
                        .map_err(|e| format!("Failed to remove old image: {e}"))?;
                }
            }
        }
    }


    // Copy new image
    let new_path = Path::new(&new_abs_path);
    if !new_path.exists() {
        return Err("Selected image does not exist.".into());
    }

    let ext = new_path.extension().and_then(OsStr::to_str).unwrap_or("").to_lowercase();
    let allowed = ["png", "jpg", "jpeg", "webp"];
    if !allowed.contains(&ext.as_str()) {
        return Err("Unsupported image type.".into());
    }
    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_secs();

    let new_filename = format!("img_{ts}.{ext}");
    let final_path = target_dir.join(&new_filename);

    fs::copy(new_path, &final_path).map_err(|e| format!("Failed to copy new image: {e}"))?;

    Ok(format!("images/{}/{}", target_subfolder, new_filename))
}


#[tauri::command]
fn read_image_data_url_in_website(
    state: tauri::State<WorkspaceState>,
    relative_path: String,
) -> Result<String, String> {
    let base = workspace_base_dir(&state)?;
    let path = resolve_in_workspace_dir(&base, &relative_path)?;

    if !path.exists() {
        return Err("Image file does not exist.".into());
    }

    let ext = path
        .extension()
        .and_then(OsStr::to_str)
        .unwrap_or("")
        .to_lowercase();

    let mime = match ext.as_str() {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "webp" => "image/webp",
        _ => return Err("Unsupported image type.".into()),
    };

    let bytes = fs::read(&path).map_err(|e| format!("Failed to read image: {e}"))?;
    let b64 = general_purpose::STANDARD.encode(bytes);

    Ok(format!("data:{mime};base64,{b64}"))
}

// PREVIEW:

fn run_cmd_capture_lines(
    app: &AppHandle,
    label: &str,
    mut cmd: Command,
) -> Result<(), String> {
    let mut child = cmd
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start command: {e}"))?;

    let stdout = child.stdout.take().ok_or("Missing stdout")?;
    let stderr = child.stderr.take().ok_or("Missing stderr")?;

    let app_stdout = app.clone();
    let label_stdout = label.to_string();
    std::thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines().flatten() {
            let _ = app_stdout.emit(
                "preview:log",
                serde_json::json!({ "type": "info", "message": line, "label": label_stdout }),
            );
        }
    });

    let app_stderr = app.clone();
    let label_stderr = label.to_string();
    std::thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines().flatten() {
            let _ = app_stderr.emit(
                "preview:log",
                serde_json::json!({ "type": "error", "message": line, "label": label_stderr }),
            );
        }
    });

    let status = child.wait().ok();
    let _ = app.emit(
        "preview:log",
        serde_json::json!({
            "type": "info",
            "message": format!("Command exited: {:?}", status),
            "label": label
        }),
    );

    Ok(())
}

fn has_node_and_npm() -> bool {
    let node_ok = Command::new("node")
        .arg("--version")
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .map(|s| s.success())
        .unwrap_or(false);

    let npm_ok = Command::new("npm")
        .arg("--version")
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .map(|s| s.success())
        .unwrap_or(false);

    node_ok && npm_ok
}

fn should_install_deps(repo_dir: &Path) -> bool {
    // Minimal heuristic: node_modules missing => install needed
    !repo_dir.join("node_modules").exists()
}

#[tauri::command]
async fn start_preview_dev_server(
    app: AppHandle,
    state: tauri::State<'_, WorkspaceState>,
    dev_state: tauri::State<'_, DevServerState>,
) -> Result<String, String> {
    let base = workspace_base_dir(&state)?;
    // IMPORTANT: base is your selected workspace folder which should be highland-cattle-dev
    // You can tighten this check later (presence of package.json etc.)
    let pkg = base.join("package.json");
    if !pkg.exists() {
        return Err("Workspace does not look like a Vite website repo (missing package.json).".into());
    }

    // 1) Node/NPM check
    if !has_node_and_npm() {
        return Err(
            "Node.js and npm are not available. Install Node.js (LTS) and restart the app.".into(),
        );
    }

    // 2) If already running, return current URL (simple: deny for now)
    {
        let guard = dev_state.child.lock().unwrap();
        if guard.is_some() {
            return Err("Preview server is already running.".into());
        }
    }

    // 3) Install deps if needed
    if should_install_deps(&base) {
        let _ = app.emit(
            "preview:log",
            serde_json::json!({ "type": "info", "message": "Installing dependencies (npm install)...", "label": "npm" }),
        );

        // You can prefer npm ci if package-lock.json exists:
        let has_lock = base.join("package-lock.json").exists();
        let mut cmd = Command::new("npm");
        cmd.current_dir(&base);
        if has_lock {
            cmd.arg("ci");
        } else {
            cmd.arg("install");
        }

        // Run and stream logs
        // NOTE: This blocks, but we're inside an async command: use spawn_blocking.
        tauri::async_runtime::spawn_blocking({
            let app2 = app.clone();
            move || run_cmd_capture_lines(&app2, "npm", cmd)
        })
        .await
        .map_err(|e| format!("Dependency install task failed: {e:?}"))?
        .map_err(|e| e)?;
    } else {
        let _ = app.emit(
            "preview:log",
            serde_json::json!({ "type": "info", "message": "Dependencies already installed.", "label": "npm" }),
        );
    }

    // 4) Start Vite dev server with fixed port so the URL is predictable
    // (this avoids having to parse logs to detect port changes)
    let port = 5173;
    let url = format!("http://localhost:{port}/");

    let mut cmd = Command::new("npm");
    cmd.current_dir(&base)
        .arg("run")
        .arg("dev")
        .arg("--")
        .arg("--host")
        .arg("127.0.0.1")
        .arg("--port")
        .arg(port.to_string())
        .arg("--strictPort")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let mut child = cmd.spawn().map_err(|e| format!("Failed to start dev server: {e}"))?;

    // Stream stdout/stderr
    let stdout = child.stdout.take().ok_or("Missing devserver stdout")?;
    let stderr = child.stderr.take().ok_or("Missing devserver stderr")?;

    let app_stdout = app.clone();
    std::thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines().flatten() {
            let _ = app_stdout.emit(
                "preview:log",
                serde_json::json!({ "type": "info", "message": line, "label": "vite" }),
            );
        }
    });

    let app_stderr = app.clone();
    std::thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines().flatten() {
            let _ = app_stderr.emit(
                "preview:log",
                serde_json::json!({ "type": "error", "message": line, "label": "vite" }),
            );
        }
    });

    // Store child so we can stop it later
    {
        let mut guard = dev_state.child.lock().unwrap();
        *guard = Some(child);
    }

    let _ = app.emit(
        "preview:log",
        serde_json::json!({ "type": "info", "message": format!("Dev server started at {url}"), "label": "vite" }),
    );

    Ok(url)
}


#[tauri::command]
fn stop_preview_dev_server(
    app: AppHandle,
    dev_state: tauri::State<'_, DevServerState>,
) -> Result<(), String> {
    let mut guard = dev_state.child.lock().unwrap();
    if let Some(mut child) = guard.take() {
        let pid = child.id();

        // Try graceful kill first
        let _ = child.kill();

        // Ensure process tree is killed on Windows
        #[cfg(target_os = "windows")]
        {
            let _ = Command::new("taskkill")
                .args(["/PID", &pid.to_string(), "/T", "/F"])
                .status();
        }

        let _ = app.emit(
            "preview:log",
            serde_json::json!({ "type": "info", "message": "Dev server stopped.", "label": "vite" }),
        );
        Ok(())
    } else {
        Err("Dev server is not running.".into())
    }
}


// --------------------------------------------------------------------
// ---------------------RUN--------------------------------------------
// --------------------------------------------------------------------
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(WorkspaceState::default())
        .manage(DevServerState::default())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init()) 
        .invoke_handler(tauri::generate_handler![
            get_default_workspace_folder,
            load_workspace_from_config,
            get_workspace_folder,
            set_workspace_folder,
            use_default_workspace_folder,
            clear_workspace_folder,
            file_exists_in_website,
            read_text_in_website,
            write_text_in_website,
            replace_image_in_public,
            read_image_data_url_in_website,
            start_preview_dev_server,
            stop_preview_dev_server,
            get_github_token,
            set_github_token,
            clone_dev_repo,
            run_publish,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

