//! Path validation helpers for workspace-restricted file access.
//!
//! This module prevents absolute path access and parent directory traversal,
//! ensuring that file operations remain inside the selected workspace.

use std::path::{Path, PathBuf};


/// Resolves a relative path inside the workspace base directory.
///
/// Security rules:
/// - absolute paths are rejected
/// - parent traversal (`..`) is rejected
///
/// This helper is used to ensure that frontend-provided paths cannot escape
/// the selected workspace folder.
pub(crate) fn resolve_in_workspace_dir(base: &Path, relative: &str) -> Result<PathBuf, String> {
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