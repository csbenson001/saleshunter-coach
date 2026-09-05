/** Languages offered for transcription.
 *
 *  Deliberately short: these are the ones the STT vendors all support well.
 *  "auto" is last because it degrades transcripts on monolingual calls (see
 *  `Settings.transcriptionLanguage`).
 */
export const TRANSCRIPTION_LANGUAGES: { id: string; label: string }[] = [
  { id: "en", label: "English" },
  { id: "es", label: "Spanish" },
  { id: "fr", label: "French" },
  { id: "de", label: "German" },
  { id: "pt", label: "Portuguese" },
  { id: "it", label: "Italian" },
  { id: "nl", label: "Dutch" },
  { id: "ja", label: "Japanese" },
  { id: "zh", label: "Chinese" },
  { id: "auto", label: "Detect automatically" },
];
