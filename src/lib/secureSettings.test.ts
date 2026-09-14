import { describe, expect, it } from "vitest";
import { mergeSecureSettings, splitSecureSettings } from "./secureSettings";
import type { Settings } from "./types";

describe("secure settings boundary", () => {
  it("splits provider credentials from settings safe for browser persistence", () => {
    const settings = {
      language: "en",
      userName: "Chris",
      openaiApiKey: "openai-secret",
      sonioxApiKey: "soniox-secret",
    } as unknown as Settings;

    const { safeSettings, secrets } = splitSecureSettings(settings);

    expect(safeSettings).toMatchObject({ language: "en", userName: "Chris" });
    expect(safeSettings).not.toHaveProperty("openaiApiKey");
    expect(safeSettings).not.toHaveProperty("sonioxApiKey");
    expect(secrets).toEqual({ openaiApiKey: "openai-secret", sonioxApiKey: "soniox-secret" });
  });

  it("merges OS-loaded credentials without allowing a partial persisted payload to erase them", () => {
    const current = { language: "en", openaiApiKey: "openai-secret" } as Settings;
    const incoming = { language: "de" } as unknown as Settings;

    expect(mergeSecureSettings(incoming, current)).toMatchObject({
      language: "de",
      openaiApiKey: "openai-secret",
    });
  });
});
