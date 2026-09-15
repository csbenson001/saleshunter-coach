# Enterprise CISO readiness brief

Audience: customer CISOs, privacy counsel, security assessors, procurement, and
SalesHunter Coach executives  
Version: 1.0 (2026-09-14)  
Applies to: Enterprise Local profile for the macOS desktop client  
Assurance status: readiness statement, not a certification or legal opinion

## Executive brief

SalesHunter Coach is designed to keep the most sensitive sales-call data under
customer control. In the Enterprise Local target architecture, microphone and
system audio are processed in bounded volatile-memory windows, never recorded,
and sent only to the customer-approved speech-to-text destination. Transcript
content is scrubbed on the Mac for payment card numbers, Social Security
numbers, phone numbers, and customer-defined identifiers before an LLM request is
created. Provider and CRM credentials persist in macOS Keychain, not application
configuration. Cloud sync and team sharing are disabled by default.

This design creates a materially smaller data footprint than a centralized call
recording platform: SalesHunter Coach does not need a vendor-controlled library
of raw calls to deliver in-call coaching. Customers retain provider choice,
network allowlisting, local retention policy, and deletion authority.

The repository has working Keychain separation for provider credentials today.
Hosted bearer tokens and some identifying log fields remain outside the target
boundary. Zero-retention capture and pre-LLM redaction are specified release
gates but are not yet complete in the audited 2026-09-14 build. We make that
distinction explicit because enterprise trust depends on verifiable behavior,
not roadmap language.

## Deployment profiles

| Profile | Audio destination | Audio retained | Text destination | Cloud sync | Assurance statement |
| --- | --- | --- | --- | --- | --- |
| Enterprise Local + on-device AI | device only | no | device only, after local redaction | off | strongest local boundary |
| Enterprise Local + BYOK | approved STT receives audio; approved LLM receives redacted text | no | customer-selected providers | off | local-first with declared subprocessors |
| Managed Recording | approved STT plus approved recording store | yes, encrypted and time-bound | approved LLM after redaction | optional | separate retention profile; never called zero-retention |
| Hosted/mobile | hosted relay/backend and contracted subprocessors | according to hosted policy | hosted/BYOK providers | optional/on | outside this brief until separately assessed |

The commercial order, security exhibit, in-product policy, and binary build must
name the selected profile. Capabilities cannot silently change through sign-in or
provider selection.

## What data goes where

| Data | On device | External recipient | Default retention in Enterprise Local |
| --- | --- | --- | --- |
| Raw microphone/system audio | bounded locked-memory windows | selected remote STT only, unless STT is local | zero after consumption/stop |
| Raw transcript | process memory; optional local history only by admin policy | none | session only by default |
| Redacted transcript/context | process memory | selected LLM, if remote | provider contract; zero-retention required where available |
| Coaching outputs | process memory; optional local history | none unless explicitly synced | customer policy |
| API and CRM credentials | macOS Keychain | selected provider in authorization transport | until rotated, revoked, sign-out, or deletion |
| Operational telemetry | local rotating logs, metadata only | none by default | short, configured window |
| Cloud account/sync data | disabled | none | none |

Important boundary: remote STT necessarily receives speech before text exists to
redact. For calls likely to contain PHI, PCI data, or other highly regulated
speech, use on-device STT or an STT vendor under the required DPA/BAA and
zero-retention terms. SalesHunter Coach must never suggest that text redaction
protects the upstream audio leg.

## Control summary for due diligence

### Data minimization and privacy

- Capture starts only after an explicit user action and OS permission.
- Enterprise Local disables call recording, audio export, cloud sync, and
  organization sharing by policy.
- Only the smallest transcript window required by a coaching feature is sent.
- A device-side, fail-closed gateway removes defined identifiers before LLM
  serialization; redaction values and maps are never logged or uploaded.
- Retained transcript/analysis data is optional, locally controlled, and subject
  to documented deletion and retention policy.
- Product notice reminds customers to satisfy participant notice/consent laws.

### Security

- macOS hardened runtime, code signing, notarization, sandbox/capability review,
  and restrictive webview policy are release requirements.
- TLS protects provider connections; an enterprise allowlist restricts egress by
  workload.
- Secrets are stored in Keychain with device-only semantics and are excluded from
  browser persistence, logs, support artifacts, and source control.
- Local MCP is disabled by default or protected by a Keychain-backed token and
  least-privilege scopes.
- Dependency locks, SBOM, vulnerability scanning, secret scanning, artifact
  signing, provenance, and reproducible release evidence form the software supply
  chain gate.

### Operational governance

- Security owns the data-flow inventory, threat model, exception register,
  subprocessor register, and release decision.
- Changes to capture, prompts, storage, telemetry, providers, MCP, or credentials
  require privacy/security review and negative tests.
- Incidents involving customer content or credentials enter the documented
  incident process, including containment, evidence preservation, customer/legal
  notification assessment, eradication, recovery, and lessons learned.
- Workforce production access, where any hosted service exists, requires SSO,
  MFA, role-based least privilege, approval, logging, periodic review, and rapid
  termination. The Enterprise Local client creates no vendor support backdoor.

## SOC 2 Type II readiness mapping

SOC 2 readiness means controls and evidence are designed for an eventual audit;
it is not a SOC 2 report. The audit period must show sustained operation.

| Trust Services Criteria area | SalesHunter Coach control intent | Evidence expected |
| --- | --- | --- |
| CC1–CC2 control environment/information | named owners, policies, training, customer-facing boundary statements | approved policies, training records, governance minutes |
| CC3–CC4 risk/monitoring | risk register, threat model, quarterly reviews, control exceptions | risk reviews, exception expiry, internal audit results |
| CC5–CC6 logical access | Keychain, least privilege, SSO/MFA for hosted systems, access reviews | Keychain tests, IAM exports, quarterly review tickets |
| CC7 system operations | content-safe logs, alerting, vulnerability management, incident response | scan reports, incident exercises, alert/runbook evidence |
| CC8 change management | reviewed changes, CI gates, signed builds, rollback | pull-request approvals, CI artifacts, signatures, release gate |
| CC9 vendor risk | provider allowlist, DPA/retention review, subprocessor register | vendor assessments, contracts, annual reviews |
| A1 availability | bounded queues, fail-closed degradation, provider failure UX, recovery tests | fault-injection and recovery results, SLO reports where hosted |
| C1 confidentiality | classification, zero raw audio retention, egress minimization, encryption | file/network traces, retention tests, encryption configuration |
| P1–P8 privacy | notice, choice, purpose limitation, retention/deletion, DSARs, processor governance | notices, consent/config records, DSAR tests, deletion evidence |

Minimum readiness packet before claiming an audit-ready control environment:
scope statement, system description, asset/data inventory, risk assessment,
policies, control matrix, evidence index, vendor register, incident plan and
tabletop, access reviews, vulnerability results, change records, backup/deletion
tests, and management assertion. Only an independent CPA firm can issue a SOC 2
report.

## HIPAA BAA compatibility

Sales conversations are not automatically PHI. If a covered entity or business
associate will use the product with PHI, deployment is permitted only after the
following conditions are met:

- the customer and SalesHunter Coach execute a BAA defining permitted uses,
  safeguards, incident/breach duties, subcontractors, return/destruction, and
  termination;
- every remote STT, LLM, hosting, logging, and support provider that may receive
  ePHI is covered by an appropriate downstream BAA;
- Enterprise Local policy disables recording and cloud sync, or an approved
  encrypted retention design is documented;
- access controls, unique identity, audit controls, integrity protection,
  transmission security, device/media controls, contingency procedures, and risk
  analysis are implemented and evidenced under 45 CFR 164.308/310/312;
- the customer documents participant authorization and configures its own minimum
  necessary, workforce, endpoint, and retention controls; and
- incident procedures support HIPAA breach-risk assessment and contractual notice
  timing.

Client-side redaction is defense in depth, not a HIPAA safe harbor. Free-form
conversation can contain PHI that deterministic patterns cannot identify.
Until BAAs and the operational controls above are in place, the product must be
described as “architected for BAA-compatible deployment,” not “HIPAA compliant.”

## GDPR roles and data-subject boundaries

For enterprise customer calls, the customer generally determines why and how
personal data is processed and acts as controller. SalesHunter Coach acts as
processor only to the extent it operates a contracted hosted service; in a pure
local/BYOK deployment, customer-selected STT/LLM providers may be the customer's
processors directly. Contract and actual data flow, not marketing labels,
determine the roles.

Required GDPR artifacts and behaviors:

- Article 28 data processing agreement with instructions, confidentiality,
  security, subprocessors, assistance, deletion/return, and audit terms;
- Article 30 processing records and a current data/subprocessor inventory;
- Article 25 data protection by design/default: zero recording, sync off, minimum
  transcript windows, client-side redaction, and short retention;
- Article 32 technical/organizational measures and documented risk assessment;
- transfer mechanism and transfer impact assessment for data leaving the EEA,
  including SCCs where required;
- DPIA support for systematic employee monitoring, large-scale sensitive data,
  or other high-risk deployment;
- data-subject request workflow for access, correction, deletion, restriction,
  portability, and objection, with controller verification and deadlines;
- deletion propagates through local data, caches, cloud objects, processors, and
  backup expiry; and
- incident triage supports processor notice to controllers without undue delay
  and controller assessment of the 72-hour supervisory-authority deadline.

Redaction tokens are pseudonymization, not anonymization. The transcript and AI
outputs remain personal data whenever a person can reasonably be reidentified
from context.

## Retention and deletion schedule

| Record | Enterprise Local default | Deletion trigger |
| --- | --- | --- |
| Raw audio | none | immediate after processing; stop/cancel/error zeroization |
| Raw transcript | session memory only | session end, unless admin-enabled local history |
| Redaction map | session memory only | request/session completion |
| Redacted provider payload | no client copy | request completion; provider contractual schedule |
| Local transcript and outputs | disabled or customer-defined | user/admin deletion or retention expiry |
| Credentials | Keychain until needed | rotation, revocation, sign-out, account/device offboarding |
| Metadata-only logs | short configured rotation | automatic rotation or support cleanup |
| Release/control evidence | seven years unless policy sets otherwise | governance retention expiry |

Any different contractual period supersedes this table only when recorded in the
customer configuration and data processing agreement.

## Incident response commitments

1. **Detect and classify:** identify affected profile, customer, data class,
   provider, and time window without copying sensitive content into tickets.
2. **Contain:** stop egress, revoke credentials, disable affected release/provider,
   preserve scoped forensic evidence, and maintain chain of custody.
3. **Assess:** determine confidentiality/integrity/availability impact and legal/
   contractual notification duties, including GDPR and HIPAA where applicable.
4. **Notify:** use contracted channels and timing. Do not wait for complete root
   cause when law or contract requires preliminary notice.
5. **Eradicate and recover:** patch, rotate, verify negative tests, issue signed
   update, and confirm deletion/containment with subprocessors.
6. **Learn:** complete root cause, corrective actions, control updates, and an
   executive/customer report appropriate to the incident.

Customer security contacts and SalesHunter Coach's monitored incident channel
must be exchanged during onboarding. Contractual notification promises must not
be published until Legal and operations confirm they can be met.

## Standard CISO questions

**Do you record our calls?**  
The Enterprise Local target profile does not. Audio is processed in bounded
memory and discarded. Other profiles can retain recordings and must be described
and contracted separately. The currently audited build has not yet passed the
zero-retention gate.

**Does raw audio go to an AI model?**  
Audio goes only to the selected STT engine. If STT is remote, that provider
receives it over TLS. LLMs receive text, not raw audio, and the enterprise target
requires local redaction before LLM transmission.

**Can you guarantee that no PII leaves the device?**  
No blanket guarantee is responsible: speech sent to remote STT may contain PII,
and contextual identifiers can evade deterministic detection. We can guarantee a
tested redaction boundary before LLM egress once the gate is implemented, disclose
the STT boundary, and support fully local providers for the strictest deployment.

**Where are keys stored?**  
Provider credentials are already separated from browser persistence and stored
through macOS Keychain in the desktop app. The current hosted bearer session is
still included in persisted browser state. Enterprise completion migrates that
token and all future CRM tokens to Keychain and verifies device-only access
attributes.

**Do you train on customer content?**  
SalesHunter Coach does not train models on customer content. Remote provider
handling is governed by the customer's selected provider terms and the approved
subprocessor configuration; training/human review must be disabled contractually
and technically where supported.

**Can your staff access our meetings?**  
The Enterprise Local profile has no vendor cloud copy or support backdoor. Local
device administrators and customer-authorized MCP clients may access retained
local content under customer controls.

**How do we delete data?**  
Session-only data expires automatically. For enabled history, deletion must
remove the record, derivative caches/indexes, and any approved synced copy;
provider-side request data follows the contracted provider retention schedule.

**Are you SOC 2 or HIPAA certified?**  
This packet maps readiness controls but is not a SOC 2 report or HIPAA
attestation. Current certifications, audit period, exceptions, and BAA
availability must be answered only from executed evidence and contracts.

## Evidence index for procurement

Provide under NDA as applicable, by exact release hash:

- architecture/data-flow and threat model;
- completed enterprise release-gate record;
- redaction policy version and test summary (never the sensitive corpus values);
- zero-audio file/network trace report and bounded-memory test;
- Keychain, logging, MCP, CSP, and capability test results;
- SBOM, dependency and vulnerability scan summaries, secret scan, artifact
  signature/notarization, and build provenance;
- penetration test executive summary and remediation status;
- incident response plan and latest tabletop summary;
- subprocessor register, data locations, retention schedule, DPA/BAA status;
- SOC 2 report or bridge letter only if actually issued; and
- open exceptions with severity, compensating controls, owner, and expiry.

## Claim discipline

Approved current statement:

> SalesHunter Coach has defined an Enterprise Local architecture that minimizes
> call-data movement, uses macOS Keychain for provider credentials, and requires
> zero audio retention plus client-side PII/PCI redaction as release gates.

Statements such as “zero audio retained,” “all PII is removed,” “SOC 2
certified,” “HIPAA compliant,” or “GDPR compliant” require release-specific and
contract-specific evidence. They are prohibited until the responsible control
owner and CISO approve them in writing.
