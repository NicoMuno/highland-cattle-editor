mod modules;

use modules::{core, pages, workspace};
use tauri::{RunEvent, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .manage(core::state::WorkspaceState::default())
        .manage(core::state::DevServerState::default())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            
            workspace::workspace::get_default_workspace_folder,
            workspace::workspace::load_workspace_from_config,
            workspace::workspace::get_workspace_folder,
            workspace::workspace::set_workspace_folder,
            workspace::workspace::use_default_workspace_folder,
            workspace::workspace::clear_workspace_folder,
            workspace::workspace::open_legacy_images_folder,

            // file io
            workspace::fs_text::file_exists_in_website,
            workspace::fs_text::read_text_in_website,
            workspace::fs_text::write_text_in_website,

            // images
            workspace::images::replace_image_in_public,
            workspace::images::archive_image_in_public,
            workspace::images::read_image_data_url_in_website,

            // preview
            pages::preview::start_preview_dev_server,
            pages::preview::stop_preview_dev_server,
            pages::preview::reset_preview_changes,

            // setup + token
            pages::setup::get_github_token,
            pages::setup::set_github_token,
            pages::setup::clear_github_token,
            pages::setup::clone_dev_repo,

            // publish
            pages::publish::run_publish,
        ]);

    let app = builder.build(tauri::generate_context!())
        .expect("Fehler beim Erstellen der Tauri-Anwendung");

    app.run(|app_handle, event| {
        if let RunEvent::ExitRequested { .. } = event {
            let dev_state = app_handle.state::<core::state::DevServerState>();
            if let Ok(mut child_guard) = dev_state.child.lock() {
                if let Some(child) = child_guard.take() {
                    let _ = child.kill(); 
                }
            };
        }
    });
}