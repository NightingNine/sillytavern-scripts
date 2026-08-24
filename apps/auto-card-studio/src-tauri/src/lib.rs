use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_studio_workspace",
            sql: "CREATE TABLE IF NOT EXISTS studio_workspace (\
                  id TEXT PRIMARY KEY NOT NULL,\
                  schema_version INTEGER NOT NULL,\
                  revision INTEGER NOT NULL,\
                  snapshot TEXT NOT NULL,\
                  updated_at TEXT NOT NULL\
                  );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create_model_settings",
            sql: "CREATE TABLE IF NOT EXISTS app_model_settings (\
                  id TEXT PRIMARY KEY NOT NULL,\
                  mode TEXT NOT NULL,\
                  base_url TEXT NOT NULL,\
                  model TEXT NOT NULL,\
                  timeout_ms INTEGER NOT NULL,\
                  updated_at TEXT NOT NULL\
                  );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "create_last_good_workspace_backup",
            sql: "CREATE TABLE IF NOT EXISTS studio_workspace_backup (\
                  id TEXT PRIMARY KEY NOT NULL,\
                  schema_version INTEGER NOT NULL,\
                  revision INTEGER NOT NULL,\
                  snapshot TEXT NOT NULL,\
                  updated_at TEXT NOT NULL\
                  );",
            kind: MigrationKind::Up,
        },
    ];

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
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:auto-card-studio.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .run(tauri::generate_context!())
        .expect("error while running A.U.T.O Card Studio");
}
