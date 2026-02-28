# src-tauri – Rust Backend (Tauri v2)

This directory contains the **Rust backend** of the Highland Cattle Editor desktop application.

The backend is responsible for:

- Managing the workspace folder
- Reading and writing website files
- Handling image replacement
- Managing Git operations (clone, commit, push)
- Running preview / dev server processes
- Persisting configuration in `%APPDATA%`
- Emitting structured log events to the frontend

The backend is designed as a **single-user, Windows-first, safe file manipulation layer** with explicit module boundaries.

---

# Architecture Overview

```
src-tauri/
│   lib.rs        -> Tauri application entry
│   main.rs       -> Bootstrap
│
└── modules/
    ├── core/      -> Shared infrastructure
    ├── pages/     -> Page-specific command logic
    ├── workspace/ -> Workspace file operations
    └── utils/     -> Small reusable helpers
```

The backend follows a layered dependency model:

```
lib.rs
  ↓
pages/*
  ↓
workspace/*
  ↓
core/*
  ↓
utils/*
```

## Dependency Rules

- `pages/` may depend on `core`, `workspace`, and `utils`
- `workspace/` may depend on `core` and `utils`
- `core/` must not depend on `pages/` or `workspace/`
- `utils/` should not depend on higher-level modules

These rules prevent circular dependencies and keep the architecture maintainable.

---

# Module Breakdown

## core/ – Infrastructure Layer

Shared foundational functionality.

| File | Responsibility |
|------|----------------|
| `config.rs` | Load and persist `config.json` in `%APPDATA%` |
| `state.rs` | Global application state (`WorkspaceState`, `DevServerState`) |
| `events.rs` | Emits structured events to frontend (`setup:log`, `publish:log`) |
| `process.rs` | Safe command execution with streaming stdout/stderr |

This layer contains **no page-specific logic**.

---

## pages/ – Page Command Handlers

These files map directly to frontend pages.

| File | Frontend Page |
|------|--------------|
| `setup.rs` | Setup screen (clone repo, set token) |
| `publish.rs` | Publish screen (commit + push) |
| `preview.rs` | Preview screen (start/stop dev server) |

Each file contains `#[tauri::command]` functions exposed to the frontend.

These modules orchestrate operations across `workspace/`, `core/`, and `utils/`.

---

## workspace/ – Workspace File Operations

All filesystem operations inside the selected workspace are handled here.

| File | Responsibility |
|------|----------------|
| `workspace.rs` | Select, validate, and persist workspace folder |
| `fs_text.rs` | Read/write text files inside workspace |
| `images.rs` | Replace images safely inside `public/images` |

All file access goes through:

```
workspace_base_dir()
resolve_in_workspace_dir()
```

This prevents path traversal and unsafe file access.

---

## utils/ – Small Helpers

Contains minimal reusable utilities.

| File | Responsibility |
|------|----------------|
| `git.rs` | Check Git availability, validate repo URL |
| `path_safety.rs` | Prevent `..` traversal and absolute paths |

This layer should remain small and dependency-light.

---

# State Management

Two global states are registered in `lib.rs`:

```rust
.manage(core::state::WorkspaceState::default())
.manage(core::state::DevServerState::default())
```

## WorkspaceState

Stores the currently selected workspace directory.

## DevServerState

Stores the preview process child handle (if running).

---

# Configuration

Configuration is stored at:

```
%APPDATA%/com.highland-cattle-editor.app/config.json
```

Example:

```json
{
  "workspace_path": "C:\\Users\\User\\AppData\\Roaming\\...\\website",
  "github_token": "ghp_..."
}
```

The config file is read and written using:

```rust
core::config::read_config()
core::config::write_config()
```

---

# Git & Publish Flow

Publish process (`pages/publish.rs`):

1. Validate workspace
2. Ensure `.git` exists
3. Validate Git installation
4. Check for changes (`git status`)
5. Stage (`git add -A`)
6. Commit with timestamp
7. Push via HTTPS using temporary Basic Auth header

All command execution is handled by:

```rust
core::process::run_cmd_stream_lines()
```

which streams logs back to the frontend.

---

# Event System

Frontend listens to structured events:

| Event Name | Used By |
|------------|----------|
| `setup:log` | Setup page |
| `publish:log` | Publish page |

Events are emitted using:

```rust
core::events::emit_setup()
core::events::emit_publish()
```

---

# Safety Principles

The backend enforces:

- No absolute path injection
- No `..` traversal
- All file access restricted to selected workspace
- Controlled image replacement lifecycle
- Non-interactive Git execution (no blocking prompts)
- Redaction of GitHub token in error messages

---

# Adding a New Page

To add a new backend page:

1. Create a file in `modules/pages/`
2. Add it to `pages/mod.rs`
3. Implement `#[tauri::command]` functions
4. Register commands in `lib.rs` inside `generate_handler![]`
5. Use `core/`, `workspace/`, and `utils/` as needed

---

# Public vs Internal API

### `pub` functions
Only Tauri command functions must be `pub`.

### `pub(crate)` functions
All helpers inside `core/`, `workspace/`, and `utils/` should be `pub(crate)`.

This keeps the backend encapsulated.

---

# Design Philosophy

This backend intentionally:

- Avoids over-engineering
- Avoids unnecessary abstraction
- Uses explicit file operations
- Favors clarity over cleverness
- Is optimized for single-user Windows usage

The goal is to provide a **safe editing layer** for non-technical farm owners while keeping the architecture maintainable and extensible.

