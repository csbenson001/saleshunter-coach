//! OS-backed provider credential storage.
//!
//! The webview only holds credentials for the current process. On macOS the
//! durable copy lives in the user's login Keychain through Security.framework;
//! no secret is serialized into the Tauri config directory or localStorage.

use std::collections::HashMap;

const SERVICE: &str = "com.saleshunter.coach.provider-credentials";
const SECRET_KEYS: &[&str] = &[
    "anthropicApiKey",
    "openaiApiKey",
    "geminiApiKey",
    "groqApiKey",
    "qwenApiKey",
    "kimiApiKey",
    "ollamaApiKey",
    "openrouterApiKey",
    "coachApiKey",
    "sonioxApiKey",
    "deepgramApiKey",
    "assemblyaiApiKey",
];

fn is_secret_key(key: &str) -> bool {
    SECRET_KEYS.contains(&key)
}

#[cfg(target_os = "macos")]
fn keychain_entry(key: &str) -> Result<keyring::Entry, String> {
    keyring::Entry::new(SERVICE, key).map_err(|e| format!("keychain entry: {e}"))
}

/// Read all provider credentials from the OS store. Missing entries are normal
/// for a first launch and are omitted from the returned patch.
#[tauri::command]
pub fn get_secure_settings() -> Result<HashMap<String, String>, String> {
    #[cfg(not(target_os = "macos"))]
    return Err("secure provider storage is only implemented for macOS".into());

    #[cfg(target_os = "macos")]
    {
        let mut values = HashMap::new();
        for key in SECRET_KEYS {
            let entry = keychain_entry(key)?;
            match entry.get_password() {
                Ok(value) => {
                    values.insert((*key).to_string(), value);
                }
                Err(error) if error.to_string().to_lowercase().contains("not found") => {}
                Err(error) if error.to_string().to_lowercase().contains("no entry") => {}
                Err(error) => return Err(format!("read keychain credential {key}: {error}")),
            }
        }
        Ok(values)
    }
}

/// Store or remove one provider credential in the OS store.
#[tauri::command]
pub fn set_secure_setting(key: String, value: String) -> Result<(), String> {
    if !is_secret_key(&key) {
        return Err("unknown secure setting".into());
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = value;
        return Err("secure provider storage is only implemented for macOS".into());
    }

    #[cfg(target_os = "macos")]
    {
        let entry = keychain_entry(&key)?;
        if value.is_empty() {
            match entry.delete_credential() {
                Ok(()) => Ok(()),
                Err(error)
                    if error.to_string().to_lowercase().contains("not found")
                        || error.to_string().to_lowercase().contains("no entry") =>
                {
                    Ok(())
                }
                Err(error) => Err(format!("delete keychain credential {key}: {error}")),
            }
        } else {
            entry
                .set_password(&value)
                .map_err(|e| format!("write keychain credential {key}: {e}"))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::is_secret_key;

    #[test]
    fn only_known_provider_credentials_are_accepted() {
        assert!(is_secret_key("openaiApiKey"));
        assert!(is_secret_key("sonioxApiKey"));
        assert!(!is_secret_key("userName"));
        assert!(!is_secret_key("transcript"));
    }
}
