// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "CoachKit",
    // The package renders user-facing text of its own — the speaker labels on
    // the transcript screens — so it carries its own string catalog. A package
    // without a defaultLocalization has no localization context at all and
    // `String(localized:bundle: .module)` would hand every key straight back.
    defaultLocalization: "en",
    platforms: [
        .iOS(.v17),
        // macOS included so the core (segment building, relay protocol) can be
        // unit-tested on CI and dev machines without an iOS simulator runtime.
        .macOS(.v14),
    ],
    products: [
        .library(name: "CoachKit", targets: ["CoachKit"])
    ],
    targets: [
        .target(name: "CoachKit", resources: [.process("Resources")]),
        .testTarget(name: "CoachKitTests", dependencies: ["CoachKit"]),
    ]
)
