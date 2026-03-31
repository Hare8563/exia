// src-tauri/src/asset_commands.rs

use std::path::PathBuf;
use tauri::Manager;

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct ExtractedAssetEntry {
    pub id: String,             // filename with extension: "bg_school.webp"
    pub extracted_path: String, // relative path from app_data_dir: "assets/pack_001/images/bgimage/bg_school.webp"
}

// Returns the absolute app_data_dir path as a string
#[tauri::command]
pub fn asset_app_data_dir(app: tauri::AppHandle) -> Result<String, String> {
    app.path().app_data_dir()
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| e.to_string())
}

// Reads manifest.json and returns its content as a string. Returns null if not found.
#[tauri::command]
pub fn asset_read_manifest(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let path = manifest_path(&app)?;
    if !path.exists() { return Ok(None); }
    std::fs::read_to_string(&path).map(Some).map_err(|e| e.to_string())
}

// Writes content to manifest.json
#[tauri::command]
pub fn asset_write_manifest(app: tauri::AppHandle, content: String) -> Result<(), String> {
    let path = manifest_path(&app)?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(&path, content).map_err(|e| e.to_string())
}

// Download XP3 pack → verify MD5 → extract → write to AppData → return extracted file list
// NOTE: Synchronous command (no `async`). Uses reqwest::blocking safely on thread pool.
#[tauri::command]
pub fn asset_download_and_extract(
    app: tauri::AppHandle,
    url: String,
    pack_id: String,
    expected_md5: String,
) -> Result<Vec<ExtractedAssetEntry>, String> {
    // 1. Download
    let bytes = reqwest::blocking::get(&url)
        .map_err(|e| format!("download failed: {e}"))?
        .bytes()
        .map_err(|e| format!("read body failed: {e}"))?;

    // 2. MD5 verification
    let digest = md5::compute(&bytes);
    let actual_md5 = format!("{:x}", digest);
    if actual_md5 != expected_md5.to_lowercase() {
        return Err(format!("MD5 mismatch: expected {expected_md5}, got {actual_md5}"));
    }

    // 3. XP3 extraction
    let xp3_entries = crate::xp3::extract_xp3(&bytes)?;

    // 4. Write to AppData/assets/{pack_id}/
    let base_dir = app.path().app_data_dir()
        .map_err(|e| e.to_string())?
        .join("assets")
        .join(&pack_id);
    std::fs::create_dir_all(&base_dir).map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for entry in &xp3_entries {
        let dest = base_dir.join(&entry.name);
        if let Some(parent) = dest.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        std::fs::write(&dest, &entry.data).map_err(|e| e.to_string())?;

        // ID = filename with extension (matches KAG storage= parameter)
        let id = std::path::Path::new(&entry.name)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or(&entry.name)
            .to_string();

        result.push(ExtractedAssetEntry {
            id,
            extracted_path: format!("assets/{}/{}", pack_id, entry.name),
        });
    }

    Ok(result)
}

fn manifest_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path().app_data_dir()
        .map(|d| d.join("manifest.json"))
        .map_err(|e| e.to_string())
}
