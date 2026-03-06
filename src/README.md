# Frontend (`src`)

## Overview

The `src` directory contains the **frontend** of the Highland Cattle Editor desktop application. The frontend is implemented using **React and TypeScript** and provides the graphical user interface used to edit the website content.

The frontend is responsible for:

- rendering the application interface
- providing editing interfaces for website content
- displaying workflow status and logs
- routing between application pages
- communicating with the backend via Tauri commands

All system-level operations such as filesystem access, preview server management, and Git operations are handled by the backend.

For details about backend functionality see the **Backend README (`src-tauri`)**.

---

# Directory Structure

```text
src/
│   App.css
│   App.tsx
│   main.tsx
│   types.ts
│   vite-env.d.ts
│
├── app/
├── assets/
│       highland_cow_emerald.svg
│       react.svg
│
├── components/
│   │   Layout.tsx
│   │   LogViewer.tsx
│   │   SetupPage.tsx
│   │
│   ├── dashboard/
│   │       DashboardCard.tsx
│   │       DashboardCardsGrid.tsx
│   │       DashboardHero.tsx
│   │       DashboardPage.tsx
│   │
│   ├── editor/
│   │   │   EditorHub.tsx
│   │   │   EditorPageShell.tsx
│   │   │   EditorRouter.tsx
│   │   │   pages.tsx
│   │   │
│   │   └── editors/
│   │       │   AboutusEditor.tsx
│   │       │   ContactEditor.tsx
│   │       │   HerdEditor.tsx
│   │       │   HighlandcattleEditor.tsx
│   │       │   HomepageEditor.tsx
│   │       │
│   │       └── schemas/
│   │               aboutUsSchemas.ts
│   │               contactSchemas.ts
│   │               herdSchemas.ts
│   │               heroSchemas.ts
│   │               highlandCattleSchemas.ts
│   │
│   ├── preview/
│   │       Preview.tsx
│   │
│   ├── publish/
│   │       Publish.tsx
│   │
│   ├── settings/
│   │       Settings.tsx
│   │
│   └── sidebar/
│           Sidebar.tsx
│
└── services/
        tauriService.ts
```

---

# Application Entry Points

## `main.tsx`

Initializes the React application and mounts the root component.

## `App.tsx`

Defines the global application structure and routes between major application views.

---

# Layout and Navigation

## `Layout.tsx`

Defines the overall layout of the application including:

- sidebar navigation
- main content area
- shared page structure

All major pages are rendered inside this layout.

## `Sidebar.tsx`

Implements the primary navigation of the application, providing access to:

- dashboard
- editors
- preview
- publish
- settings

---

# Shared UI Components

## `LogViewer.tsx`

Reusable component for displaying backend log output streamed through Tauri events. It is used in several workflow pages such as setup, preview, and publish.

## `SetupPage.tsx`

Provides the initial setup interface where users can configure the GitHub token and initialize the workspace.

---

# Dashboard

The dashboard provides an overview of the editor and serves as the main entry point to the application's functionality.

| Component | Purpose |
|-----------|--------|
| `DashboardPage.tsx` | Main dashboard screen |
| `DashboardHero.tsx` | Introductory header section |
| `DashboardCardsGrid.tsx` | Layout for navigation cards |
| `DashboardCard.tsx` | Individual navigation card |

---

# Editor System

The editor section contains interfaces used to modify the website content.

## Editor Infrastructure

| Component | Purpose |
|-----------|--------|
| `EditorHub.tsx` | Overview page listing available editors |
| `EditorRouter.tsx` | Routes between editor pages |
| `EditorPageShell.tsx` | Shared layout wrapper for editors |
| `pages.tsx` | Configuration of available editors |

## Content Editors

Each editor corresponds to a specific section of the website.

| Editor | Purpose |
|-------|--------|
| `HomepageEditor.tsx` | Homepage content editing |
| `AboutusEditor.tsx` | About page editing |
| `HerdEditor.tsx` | Herd information editing |
| `HighlandcattleEditor.tsx` | Highland cattle information editing |
| `ContactEditor.tsx` | Contact page editing |

## Editor Schemas

Schemas define the structure of editable content and ensure consistent data handling.

| Schema | Purpose |
|-------|--------|
| `heroSchemas.ts` | Homepage hero content structure |
| `aboutUsSchemas.ts` | About page data structure |
| `herdSchemas.ts` | Herd data structure |
| `highlandCattleSchemas.ts` | Breed information structure |
| `contactSchemas.ts` | Contact information structure |

---

# Workflow Pages

## Preview

`Preview.tsx` provides the interface for running a **local preview of the website**. The component interacts with the backend to start or stop the development server and displays backend logs.

## Publish

`Publish.tsx` manages the workflow for publishing website changes. It triggers backend operations that stage, commit, and push changes to the Git repository.

## Settings

`Settings.tsx` allows configuration of application settings such as the workspace path and GitHub token.

---

# Backend Communication

## `services/tauriService.ts`

This service provides the communication layer between the frontend and the backend. It wraps Tauri command calls used by the UI components.

Typical operations include:

- workspace management
- file operations
- preview control
- publishing

For details about the backend architecture and command implementation see the **Backend README located in `src-tauri`**.

---

# Typical Frontend Workflow

1. The application initializes and renders the main layout.
2. The user selects or restores a workspace.
3. Editors load content through backend commands.
4. Users modify website data using the editor interfaces.
5. The preview page launches the local development server.
6. The publish page pushes the changes to GitHub.

This workflow illustrates how the frontend orchestrates user interaction while delegating system operations to the backend.

