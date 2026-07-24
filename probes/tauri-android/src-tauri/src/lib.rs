use serde::Serialize;
use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct HostInfo {
    app_version: String,
    app_local_data_dir: String,
    os: &'static str,
    architecture: &'static str,
}

#[tauri::command]
fn host_info(app: tauri::AppHandle) -> Result<HostInfo, String> {
    let app_local_data_dir = app
        .path()
        .app_local_data_dir()
        .map_err(|error| error.to_string())?;

    Ok(HostInfo {
        app_version: app.package_info().version.to_string(),
        app_local_data_dir: app_local_data_dir.display().to_string(),
        os: std::env::consts::OS,
        architecture: std::env::consts::ARCH,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![Migration {
        version: 1,
        description: "create_probe_records",
        sql: "CREATE TABLE IF NOT EXISTS probe_records (\
              id TEXT PRIMARY KEY NOT NULL,\
              revision INTEGER NOT NULL,\
              payload TEXT NOT NULL,\
              updated_at TEXT NOT NULL\
              );",
        kind: MigrationKind::Up,
    }];

    tauri::Builder::default()
        .setup(|app| {
            let salt_path = app
                .path()
                .app_local_data_dir()
                .expect("could not resolve app local data path")
                .join("stronghold-salt.txt");
            app.handle().plugin(
                tauri_plugin_stronghold::Builder::with_argon2(&salt_path).build(),
            )?;
            Ok(())
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:probe.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![host_info])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
