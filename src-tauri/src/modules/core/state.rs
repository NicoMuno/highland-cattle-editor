use std::path::PathBuf;
use std::process::Child;
use std::sync::Mutex;

#[derive(Default)]
pub(crate) struct DevServerState {
  pub child: Mutex<Option<Child>>,
  pub url: Mutex<Option<String>>,
}

#[derive(Default)]
pub(crate) struct WorkspaceState {
  pub base_path: Mutex<Option<PathBuf>>,
}