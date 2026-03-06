//! Shared runtime state for the Tauri backend.
//!
//! This module contains in-memory state that is shared across commands,
//! such as the currently selected workspace path and the running preview
//! development server process.

use std::path::PathBuf;
use std::sync::Mutex;
use tauri_plugin_shell::process::CommandChild;


/// Stores the currently running preview development server state.
///
/// 'child' holds the spawned dev-server process so it can later be stopped.
/// 'url' stores the detected preview URL so repeated start requests can
/// return the existing address instead of launching another process.
#[derive(Default)]
pub(crate) struct DevServerState {
  pub child: Mutex<Option<CommandChild>>,
  pub url: Mutex<Option<String>>,
}

/// Stores the currently selected workspace path in memory.
///
/// The workspace is shared across backend commands and represents the
/// root directory in which website file operations are allowed.
#[derive(Default)]
pub(crate) struct WorkspaceState {
  pub base_path: Mutex<Option<PathBuf>>,
}