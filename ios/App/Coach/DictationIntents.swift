import AppIntents

/// Start Coach dictation from the Action Button, Control Center, or Back Tap —
/// without leaving the app you're in.
///
/// This is the friction-free trigger the keyboard round trip can't be: an
/// `AudioRecordingIntent` runs in the app's process in the background and is
/// granted a recording assertion, so the mic opens without Coach ever coming
/// to the foreground. Whatever Coach keyboard is frontmost then inserts the
/// text exactly as it does for the keyboard-button flow. Requires iOS 18, where
/// `AudioRecordingIntent` was introduced.
@available(iOS 18.0, *)
struct StartDictationIntent: AppIntent, AudioRecordingIntent {
    static var title: LocalizedStringResource = "Start Voice Typing"
    static var description = IntentDescription(
        "Start Coach voice typing right where you are, without switching apps.")

    /// The whole point: do not bring the app forward.
    static var openAppWhenRun = false

    @MainActor
    func perform() async throws -> some IntentResult {
        await DictationCoordinator.shared.beginFromIntent()
        return .result()
    }
}

/// Surfaces the intent for the Action Button and Shortcuts.
@available(iOS 18.0, *)
struct CoachShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: StartDictationIntent(),
            phrases: [
                "Voice type with \(.applicationName)",
                "\(.applicationName) voice typing",
            ],
            shortTitle: "Voice Typing",
            systemImageName: "mic.fill")
    }
}
