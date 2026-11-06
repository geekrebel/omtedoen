use tauri::menu::{Menu, MenuItem, MenuItemKind, PredefinedMenuItem};
use tauri::{Emitter, Manager};

/// Standard macOS app menu plus "Settings…" (⌘,) under About, like native Mac apps.
/// Picking it brings the main window forward and tells it to open the Settings view.
fn build_app_menu(app: &tauri::AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
    let menu = Menu::default(app)?;
    let settings = MenuItem::with_id(app, "settings", "Settings…", true, Some("CmdOrCtrl+,"))?;
    // On macOS the first submenu is the app ("OmTeDoen") menu: About, separator, Services…
    if let Some(MenuItemKind::Submenu(app_menu)) = menu.items()?.into_iter().next() {
        app_menu.insert(&settings, 2)?;
        app_menu.insert(&PredefinedMenuItem::separator(app)?, 3)?;
    }
    Ok(menu)
}

fn open_settings(app: &tauri::AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.show();
        let _ = win.unminimize();
        let _ = win.set_focus();
    }
    let _ = app.emit_to("main", "open-settings", ());
}

/// Watch the global cursor and tell the panel window when the pointer is over
/// it. macOS does not deliver mouseMoved events to unfocused windows, so the
/// panel webview cannot see hover on its own while another app is active.
fn spawn_panel_hover_watcher(handle: tauri::AppHandle) {
    std::thread::spawn(move || {
        let mut inside = false;
        loop {
            std::thread::sleep(std::time::Duration::from_millis(80));
            let Some(win) = handle.get_webview_window("panel") else {
                continue;
            };
            let (Ok(pos), Ok(size), Ok(cursor)) = (
                win.outer_position(),
                win.outer_size(),
                handle.cursor_position(),
            ) else {
                continue;
            };
            let within = cursor.x >= pos.x as f64
                && cursor.x <= (pos.x + size.width as i32) as f64
                && cursor.y >= pos.y as f64
                && cursor.y <= (pos.y + size.height as i32) as f64;
            if within != inside {
                inside = within;
                let event = if within {
                    "panel-hover-enter"
                } else {
                    "panel-hover-leave"
                };
                let _ = handle.emit_to("panel", event, ());
            }
        }
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            spawn_panel_hover_watcher(app.handle().clone());
            app.set_menu(build_app_menu(app.handle())?)?;
            Ok(())
        })
        .on_menu_event(|app, event| {
            if event.id() == "settings" {
                open_settings(app);
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
