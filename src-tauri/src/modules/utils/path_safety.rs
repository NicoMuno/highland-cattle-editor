use std::path::{Path, PathBuf};

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