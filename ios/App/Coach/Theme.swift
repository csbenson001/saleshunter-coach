import SwiftUI
import UIKit

/// Coach's semantic SwiftUI surface. The primitive values live in
/// `CoachDesignTokens.swift`, mirrored from the Pathors landing site's
/// `--v2-*` properties; this adapter is intentionally the only place product
/// views turn them into adaptive colors. Typography is `Font.coach`
/// (`CoachTypography.swift`).
enum Theme {
    static let background = adaptive(CoachDesignTokens.Light.background, CoachDesignTokens.Dark.background)
    static let foreground = adaptive(CoachDesignTokens.Light.foreground, CoachDesignTokens.Dark.foreground)
    static let card = adaptive(CoachDesignTokens.Light.card, CoachDesignTokens.Dark.card)
    static let muted = adaptive(CoachDesignTokens.Light.muted, CoachDesignTokens.Dark.muted)
    static let mutedForeground = adaptive(CoachDesignTokens.Light.mutedForeground, CoachDesignTokens.Dark.mutedForeground)
    static let primary = adaptive(CoachDesignTokens.Light.primary, CoachDesignTokens.Dark.primary)
    static let primaryForeground = adaptive(CoachDesignTokens.Light.primaryForeground, CoachDesignTokens.Dark.primaryForeground)
    static let border = adaptive(CoachDesignTokens.Light.border, CoachDesignTokens.Dark.border, darkAlpha: 0.10)
    static let destructive = adaptive(CoachDesignTokens.Light.destructive, CoachDesignTokens.Dark.destructive)
    static let recording = Color(UIColor(hex: CoachDesignTokens.recording))
    static let study = adaptive(CoachDesignTokens.Light.study, CoachDesignTokens.Dark.study)
    static let org = adaptive(CoachDesignTokens.Light.org, CoachDesignTokens.Dark.org)
    static let warning = adaptive(CoachDesignTokens.Light.warning, CoachDesignTokens.Dark.warning)
    static let success = adaptive(CoachDesignTokens.Light.success, CoachDesignTokens.Dark.success)
    static let radius = CoachDesignTokens.radius

    /// The pale blue section fill the landing site uses behind grouped
    /// content. Reach for this instead of `muted` when the intent is "this is a
    /// section", not "this text is secondary".
    static let tintedSurface = adaptive(
        CoachDesignTokens.Light.tintedSurface, CoachDesignTokens.Dark.tintedSurface)

    // The mark's colours. Fixed rather than appearance-adaptive: these are the
    // logo's blues and they are the same blues in dark mode.
    static let brand = Color(UIColor(hex: CoachDesignTokens.brand))
    static let sky = Color(UIColor(hex: CoachDesignTokens.sky))

    /// brand → sky, the gradient the landing site puts on headlines, stat
    /// numbers and primary CTAs.
    static let brandGradient = LinearGradient(
        colors: [brand, sky], startPoint: .topLeading, endPoint: .bottomTrailing)

    /// What to draw *on* `brandGradient`. Fixed, like the gradient.
    static let onBrand = Color(UIColor(hex: CoachDesignTokens.onBrand))

    /// Per-speaker colours for a diarized transcript, in hand-out order. Index
    /// with `(speaker - 1) % count`; speaker 0 means the provider hasn't
    /// decided yet and belongs in `mutedForeground`, not here.
    static let speakers: [Color] = zip(
        CoachDesignTokens.Speaker.light, CoachDesignTokens.Speaker.dark
    ).map { adaptive($0, $1) }

    private static func adaptive(_ light: UInt32, _ dark: UInt32, darkAlpha: CGFloat = 1) -> Color {
        Color(
            UIColor { traits in
                UIColor(hex: traits.userInterfaceStyle == .dark ? dark : light)
                    .withAlphaComponent(traits.userInterfaceStyle == .dark ? darkAlpha : 1)
            })
    }
}

extension UIColor {
    convenience init(hex: UInt32) {
        self.init(
            red: CGFloat((hex >> 16) & 0xFF) / 255,
            green: CGFloat((hex >> 8) & 0xFF) / 255,
            blue: CGFloat(hex & 0xFF) / 255,
            alpha: 1)
    }
}

/// The desktop's `AppTheme` setting: "system" | "light" | "dark" (types.ts).
enum AppTheme: String, CaseIterable, Identifiable {
    case system, light, dark
    var id: String { rawValue }

    var colorScheme: ColorScheme? {
        switch self {
        case .system: return nil
        case .light: return .light
        case .dark: return .dark
        }
    }

    var label: String {
        switch self {
        case .system: return String(localized: "System")
        case .light: return String(localized: "Light")
        case .dark: return String(localized: "Dark")
        }
    }
}
