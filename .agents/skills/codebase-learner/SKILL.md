---
name: codebase-learner
description: Systematically analyze an unfamiliar repository and produce evidence-backed architecture, developer, and data-flow documentation. Use for project onboarding, technical due diligence, or planning work on a codebase whose structure is not yet known.
metadata:
  short-description: Map a repository into durable architecture docs
---

# Codebase Learner

Produce a reliable map of an unfamiliar codebase without making speculative product changes. The discovery pass is read-only for application source, tests, configuration, and generated artifacts. The only normal writes are the requested documentation artifacts under `docs/` and this skill when it is being created or updated.

## Phase 1 — Environment and entry points

- Locate manifests and setup files (`package.json`, lockfiles, `Cargo.toml`, Gradle/Swift package manifests, Docker/Make files, CI workflows).
- Map executable entry points and major package boundaries.
- Separate runtime dependencies from development/test tooling.
- Record observed commands, platform prerequisites, and version constraints.

## Phase 2 — Data flow and architecture

- Identify schemas, domain types, persistence stores, and serialization boundaries.
- Trace one important flow end to end: input/capture → transport → application state → business/AI processing → persisted output → UI or API consumer.
- Identify ownership of side effects, caching, retries, authorization, and error handling.
- Distinguish facts verified in source from hypotheses or missing components.

## Phase 3 — Tests and code standards

- Locate test runners, test suites, fixtures, and platform-specific test commands.
- Run the smallest relevant read-only checks when dependencies/toolchains are available.
- Record the exact result, including environmental blockers; never hide a failing or unavailable check.
- Identify recurring design patterns and shared modules so future work extends existing seams instead of duplicating them.

## Phase 4 — Infrastructure and delivery

- Review release workflows, deployment configuration, signing/secrets references, and platform packaging.
- Identify which services or repositories are external to the checkout and document their contracts without pretending their implementation is present.
- Note operational risks: permissions, platform restrictions, network dependencies, data residency, and upgrade/toolchain requirements.

## Phase 5 — Synthesize durable documentation

Create or update these files when the repository does not already provide an equivalent:

- `docs/SYSTEM_CONTEXT.md` — product scope, repository map, runtime architecture, entry points, and verified constraints.
- `docs/DEVELOPER_GUIDE.md` — setup, commands, tests, platform workflows, conventions, and troubleshooting.
- `docs/DATA_FLOW.md` — Mermaid diagrams and the important entities, event/API boundaries, persistence paths, and lifecycle flows.

Use Mermaid for architecture and sequence diagrams. Cite source paths and line numbers where useful. Keep recommendations clearly labeled as recommendations, separate from observed behavior. Do not modify production code, tests, lockfiles, generated bundles, or CI configuration as part of this protocol.

## Completion checklist

- The three documents agree on names and ownership of components.
- Every major claim has a source path or is explicitly marked unknown.
- Tests and toolchain results include commands and outcomes.
- External services are named with their contract surface and repository boundary.
- The working tree contains no unrelated changes.
