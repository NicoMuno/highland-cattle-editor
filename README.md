# Highland Cattle Editor

## Overview

The **Highland Cattle Editor** is a **Windows** (only) desktop application designed to help non-technical users edit and publish a static farm website through a guided graphical interface.

The project combines a **React + TypeScript frontend** with a **Tauri v2 backend** to provide a desktop editing experience that can safely modify website content, preview changes locally, and publish updates through Git.

Its primary purpose is to remove the need for direct interaction with source code, JSON files, Git commands, or terminal workflows. Instead, users can manage the website through dedicated editor pages and guided workflows such as setup, preview, and publish.

A core design goal of the project is to keep the editing workflow simple while preserving the advantages of a structured static website project. Website content remains stored in **plain JSON files**, making the site maintainable, transparent, and easy to extend for developers.

---

## Disclaimer

This editor was originally developed around a **specific static website project** whose content is stored in structured **JSON files**. The editor interfaces, schemas, and workflows are therefore currently tailored to the structure of that website.

The application is designed so that non‑technical users can safely edit the site's content without interacting with source code, JSON files, or Git directly.

A potential future goal of the project is to **generalize the editor so it can adapt to a wider range of static websites**. This would involve making the content schemas, editor pages, and configuration more flexible so the application could support multiple site structures instead of a single predefined one.

---

## Purpose of the Project

This project was created to provide a practical editing solution for a static website maintained by users without a technical background.

Instead of introducing a CMS, backend server, or database, the editor works directly on the existing website source repository. This keeps the website architecture lightweight while still enabling a user-friendly editing experience.

The application is intended to:

- simplify website content maintenance
- provide a desktop-based editing workflow
- allow local preview before publishing
- support controlled publishing to GitHub
- keep the underlying website data easy to understand and extend

---

## Recommended Setup

The recommended development setup consists of the following repositories:

1. **`highland-cattle-editor`**  
   The desktop editor application.

2. [**`highland-cattle-dev`**](https://github.com/NicoMuno/highland-cattle-dev)  
   The editable website source repository containing React components, assets, and JSON content.

3. [**`highland-cattle`**](https://github.com/NicoMuno/highland-cattle)  
   The static deployment repository used for publishing the live website.

For local development, the editor application should be placed alongside the website repositories so the full workflow can be tested conveniently.

Example structure:

```text
workspace/
├── highland-cattle-editor/
├── highland-cattle-dev/
└── highland-cattle/
```

---

## Tools and Technologies

The project uses the following main tools and technologies.

### Desktop Application

- **Tauri v2**: desktop application framework
- **Rust**: backend implementation
- **React**: frontend user interface
- **TypeScript**: typed frontend development
- **Vite**: frontend build tooling

### Bundled Dependencies

The editor bundles key tools so the application behaves more like a self-contained desktop app.

- **MinGit**: portable Git distribution used for clone, commit, and push operations
- **Bun**: JavaScript runtime and package manager used for preview and dependency installation

### Website Content Model

The website content edited by the application is stored in **simple structured JSON files** inside the website source repository. This keeps the content layer readable and easy to maintain while allowing the editor UI to work with predictable data structures.

For more detailed documentation see:

- **Frontend README:** `src/README` or frontend documentation section
- **Backend README:** `src-tauri/README` or backend documentation section

## Other Repositories in the Project

This project is part of a larger workflow involving multiple repositories.

### `highland-cattle-editor`
The desktop application used to edit and publish website content.

### [`highland-cattle-dev`](https://github.com/NicoMuno/highland-cattle-dev)
The editable website source repository. The editor works directly on this repository by modifying content files and assets. Uses a [github action runner](https://github.com/NicoMuno/highland-cattle-dev/blob/main/.github/workflows/build-and-deploy.yml) to build and push changes directly to the `highland-cattle` repo which hosts the website.

### [`highland-cattle`](https://github.com/NicoMuno/highland-cattle)
The deployment repository used to host the final static website, for example through GitHub Pages.

This separation keeps editing, development, and hosting concerns clearly separated.

## How the Website Data Is Stored

The editor does not use a database. Instead, website content is stored in **plain JSON files** inside the website source project.

This means:

- content stays version-controlled
- developers can inspect and extend it easily
- the editor can map forms directly to structured content
- the website remains a lightweight static project

Images are stored in the website's `public/images/...` directories, while text and structured page data are stored in JSON files under `src/data/...`.


## How to Run the Demo

To try the application locally, open the editor repository and start the development version of the desktop app.

Typical workflow:

1. install frontend dependencies
2. ensure the backend [sidecar dependencies are present](src-tauri\README.md#dependencies-embedded-sidecars)
3. start the Tauri development app


```bash
npm install
npm run tauri dev
```

The exact dependency setup for the backend sidecars is described in the backend README.

## How to Build the Application

To create a production build of the desktop application, run the Tauri build command from the editor repository.

Example:

```bash
npm run tauri build
```

## How to Explore, Test, and Extend the Project

This project is structured so that contributors can test the app and build on top of it from both the frontend and backend side.

### Test the Application

A contributor can test the project by setting up the three related repositories and running the editor locally.

1. **Fork the three repositories**

   - [`highland-cattle-editor`](https://github.com/NicoMuno/highland-cattle-editor)
   - [`highland-cattle-dev`](https://github.com/NicoMuno/highland-cattle-dev)
   - [`highland-cattle`](https://github.com/NicoMuno/highland-cattle)

2. **Host the website repository**

   Configure the `highland-cattle` repository to be hosted via **GitHub Pages**.

3. **Create GitHub access tokens**

   Generate two [Fine‑grained Personal Access Tokens](https://github.com/settings/personal-access-tokens):

   - one for `highland-cattle-dev`
   - one for `highland-cattle`

   Both tokens must have **content read and write permissions**.

4. **Configure deployment secrets**

   In the repository:

   ```text
   highland-cattle-dev/settings/secrets/actions
   ```

   create the following secrets:

   **DEPLOY_TOKEN**

   Paste the token created for `highland-cattle`.

   **DEPLOY_REPO**

   ```text
   USER/highland-cattle
   ```

   Replace `USER` with your GitHub username.

5. **Save the development token**

   Keep the token created for `highland-cattle-dev`. This token will later be entered in the editor application to allow publishing changes.

6. **Prepare backend dependencies**

   Follow the instructions described in the backend documentation:

   → `src-tauri/README.md#dependencies-embedded-sidecars`

7. **Start the desktop application**

   From the `highland-cattle-editor` repository run:

   ```bash
   npm run tauri dev
   ```

8. **Initialize the workspace inside the application**

   Within the editor you can now:

   - clone or select the `highland-cattle-dev` repository
   - edit website content
   - start the preview server
   - test the publish workflow

### Extend the Frontend

To work on the user interface, editor pages, or layout components, start with the frontend documentation.

Recommended entry point:
- **Frontend README** – explains the `src/` structure and implemented UI components

### Extend the Backend

To work on workspace handling, preview, publish, or setup logic, start with the backend documentation.

Recommended entry point:
- **Backend README** – explains the `src-tauri/` structure, sidecars, backend modules, and workflows

This separation makes it easier to contribute to one layer of the application without first needing to understand the full system in detail.

## Documentation Structure

This repository is documented in layers.

- **Root README**: overall project overview, setup, build, and usage
- **Frontend README**: frontend structure and implemented UI components
- **Backend README**: backend structure, dependencies, and workflows

This layered documentation approach keeps the root README focused while still providing detailed technical references where needed.


## Suggested Demo Walkthrough

This section can later include screenshots that show the core user flow of the application.

Recommended sequence:

1. **Setup Page**  
   Show how the user configures the GitHub token and prepares the workspace.

2. **Dashboard**  
   Show the main landing page and navigation options.

3. **Editor Hub**  
   Show the available editor pages.

4. **Example Editor Page**  
   Show a page where website content is edited.

5. **Preview Page**  
   Show local preview startup and preview state.

6. **Publish Page**  
   Show the publish workflow and logs.

### Placeholder for Demo Images

### Setup Page

![Setup Page](public\img\Setup.png)


### Dashbaord
![Dashboard](public\img\Dashboard.png)

### Editor Page
![Editor Page](public\img\Farmeditor.png)

### Preview
![Preview](public\img\Preview.png)

### Publish
![Publish](public\img\Publish.png)

### Settings

![Settings](public\img\Settings.png)

---

## Summary

The Highland Cattle Editor is a desktop application that makes it possible to manage a static website through a guided graphical workflow. It combines a React frontend with a Tauri backend and works directly on a website project whose content is stored in simple JSON files.

The project is designed to be approachable for non-technical users while still remaining transparent, structured, and extensible for developers who want to test, customize, or extend the system.

