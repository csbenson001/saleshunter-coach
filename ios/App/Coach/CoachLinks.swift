import Foundation

/// Every public web link the app shows, in one place.
///
/// These were previously scattered literals pointing at the upstream project's
/// site (`parley.tw`), which meant the app presented **someone else's privacy
/// policy** as the document governing our users' recordings — an App Store
/// submission blocker as well as a misrepresentation.
///
/// To move the site, change `site` and nothing else.
///
/// - Important: The pages these point at must actually be published before
///   submission. The repo carries them under `website/` (`privacy/`,
///   `support/`, `account-deletion/`); deploying that directory at `site`
///   satisfies every path below. App Review rejects an app whose Privacy Policy
///   URL 404s, and Apple requires the account-deletion route to be reachable
///   for any app with account creation.
enum CoachLinks {
    /// Public marketing + legal site, without a trailing slash.
    /// Single source of truth for the host.
    private static let origin = "https://saleshunterlive.com"

    /// Built from strings so the trailing slash is exact: the published pages
    /// are directory-style (`/privacy/index.html`), and `URL.appending(path:)`
    /// does not preserve a trailing slash.
    private static func page(_ path: String) -> URL {
        guard let url = URL(string: "\(origin)/\(path)") else {
            preconditionFailure("CoachLinks: malformed URL for \(path)")
        }
        return url
    }

    static let site = page("")
    static let privacy = page("privacy/")
    static let support = page("support/")
    static let accountDeletion = page("account-deletion/")
}
