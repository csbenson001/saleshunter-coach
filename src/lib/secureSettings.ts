import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "./tauriEvents";
import { SECRET_SETTING_KEYS, useStore } from "./store";
import type { Settings } from "./types";

type SecretSettingKey = (typeof SECRET_SETTING_KEYS)[number];
export type SecureSettings = Partial<Pick<Settings, SecretSettingKey>>;

export function splitSecureSettings(settings: Settings): {
  safeSettings: Omit<Settings, SecretSettingKey>;
  secrets: SecureSettings;
} {
  const safeSettings = { ...settings } as Partial<Settings>;
  const secrets: SecureSettings = {};
  for (const key of SECRET_SETTING_KEYS) {
    secrets[key] = settings[key];
    delete safeSettings[key];
  }
  return { safeSettings: safeSettings as Omit<Settings, SecretSettingKey>, secrets };
}

/** Preserve in-memory credentials when a browser-persisted settings snapshot is partial. */
export function mergeSecureSettings(incoming: Settings, current: Settings): Settings {
  const merged = { ...current, ...incoming };
  for (const key of SECRET_SETTING_KEYS) {
    if (!(key in incoming)) merged[key] = current[key];
  }
  return merged;
}

export async function loadSecureSettings(): Promise<SecureSettings> {
  if (!isTauri()) return {};
  return invoke<SecureSettings>("get_secure_settings");
}

export async function persistSecureSettings(settings: Settings): Promise<void> {
  if (!isTauri()) return;
  const { secrets } = splitSecureSettings(settings);
  await Promise.all(
    SECRET_SETTING_KEYS.map((key) =>
      invoke("set_secure_setting", { key, value: secrets[key] ?? "" }),
    ),
  );
}

/** Hydrate every webview from the OS store; no secret is read from localStorage. */
export async function initSecureSettingsSync(): Promise<() => void> {
  const unsubscribe = useStore.subscribe((state, prior) => {
    for (const key of SECRET_SETTING_KEYS) {
      if (state.settings[key] !== prior.settings[key]) {
        void persistSecureSettings(state.settings).catch((error) =>
          console.warn("secure settings: keychain update failed", error),
        );
        break;
      }
    }
  });
  if (isTauri()) {
    try {
      const secrets = await loadSecureSettings();
      useStore.setState((state) => ({
        settings: mergeSecureSettings({ ...state.settings, ...secrets }, state.settings),
      }));
    } catch (error) {
      console.warn("secure settings: keychain hydration failed", error);
    }
  }
  return unsubscribe;
}
