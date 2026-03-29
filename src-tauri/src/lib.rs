mod kag_parser;

use std::fs;

#[tauri::command]
fn save_scenario(content: String) -> Result<(), String> {
    let scenario: serde_json::Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    let id = scenario["id"].as_str().ok_or("Missing ID")?;
    
    // 開発時のパス設定。実際には実行ファイルの場所によって調整が必要な場合があります。
    let path = format!("../src/scenarios/{}.json", id);
    
    fs::write(path, content).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn parse_kag_text(content: String) -> Result<Vec<kag_parser::KagToken>, String> {
    kag_parser::parse_kag_text(&content)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .invoke_handler(tauri::generate_handler![save_scenario, parse_kag_text])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
