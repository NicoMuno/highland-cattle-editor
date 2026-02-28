use std::path::PathBuf;
use std::process::Command;

fn pick_best_where_output(stdout: &[u8]) -> Option<PathBuf> {
    let txt = String::from_utf8_lossy(stdout);

    // Prefer .cmd, then .exe, then .bat
    let mut cmd_hit: Option<PathBuf> = None;
    let mut exe_hit: Option<PathBuf> = None;
    let mut bat_hit: Option<PathBuf> = None;

    for raw in txt.lines().map(|l| l.trim()).filter(|l| !l.is_empty()) {
        let p = PathBuf::from(raw);
        let ext = p
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_ascii_lowercase();

        match ext.as_str() {
            "cmd" => {
                cmd_hit = Some(p);
                break; // best
            }
            "exe" => exe_hit = Some(p),
            "bat" => bat_hit = Some(p),
            _ => {}
        }
    }

    cmd_hit.or(exe_hit).or(bat_hit)
}

/// Try to locate npm on Windows.
/// Returns a full path to npm.cmd / npm.exe that can be used to run npm.
pub(crate) fn find_npm() -> Result<PathBuf, String> {
    // 1) Best effort: explicitly ask for npm.cmd first
    if let Ok(out) = Command::new("where").arg("npm.cmd").output() {
        if out.status.success() {
            if let Some(p) = pick_best_where_output(&out.stdout) {
                return Ok(p);
            }
        }
    }

    // 2) Fallback: `where npm` but only accept .cmd/.exe/.bat (ignore extensionless)
    if let Ok(out) = Command::new("where").arg("npm").output() {
        if out.status.success() {
            if let Some(p) = pick_best_where_output(&out.stdout) {
                return Ok(p);
            }
        }
    }

    // 3) Common install locations
    let mut candidates: Vec<PathBuf> = vec![];

    if let Ok(pf) = std::env::var("ProgramFiles") {
        let pf = PathBuf::from(pf).join("nodejs");
        candidates.push(pf.join("npm.cmd"));
        candidates.push(pf.join("npm.exe"));
    }

    if let Ok(pfx86) = std::env::var("ProgramFiles(x86)") {
        let pfx86 = PathBuf::from(pfx86).join("nodejs");
        candidates.push(pfx86.join("npm.cmd"));
        candidates.push(pfx86.join("npm.exe"));
    }

    if let Ok(appdata) = std::env::var("APPDATA") {
        let appdata = PathBuf::from(appdata).join("npm");
        candidates.push(appdata.join("npm.cmd"));
        candidates.push(appdata.join("npm.exe"));
    }

    for c in candidates {
        if c.exists() {
            return Ok(c);
        }
    }

    Err("Node.js/npm not found. Install Node.js (LTS) and ensure npm is available.".into())
}