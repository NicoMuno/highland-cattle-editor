# Backend  (`src-tauri`)

## Overview

The `src-tauri` directory contains the **backend** of the Highland Cattle Editor desktop application. It performs all system-level operations required by the editor, such as filesystem access, process management, and Git execution.

While the frontend provides the graphical editing interface, the backend executes the operations that modify the local website project and manage the development workflow.

### Directory Structure

```text
src-tauri/
│   build.rs
│   Cargo.toml
│   tauri.conf.json
│
├── capabilities/
├── dependencies/
├── icons/
└── src/
    │   lib.rs
    │   main.rs
    │
    └── modules/
        ├── core/
        ├── workspace/
        ├── utils/
        └── pages/
```

---

# Dependencies (Embedded Sidecars)

The `dependencies` directory contains **external tools bundled with the application**. These tools are executed as **Tauri sidecars**, meaning standalone executables that are packaged with the app and invoked by the backend when required.

Using sidecars allows the application to behave like a **"just works" desktop application**. Users do not need to install Git, Node.js, or other development tools manually because the required binaries are included with the editor.

**Tauri Sidecar Documentation:** [https://v2.tauri.app/develop/sidecar/](https://v2.tauri.app/develop/sidecar/)

### Folder Structure

```text
src-tauri/dependencies/
│
├── binaries/
│   └── bun.exe
│
└── resources/
    └── mingit/
        └── (unpacked data)
```

### Embedded Tools

| Tool       | Repository                                                                       | License                                                                                                                      | Download                                                                                           |
| ---------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **MinGit** | [https://github.com/git-for-windows/git](https://github.com/git-for-windows/git) | [https://github.com/git-for-windows/git?tab=License-1-ov-file](https://github.com/git-for-windows/git?tab=License-1-ov-file) | [https://github.com/git-for-windows/git/releases](https://github.com/git-for-windows/git/releases) |
| **Bun**    | [https://github.com/oven-sh/bun](https://github.com/oven-sh/bun)                 | [https://github.com/oven-sh/bun?tab=License-1-ov-file](https://github.com/oven-sh/bun?tab=License-1-ov-file)                 | [https://github.com/oven-sh/bun/releases](https://github.com/oven-sh/bun/releases)                 |

### Why These Tools Are Used

**MinGit** provides a minimal portable Git distribution specifically intended to be embedded in applications. It allows the backend to run Git commands such as clone, commit, and push without requiring a system-wide Git installation.

**Bun** is a fast JavaScript runtime and package manager. It replaces the typical Node.js + npm setup with a single executable that can run scripts and install dependencies, making it easy to bundle with the application.

### Setup for Dependencies

1. Download the latest **MinGit** release.

2. Extract it into `src-tauri/dependencies/resources/mingit/`.

3. Ensure the Git executable exists at:

   ```text
   src-tauri/dependencies/resources/mingit/cmd/git.exe
   ```

4. Download the **Bun** Windows release.

5. Place the Bun executable in:

   ```text
   src-tauri/dependencies/binaries/bun.exe
   ```

6. Verify that `src-tauri/tauri.conf.json` references these paths correctly, as the backend loads these binaries during runtime.

---

# Backend Responsibilities

The backend translates high-level user actions into controlled system operations.

Examples include:

| User Action      | Backend Operation                    |
| ---------------- | ------------------------------------ |
| Select workspace | Validate and store workspace path    |
| Edit content     | Read/write JSON files                |
| Replace image    | Archive old image and copy new image |
| Start preview    | Launch development server            |
| Publish website  | Stage, commit, and push Git changes  |

All operations are executed through backend commands to ensure that filesystem access and external processes are handled safely.

---

# Module Overview

## `modules/core`

Shared backend infrastructure used across the system.

Responsibilities include:

- configuration persistence
- backend-to-frontend event emission
- shared process execution utilities
- shared runtime state

These components provide the foundation used by the higher-level workflows.

---

## `modules/workspace`

Handles all interactions with the selected website directory.

Responsibilities include:

- selecting and validating workspace folders
- reading and writing project files
- safe image replacement

This module acts as the backend's controlled gateway to the filesystem.

---

## `modules/utils`

Contains reusable helper utilities used throughout the backend.

Examples include:

- filesystem safety checks
- Git helper functions
- translation of technical errors into user-friendly messages

---

## `modules/pages`

Implements the major backend workflows corresponding to editor features.

Current workflows include:

- **Setup** – storing credentials and cloning the repository
- **Preview** – running and stopping the development preview server
- **Publish** – committing and pushing changes to GitHub

---

# Submodule Summary

| Module                   | Purpose                              |
| ------------------------ | ------------------------------------ |
| `core/config.rs`         | Persistent application configuration |
| `core/events.rs`         | Backend log events sent to the UI    |
| `core/process.rs`        | Shared command execution utilities   |
| `core/state.rs`          | Shared runtime state                 |
| `workspace/workspace.rs` | Workspace management                 |
| `workspace/fs_text.rs`   | Safe text file operations            |
| `workspace/images.rs`    | Image replacement workflow           |
| `utils/errors.rs`        | User-friendly error translation      |
| `utils/git.rs`           | Git-related helper functions         |
| `utils/path_safety.rs`   | Filesystem safety checks             |
| `pages/setup.rs`         | Initial repository setup             |
| `pages/preview.rs`       | Local preview server control         |
| `pages/publish.rs`       | Publishing changes to GitHub         |

---

# Typical Backend Workflow

1. The application starts and loads stored configuration.
2. The workspace directory is restored or selected.
3. The frontend reads and writes content through backend commands.
4. The preview server is started to view the site locally.
5. The publish workflow commits and pushes the changes to GitHub.

