mod backend;
mod bench;
mod commands;
mod domain;
mod nexis;
mod onnx;
mod scan;
mod simulate;
mod state;

use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            commands::list_backends,
            commands::scan_models,
            commands::run_benchmark,
            commands::cancel_benchmark,
            commands::write_text_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
