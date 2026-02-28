// process.rs
use std::io::{BufRead, BufReader};
use std::process::{Command, Stdio};
use tauri::{AppHandle, Emitter};

pub(crate) enum StderrMode {
  AlwaysError,
  SetupHeuristic,
}

pub(crate) fn run_cmd_stream_lines(
  app: &AppHandle,
  event_name: &'static str,
  label: &str,
  mut cmd: Command,
  stderr_mode: StderrMode,
) -> Result<(), String> {
  let mut child = cmd
    .stdout(Stdio::piped())
    .stderr(Stdio::piped())
    .spawn()
    .map_err(|e| format!("Failed to start command: {e}"))?;

  let stdout = child.stdout.take().ok_or("Missing stdout")?;
  let stderr = child.stderr.take().ok_or("Missing stderr")?;

  let label_stdout = label.to_string();
  let app_stdout = app.clone();
  std::thread::spawn(move || {
    let reader = BufReader::new(stdout);
    for line in reader.lines().flatten() {
      let _ = app_stdout.emit(
        event_name,
        serde_json::json!({ "type": "info", "message": line, "label": label_stdout }),
      );
    }
  });

  let label_stderr = label.to_string();
  let app_stderr = app.clone();
  std::thread::spawn(move || {
    let reader = BufReader::new(stderr);
    for line in reader.lines().flatten() {
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

      let _ = app_stderr.emit(
        event_name,
        serde_json::json!({ "type": lvl, "message": line, "label": label_stderr }),
      );
    }
  });

  let status = child.wait().map_err(|e| e.to_string())?;
  if !status.success() {
    return Err(format!("Command failed: {label} ({status})"));
  }
  Ok(())
}