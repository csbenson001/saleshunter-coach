# Legal Third Chair Assessment: SalesHunter Coach Feasibility Analysis

**Investigation Date:** October 18, 2026  
**Investigator:** Cloud Agent (Cursor)  
**Target:** saleshunter-coach @ commit `d838101`  
**Status:** Investigation complete, no product changes made

This document assesses the feasibility of adapting SalesHunter Coach (Chris's fork of Parley) into a live AI deposition "third chair" for attorneys. It covers architecture, latency, delta from upstream, gaps versus the PRD requirements, recommendations on repository strategy, and a phased change list.

---

## 1. Architecture as it Exists Now

### 1.1 High-Level System

SalesHunter Coach is a **Tauri 2 desktop app** (Rust backend + React 19 webview) that provides real-time AI coaching during sales calls. The architecture has six major subsystems:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Desktop App (Tauri 2)                        │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────────────────┐   │
│  │   Audio     │   │    STT      │   │      Analysis Engine    │   │
│  │   Capture   │──▶│  Provider   │──▶│  (Webview + zustand)    │   │
│  │  (Rust)     │   │   (Rust)    │   │                         │   │
│  └─────────────┘   └─────────────┘   └─────────────────────────┘   │
│         │                │                       │                  │
│         ▼                ▼                       ▼                  │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────────────────┐   │
│  │  Recorder   │   │ Diarization │   │       LLM Router        │   │
│  │   Buffer    │   │  (CAM++     │   │  (Vercel AI SDK v6)     │   │
│  │  (Ogg/Opus) │   │   ONNX)     │   │                         │   │
│  └─────────────┘   └─────────────┘   └─────────────────────────┘   │
│                                              │                      │
├─────────────────────────────────────────────┼──────────────────────┤
│                      MCP Server (Rust/axum)  │  Storage (JSON/Ogg) │
│                      127.0.0.1:3011-3020     │  <app_data>/history │
└─────────────────────────────────────────────┴──────────────────────┘
                               │
                               ▼
               ┌───────────────────────────────┐
               │   saleshunter-platform        │
               │   (Railway, Node + Hono)      │
               │   - Identity / Auth           │
               │   - STT Relay (wss://)        │
               │   - LLM Proxy                 │
               │   - Recording Storage         │
               └───────────────────────────────┘
```

### 1.2 Audio Capture

| Component | Implementation | Source Reference |
|-----------|---------------|------------------|
| Microphone | cpal input device, selectable by name | `src-tauri/src/audio/microphone.rs` |
| macOS System Audio | Core Audio `AudioHardwareCreateProcessTap` (macOS 14.2+), captures all system output | `src-tauri/src/audio/system_macos.rs:63-150` |
| Mixing | Real-time sum of mic + system streams; 2s backlog cap, 600ms silence timeout | `src-tauri/src/audio/mixer.rs` |
| Pause Gate | `meter_chunks()` drops audio while `paused` flag is set; nothing billed, recorded, or transcribed | `src-tauri/src/capture.rs:290-345` |
| Sample Format | 16 kHz mono s16 (resampled from device native) | `src-tauri/src/audio/resample.rs` |
| Far-End Detection | `FarEndState` rejects counterpart bleed for prosody scoring | `src-tauri/src/audio/prosody.rs` |

**Capture Modes:**
1. **Diarizing provider (Soniox, Deepgram):** mic + system mixed into ONE stream → provider labels speakers
2. **Non-diarizing provider:** two separate sessions, speakers labeled "me" / "them" by device

**Key finding:** There is NO meeting bot. Capture is desktop-local only — this cannot join Zoom/Teams as a participant or capture per-speaker streams from cloud meetings.

### 1.3 STT Provider and Streaming Path

**Provider Registry:** `src-tauri/src/transcription/mod.rs`

| Provider | Endpoint | Diarization | Notes |
|----------|----------|-------------|-------|
| Soniox (default) | `wss://stt-rt.soniox.com` | Yes | `enable_endpoint_detection`, `enable_speaker_diarization` |
| Deepgram | `wss://api.deepgram.com` | Yes | nova-3 models |
| AssemblyAI | `wss://api.assemblyai.com` | Yes | |
| OpenAI | `wss://api.openai.com/v1/realtime` | No | gpt-4o-transcribe |
| Gemini Live | Google's live API | No | |
| SalesHunter Coach Cloud | `wss://api.saleshunter-coach.cloud/stt/v2/stream` | Via relay | Routes to Soniox behind a relay |
| Local Whisper | whisper.cpp on-device | No | Energy-based endpointer |

**Streaming Path (from `capture.rs:350-430` and `transcription/common.rs`):**

```
cpal/tap callback
    → resample to 16 kHz (audio/resample.rs)
    → mixer (if diarizing)
    → meter_chunks() [pause gate, recorder tee, usage counter]
    → provider WebSocket writer (transcription/ws.rs:188-250)
    → server tokens
    → SegmentBuilder (transcription/common.rs:300-430)
    → Tauri event `transcript://segment`
    → zustand store
    → React UI
```

**Segment Shape** (`transcription/common.rs:70-105`):
```typescript
{
  id: string,
  source: "mix" | "me" | "them",
  speaker: number,  // diarized speaker ID, 0 if unknown
  text: string,
  is_final: boolean,
  start_ms: number,
  end_ms: number
}
```

### 1.4 Diarization

**Live Diarization:** Provider-native when available (Soniox/Deepgram). Otherwise, device-based "me"/"them" only.

**Post-Meeting Re-Diarization** (`src-tauri/src/diarize.rs`):
1. Decode audio to 16k mono
2. Slice by segment timestamps
3. Compute kaldi-fbank features (80-dim)
4. Run CAM++ 192-dim ONNX embedding model (Apache-2.0, from 3D-Speaker)
5. NME spectral clustering (for 16-800 segments) or agglomerative clustering
6. Map clusters back to live speaker numbers by overlap

**Model:** `campplus_zh_en_16k.onnx` (28MB), SHA-256 verified, downloaded on first use.

**Gap for depositions:** Live diarization gives speaker IDs, not **role labels** (Q = examining attorney, A = witness, OBJ = defending counsel). A new layer is needed for role classification.

### 1.5 How Coaching is Triggered

**Trigger Mechanism** (`src/lib/analysis/engine.ts:200-290`):

```typescript
// 3-second poll tick
const interval = setInterval(tick, 3000);

// In tick():
if (autoAnalyze && now >= lastRun.current.analysis + autoAnalyzeSec * 1000) {
  lastRun.current.analysis = now;
  void runAnalysis({ mode: "live" });
}
```

**Configuration** (`src/lib/store.ts:651`):
- `autoAnalyzeSec`: **45 seconds default, 20 seconds minimum**
- Agenda/TODO auto-check: every 45 seconds
- Tone/filler nudges: 15-second cooldown, minimum 2 seconds new speech

**What Gets Sent:** The **entire transcript so far** plus:
- Self-profile (name, role, company, background)
- Meeting context (BATNA, target, bottom line)
- Evaluation prompts from `settings.evaluations`

**Analysis Function** (`src/lib/ai/timeline.ts:225-290`):
```typescript
const transcript = transcriptWithTimestamps(segments, names);
const { object } = await streamObjectResilient({
  settings,
  workload: mode === "live" ? "realtime" : "deep",
  schema,  // Zod schema for { moments: [...] }
  system: system + JSON_MODE_INSTRUCTION,
  prompt: `${ctx}Active evaluations:\n${list}\n\n${transcriptLabel}:\n${transcript}`,
  onPartial,
});
```

**Output:** Findings array streamed into `store.setFindings()`, replacing previous findings entirely.

### 1.6 LLM Routing

**Router:** All LLM calls go through Vercel AI SDK v6 (`src/lib/ai/provider.ts`).

**Two Lanes:**
- `realtime`: latency-sensitive, live coaching (e.g., Claude Haiku 4.5)
- `deep`: quality-sensitive, replay/report analysis (e.g., Claude Opus)

**Supported Providers** (`src/lib/ai/providers.ts`):
- Anthropic (direct browser access with `anthropic-dangerous-direct-browser-access` header)
- OpenAI (gpt-4.1-mini, gpt-5.5)
- Gemini (2.5 flash/pro)
- Groq (gpt-oss)
- Qwen, Kimi
- Ollama (local)
- OpenRouter
- SalesHunter Coach Cloud (parley-fast / parley-smart)

**Hosted Mode:** When using SalesHunter Coach Cloud, calls route to `${CLOUD_URL}/v1` with the Better Auth session token.

**Security Note:** API keys are stored in **localStorage** by zustand persistence (`src/lib/store/persistence.ts`). On macOS, a **keychain-backed secure store** exists (`src-tauri/src/secure_store.rs`) for provider credentials, but the integration is incomplete — keys often remain in plaintext localStorage.

### 1.7 MCP Server

**Transport:** axum HTTP server at `127.0.0.1:3011-3020`, JSON-RPC (`POST /mcp`), protocol `2025-06-18`.

**Tools:** 54 tools across 7 domains (`src-tauri/src/mcp.rs`):
- `app_context` (4): get_app_context, get_transcript, get_session_status, get_focused_content
- `live` (12): list/add/remove todos, evaluations, findings
- `recordings` (8): list/search/get recordings
- `folders` (7): manage folders
- `orgs` (11): organization sharing
- `templates` (8): eval and todo templates
- `dictionary` (4): custom phrase dictionary

**External Agent Hook:** `get_transcript` + `add_finding` / `set_findings` allow an external agent to **push live findings into the coach feed** — a ready-made injection point for a separate third-chair engine.

**Security Gaps:**
- **No authentication** (any local process can call it)
- **No Origin/Host validation** (DNS rebinding risk)
- Destructive tools (`delete_recording`) have no confirmation

### 1.8 Storage and Auth

**Local Storage:**
- `<app_data_dir>/history/<id>/meta.json`: full `HistoryEntry` (segments, findings, speakerNames, meetingContext, etc.)
- `<app_data_dir>/history/<id>/audio.ogg`: Ogg/Opus recording
- `<app_data_dir>/history/<id>/summary.json`: list card data

**Settings:** zustand persists to `localStorage["saleshunter-coach:settings"]` including API keys in plaintext.

**Cloud Auth:** Better Auth via `https://api.saleshunter-coach.cloud`, tokens stored in localStorage.

**saleshunter-platform Backend** (not accessible during this investigation):
- Identity/entitlement
- Billing
- LLM proxy
- STT relay (injects vendor keys server-side)
- Recording storage

---

## 2. Latency Budget Analysis

### 2.1 Measured/Code-Derived Latency Components

| Stage | Time | Source |
|-------|------|--------|
| **Speech to Provider** | ~50-100ms | cpal callback → resample → WebSocket send |
| **Provider Processing** | ~150-400ms partials, 500-1500ms finals | Soniox `<end>` endpoint detection (`soniox.rs:20-22`) |
| **Segment Emit** | ~10ms | `SegmentBuilder.emit_chunk()` → Tauri event |
| **zustand Update** | ~5ms | React rerender cycle |
| **Analysis Trigger Wait** | **20,000-45,000ms** | `autoAnalyzeSec` timer (`engine.ts:214`) |
| **LLM Call (realtime lane)** | **3,000-8,000ms** | Full transcript + schema streaming |
| **Findings Render** | ~50ms | `setFindings()` → CoachFeed rerender |

### 2.2 Total Latency Budget

**Worst Case (current implementation):**
```
End of utterance → Final token:     1.5s
Timer until next poll:              0-45s (avg ~22.5s)
LLM over full transcript:           3-8s (grows with deposition length)
───────────────────────────────────────
TOTAL:                              ~26-55 seconds
```

**Best Case (minimum timer):**
```
End of utterance → Final token:     0.5s
Timer (minimum 20s):                0-20s (avg ~10s)
LLM call:                           3-5s
───────────────────────────────────────
TOTAL:                              ~14-26 seconds
```

### 2.3 Where the Time Goes

1. **Timer-based polling** (engine.ts:214): The 3s tick only fires analysis when `now >= lastRun + autoAnalyzeSec * 1000`. This is the dominant delay factor.

2. **Full-transcript processing**: Every analysis pass sends the entire transcript (`transcriptWithTimestamps(segments)`), not incremental turns. As the deposition grows, LLM latency increases linearly.

3. **No endpoint/turn-triggered path**: Unlike the Parley analysis where Soniox `<end>` tokens mark utterance boundaries, there is no hook from these endpoints to trigger instant analysis. The endpointing exists (`TOKEN_END` at `soniox.rs:21`) but is only used for segment finalization, not coaching triggers.

### 2.4 PRD Target Comparison

| Metric | Current | PRD Target | Gap |
|--------|---------|------------|-----|
| Card latency p90 | ~26-55s | <15s | **-11 to -40s** |
| Card latency p50 | ~14-26s | <7s (stretch) | **-7 to -19s** |
| Hedge highlight | N/A (no inline highlighting) | <1s | **Missing feature** |

**Conclusion:** The current architecture cannot meet the <15s target without fundamental changes to the trigger mechanism (timer → turn-event) and the analysis scope (full transcript → incremental).

---

## 3. Changes from Upstream Parley

### 3.1 Verified Differences

| Change | Impact | Evidence |
|--------|--------|----------|
| **Language removal** | Removed Traditional Chinese (zh-TW) entirely: no opencc-js, no language picker, no zh-Hant resources | CLAUDE.md: "The upstream project (Parley) was bilingual zh-TW/en; this fork removed Traditional Chinese entirely" |
| **Brand rename** | Parley → SalesHunter Coach | Package name, service name, API endpoints |
| **Cloud backend** | parley.tw → saleshunter-coach.cloud | `src/lib/cloud/client.ts` |
| **Sales-specific features** | Added: ConcessionTradeHUD, CompetitorBattlecardBar, MeddicMatrix, PreCallDossier, etc. | `src/components/sales/*.tsx` |
| **Secure store** | Added macOS Keychain integration | `src-tauri/src/secure_store.rs` (not in upstream) |
| **Provider branding** | "Coach" provider → "SalesHunter Coach" | Provider registry |

### 3.2 Architecture Unchanged from Parley

The core audio, transcription, diarization, MCP, and coaching architecture remains essentially unchanged:
- Same timer-based analysis trigger (45s default, 20s minimum)
- Same full-transcript analysis approach
- Same provider registry and streaming adapters
- Same CAM++ diarization model and process
- Same MCP server structure (no auth, same 54 tools)
- Same localStorage persistence (with the new keychain option)

---

## 4. Gap Analysis vs PRD Requirements

### 4.1 Live Requirements — Critical Gaps

| PRD Requirement | Status | Notes |
|-----------------|--------|-------|
| **Sub-15s sourced cards** | ❌ GAP | Timer-based polling cannot achieve; needs turn-event trigger |
| **Evidence-or-silence verification** | ❌ GAP | No verifier model; findings are unverified LLM output |
| **Per-answer triggering** | ❌ GAP | No hook from STT endpoint to analysis; timer-only |
| **Q/A role labeling** | ⚠️ PARTIAL | Speaker IDs exist; no Q/A/OBJ role classification |
| **Off-record state** | ✅ EXISTS | Pause gate (`meter_chunks`) drops audio; keyword detection needed |
| **Case document fact-card index** | ❌ GAP | No document retrieval, no RAG, no fact cards |
| **NSA claims checks** | ❌ GAP | No structured data, no QPA/CPT/IDR queries |
| **Second-chair/lead views** | ❌ GAP | Single-user only; no multi-user live session |
| **Hedge/ambiguity highlighting** | ❌ GAP | No inline transcript highlighting |
| **Goal tracker (continuous)** | ⚠️ PARTIAL | TODO checklist exists; not evidence-gated |

### 4.2 HIPAA/Security — Critical Gaps

| PRD Requirement | Status | Notes |
|-----------------|--------|-------|
| **Encryption at rest** | ❌ GAP | JSON + Ogg files unencrypted |
| **Keychain secrets** | ⚠️ PARTIAL | Keychain code exists, but keys often in localStorage |
| **BAA vendors** | ❌ GAP | Direct-to-Anthropic calls with no BAA; no PHI controls |
| **Audit log** | ❌ GAP | No access, push, or export logging |
| **MCP authentication** | ❌ GAP | Unauthenticated local server |
| **Tenant isolation** | ❌ GAP | Single-user desktop app; no tenant model |

### 4.3 Prep/Post-Depo — Gaps

| PRD Requirement | Status | Notes |
|-----------------|--------|-------|
| **Document ingest** | ❌ GAP | No file upload, no OCR, no chunking |
| **Fact-card build** | ❌ GAP | No retrieval, no embeddings stored |
| **Prior testimony library** | ❌ GAP | Recording history exists but no cross-matter search |
| **Admissions report** | ❌ GAP | Brief exists but not admissions-focused |
| **Certified transcript alignment** | ❌ GAP | No page:line import or mapping |
| **CMS integrations** | ❌ GAP | No Filevine, MyCase, etc. connectors |

### 4.4 Features that Map Well

| PRD Requirement | Status | Notes |
|-----------------|--------|-------|
| Desktop system audio capture | ✅ | Core Audio tap works, well-implemented |
| Streaming STT with partials | ✅ | Multiple providers supported |
| Post-meeting diarization | ✅ | CAM++ re-diarization is solid |
| Pause/resume recording | ✅ | Pause gate preserves session |
| MCP external-agent hook | ✅ | `add_finding` can receive external cards |
| Local storage structure | ✅ | History folder pattern is reusable |
| Tauri shell/updater | ✅ | Signing, permissions, CI all work |

---

## 5. Recommendation: Fork vs Shared Core

### 5.1 Options Considered

**Option A: Fork saleshunter-coach into a separate legal-third-chair repo**
- Pros: Clean slate for legal domain; no cross-vertical coupling; independent release cycles
- Cons: Duplicated maintenance of audio/STT/diarization; divergent fixes

**Option B: Share a core with a vertical "mode" switch**
- Pros: One codebase for capture/STT/diarization; fixes benefit both
- Cons: Complexity of mode switching; UI/UX compromise; legal compliance requirements may conflict

**Option C: Extract core capture/STT/diarization into a shared library; build legal as a new app consuming it**
- Pros: Clean separation; shared technical core; independent legal compliance
- Cons: Upfront extraction cost; library API design required

### 5.2 Recommendation: Option C — Extract Core, Build New App

**Rationale:**

1. **Compliance divergence**: HIPAA/PHI requirements (encryption, BAA-only providers, audit logging, tenant isolation) are fundamentally different from a sales-coach app. Retrofitting these into a shared app risks both products.

2. **Trigger architecture incompatibility**: The legal product needs turn-event triggering and incremental analysis; sales coaching may prefer the timer approach. These are architectural, not configuration, differences.

3. **UI/UX separation**: Deposition UI (Q/A role labels, inline hedge highlighting, goal/admission tracking, off-record state machine) is substantially different from sales negotiation UI.

4. **Reuse opportunities**: The following can be extracted into a shared `@saleshunter/capture-core` or similar:
   - `src-tauri/src/audio/*` (mic, system_macos, mixer, resample, prosody)
   - `src-tauri/src/transcription/*` (provider registry, adapters, SegmentBuilder)
   - `src-tauri/src/diarize.rs` (CAM++ embedding + clustering)
   - `src-tauri/src/capture.rs` (MicCoordinator, pause gate)
   - MCP transport pattern (once auth is added)

5. **Development velocity**: The legal product can iterate on engine, retrieval, and compliance without destabilizing the sales product.

### 5.3 Desktop App Communication with Third-Chair Engine

**Recommended Architecture:**

```
┌──────────────────────────────────────────────────────────────────┐
│                   Legal Third Chair Desktop App                   │
│                        (Tauri 2 / React)                          │
├──────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐     ┌──────────────────────────────────┐   │
│  │   Capture Core   │────▶│       Third Chair Client         │   │
│  │  (shared library)│     │  (WebSocket to cloud service)    │   │
│  └──────────────────┘     └──────────────────────────────────┘   │
│           │                           │                           │
│           ▼                           │  turns + context          │
│  ┌──────────────────┐                 │                           │
│  │  Local Buffering │                 │                           │
│  │  (offline-first) │                 │                           │
│  └──────────────────┘                 │                           │
└───────────────────────────────────────┼───────────────────────────┘
                                        ▼
                        ┌───────────────────────────────┐
                        │    Third Chair Engine         │
                        │    (sayfeai-platform-v2)      │
                        │                               │
                        │  • Turn segmentation          │
                        │  • Role classification        │
                        │  • Claim extraction           │
                        │  • Fact-card retrieval        │
                        │  • Structured checks          │
                        │  • Verifier (evidence-or-     │
                        │    silence)                   │
                        │  • Rate gate                  │
                        └───────────────────────────────┘
```

**WebSocket Contract (proposed):**

```typescript
// Client → Server
interface TurnClosedEvent {
  type: "turn_closed";
  sessionId: string;
  turn: {
    id: string;
    speaker: number;
    role?: "Q" | "A" | "OBJ" | "COLLOQUY" | "REPORTER";
    text: string;
    startMs: number;
    endMs: number;
    isFinal: true;
  };
  transcript: UtteranceSummary[];  // Rolling window, not full
  context: SessionContext;
}

interface SessionContext {
  matterId: string;
  witnessId?: string;
  goals: Goal[];
  factCardIndex: string;  // Reference to precomputed index
  onRecord: boolean;
}

// Server → Client
interface CardEvent {
  type: "card";
  card: {
    id: string;
    turnId: string;
    category: "contradiction" | "data_conflict" | "prior_testimony" | "evasive" | "follow_up" | "goal_progress";
    severity: "info" | "warn" | "critical";
    claim: string;
    witnessQuote: { text: string; startMs: number; endMs: number };
    evidence: { quote: string; locator: string; docId: string };
    suggestedQuestion?: string;
    latencyMs: number;
    pushed: boolean;  // True if auto-pushed to lead, false if rail-only
  };
}

interface HedgeEvent {
  type: "hedge";
  turnId: string;
  spans: { start: number; end: number; category: string; reason: string }[];
}
```

**Local vs Cloud Decision:**

| Factor | Local Engine | Cloud Engine |
|--------|--------------|--------------|
| Latency | Lower (no network) | Network RTT added (~50-200ms) |
| Compute | Limited by laptop | Scalable |
| Retrieval | Must ship embeddings/index | Server-side, pre-indexed |
| PHI handling | Local = simpler compliance | Requires BAA, encryption in transit |
| Offline | Full functionality | Degraded mode only |
| Updates | App release cycle | Server-side instant |

**Recommendation:** **Cloud engine** for the third-chair analysis, with local buffering for offline resilience. The retrieval over matter documents and structured NSA/patent data is too compute/storage-heavy to run locally on attorney laptops, and the evidence-or-silence verification requires multiple LLM calls best orchestrated server-side.

---

## 6. Latency Comparison: Desktop Capture vs Browser Capture

### 6.1 Desktop Capture (Current)

| Component | Latency | Notes |
|-----------|---------|-------|
| cpal audio callback | ~5-10ms | Direct hardware access |
| System audio tap | ~10-20ms | Core Audio process tap, kernel-level |
| Resampling | ~1ms | Linear resampler, 16kHz mono |
| WebSocket queue | ~10-50ms | Local to provider |
| **Total capture→socket** | **~25-80ms** | Very low, hardware-level |

### 6.2 Browser Capture (getUserMedia/WebRTC)

| Component | Latency | Notes |
|-----------|---------|-------|
| getUserMedia init | ~100-500ms | First-time permission prompt |
| MediaStreamTrack | ~30-50ms | Browser audio stack latency |
| AudioWorklet processing | ~20-50ms | JS thread scheduling |
| WebSocket queue | ~10-50ms | Browser to provider |
| **Total capture→socket** | **~60-150ms** | Higher, more variable |

**Key Differences:**

| Factor | Desktop | Browser |
|--------|---------|---------|
| System audio | ✅ Native tap | ❌ Requires screen share or extension |
| Latency floor | ~25ms | ~60ms |
| Permission UX | One-time system prompt | Per-session prompt |
| Offline capability | ✅ Full | ⚠️ Limited (service worker) |
| Cross-platform | macOS 14.2+, Windows | All modern browsers |
| Update cycle | App release | Instant (no download) |

### 6.3 Does Browser Add Meaningful Latency for Coaching?

**For the coaching use case (current architecture):**
- Timer polling: 20,000-45,000ms
- LLM analysis: 3,000-8,000ms
- Browser capture overhead: ~35-70ms additional

**Verdict:** The browser capture overhead (~35-70ms) is **negligible** compared to the timer and LLM latency. The bottleneck is the analysis architecture, not the capture method.

**For the target architecture (turn-event triggered):**
- Turn finalization: ~500-1500ms
- Claim extraction: ~1500ms
- Retrieval: ~300ms
- Verification: ~3000ms
- Browser overhead: ~35-70ms

**Verdict:** Browser capture adds **<3%** to the target ~7s latency. **Browser capture is viable** for a sub-15s product if the analysis architecture is fixed.

### 6.4 When Desktop Matters

Desktop capture is preferable when:
1. **System audio is required** without screen share (remote depos where the attorney doesn't want to share their screen)
2. **Offline/unreliable network** (courtroom WiFi)
3. **PHI concerns** about audio never leaving the device (local-first architecture)

For the third-chair product, **hybrid is best**: desktop for capture fidelity and offline, browser for second-chair/lead views.

---

## 7. Phased Change List

All effort estimates are labeled as **ESTIMATES** — not measured. They assume a single experienced developer familiar with the codebase.

### Phase 0: Platform Defects (Before any live work)

| Task | Effort | Dependencies |
|------|--------|--------------|
| Fix `deposition-engine.ts` direct Anthropic call → use `models.ts` router | 1-2 days | None |
| Fix fabricated citations in deposition prompts → locator-only from retrieved chunks | 2-3 days | Retrieval changes |
| Fix fallback defaults → explicit degraded state | 0.5 days | None |
| Fix `idr-strategy.ts` direct call + invented fallback | 1 day | None |
| Fix `nsa-claim.model.ts` plaintext PHI → field-level encryption/tokenization | 3-5 days | Encryption infra |
| Fix `retrieval-orchestrator.ts` throw on error → degrade to BM25 | 1 day | None |

**Total Phase 0:** ~8-12 days (ESTIMATE)

### Phase 1: Core Extraction & Engine Foundation

| Task | Effort | Dependencies |
|------|--------|--------------|
| Extract capture core into shared package | 5-7 days | None |
| Add turn-closed event emission from `SegmentBuilder.endpoint()` | 2-3 days | Core extraction |
| Build `depo-realtime` service skeleton (Railway/Azure Container Apps) | 3-5 days | None |
| Implement role classifier (Q/A/OBJ from turn patterns) | 5-7 days | Training data |
| Implement hedge lexicon + deterministic detector | 3-5 days | Lexicon design |
| Implement claim extractor (small model) | 5-7 days | Prompt engineering |
| Build hot-index for fact-card retrieval | 5-7 days | Platform retrieval |

**Total Phase 1:** ~28-41 days (ESTIMATE)

### Phase 2: Evidence Pipeline & Verification

| Task | Effort | Dependencies |
|------|--------|--------------|
| Implement fact-card precomputation (document ingest) | 7-10 days | OCR, chunking |
| Implement structured checks (NSA claims SQL path) | 5-7 days | NSA data model |
| Implement verifier (evidence-or-silence string match) | 5-7 days | Fact cards |
| Implement phraser (suggested question) | 2-3 days | None |
| Implement rate gate (1 push/60s) | 1-2 days | None |
| WebSocket contract + client integration | 5-7 days | Phase 1 complete |

**Total Phase 2:** ~25-36 days (ESTIMATE)

### Phase 3: UI & Multi-User

| Task | Effort | Dependencies |
|------|--------|--------------|
| Q/A role labels in transcript UI | 2-3 days | Role classifier |
| Inline hedge highlighting | 3-5 days | Hedge detector |
| Goal tracker with evidence carousel | 5-7 days | Phase 2 complete |
| Off-record state machine + keyword detection | 3-5 days | Pause gate |
| Second-chair/lead views (multi-user session) | 7-10 days | Platform auth |
| Glance view (tablet PWA) | 5-7 days | Multi-user |

**Total Phase 3:** ~25-37 days (ESTIMATE)

### Phase 4: Compliance & Production

| Task | Effort | Dependencies |
|------|--------|--------------|
| Encryption at rest (SQLCipher or keychain-wrapped) | 5-7 days | None |
| MCP authentication + Origin checks | 3-5 days | None |
| Audit logging | 3-5 days | None |
| BAA-only provider routing for PHI tenants | 3-5 days | Tenant model |
| Tenant isolation | 5-7 days | Platform tenancy |
| SOC 2 Type II readiness checklist | 10-15 days | All above |

**Total Phase 4:** ~29-44 days (ESTIMATE)

### Phase 5: Domain Packs & Polish

| Task | Effort | Dependencies |
|------|--------|--------------|
| NSA/IDR pack (prompts, structured checks, templates) | 7-10 days | Phase 2 complete |
| Patent pack (claim chart integration) | 7-10 days | Patent module |
| 30(b)(6) topic tracker | 3-5 days | Goal tracker |
| Admissions report generation | 3-5 days | Phase 2 complete |
| Certified transcript alignment | 5-7 days | Page:line import |

**Total Phase 5:** ~25-37 days (ESTIMATE)

### Summary

| Phase | Focus | Effort (ESTIMATE) |
|-------|-------|-------------------|
| 0 | Platform defects | 8-12 days |
| 1 | Core extraction + engine foundation | 28-41 days |
| 2 | Evidence pipeline + verification | 25-36 days |
| 3 | UI + multi-user | 25-37 days |
| 4 | Compliance + production | 29-44 days |
| 5 | Domain packs + polish | 25-37 days |
| **Total** | | **140-207 days** (ESTIMATE) |

**MVP subset (Phases 0-2 + minimal Phase 3):** ~70-100 days to a turn-event triggered, evidence-verified card pipeline with basic UI.

---

## 8. Conclusions

1. **The desktop capture architecture is solid** and reusable. The Rust audio/STT/diarization stack is well-engineered.

2. **The coaching architecture is incompatible** with sub-15s latency. Timer polling over full transcripts must be replaced with turn-event triggering and incremental analysis.

3. **Browser capture is not the latency bottleneck.** A web-based product can achieve the PRD targets if the engine architecture is fixed.

4. **Recommend extracting core capture** into a shared library and building the legal product as a new app with its own compliance profile.

5. **The MCP hook is valuable.** The existing `add_finding` path can receive cards from an external engine with minimal changes.

6. **HIPAA compliance requires significant work.** Encryption, audit logging, BAA routing, and tenant isolation are all missing.

7. **The platform has defects** (direct Anthropic calls, fabricated citations, invented fallbacks) that must be fixed before building on it.

---

## Appendix A: Key Source File References

| Component | File | Key Lines |
|-----------|------|-----------|
| Audio capture trait | `src-tauri/src/audio/mod.rs` | 25-38 |
| macOS system audio | `src-tauri/src/audio/system_macos.rs` | 63-150 |
| Mic coordinator | `src-tauri/src/capture.rs` | 39-150 |
| Pause gate | `src-tauri/src/capture.rs` | 290-345 |
| STT segment builder | `src-tauri/src/transcription/common.rs` | 300-430 |
| Soniox adapter | `src-tauri/src/transcription/soniox.rs` | 70-150 |
| Diarization | `src-tauri/src/diarize.rs` | 1-100 |
| Analysis engine | `src/lib/analysis/engine.ts` | 170-290 |
| Timeline analysis | `src/lib/ai/timeline.ts` | 220-290 |
| LLM provider | `src/lib/ai/provider.ts` | 32-100 |
| Auto-analyze timer | `src/lib/store.ts` | 651 |
| MCP server | `src-tauri/src/mcp.rs` | 1-200 |
| Secure store | `src-tauri/src/secure_store.rs` | 1-90 |

## Appendix B: Upstream Parley Comparison

Based on the Parley teardown (`parley_analysis.md`), the saleshunter-coach fork preserves:
- Core Audio process tap (macOS 14.2+)
- WASAPI loopback (Windows)
- 7 STT providers with the same adapters
- CAM++ diarization model (Apache-2.0)
- 45s default / 20s minimum auto-analyze timer
- 54-tool MCP server (unauthenticated)
- JSON/Ogg local storage pattern

And adds:
- SalesHunter Coach Cloud backend integration
- Sales-specific UI components (MEDDIC, concession trading, etc.)
- macOS Keychain secure store (partial)
- English-only (removed zh-TW)
