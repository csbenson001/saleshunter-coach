package com.saleshunter.coach.screenshot

import android.net.Uri
import com.saleshunter.coach.BuildConfig
import com.saleshunter.coach.cloud.CloudUser
import com.saleshunter.coach.cloud.HostedQuota
import com.saleshunter.coach.cloud.RecordingMeta
import com.saleshunter.coach.cloud.RecordingSource
import com.saleshunter.coach.cloud.RecordingSummary
import com.saleshunter.coach.kit.TranscriptSegment
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.json.addJsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonArray
import kotlinx.serialization.json.putJsonObject

/**
 * Deterministic demo state for Play Store screenshots — debug builds only.
 *
 * Why this exists: every screen the store listing needs is behind the sign-in
 * wall, and the wall is behind a real account. Capturing by hand means signing a
 * device into a live account, which is (a) slow, (b) impossible to reproduce
 * exactly next release, and (c) puts real customer data one mis-tap away from a
 * public store listing. This is the Android half of iOS
 * `ios/App/Coach/ScreenshotDemo.swift`, and it makes the same three promises:
 *
 *  1. **Signed in without a token.** [enabled] short-circuits the sign-in wall in
 *     `CoachRoot`; nothing is ever written to the auth DataStore.
 *  2. **No network, ever.** Every cloud call the UI would make is answered from
 *     the fixtures below, so a reviewer's (or CI's) offline machine captures the
 *     same frames as a connected one, and production is never touched.
 *  3. **No residue.** The flag and the navigation cue live in memory only. There
 *     is no disk write, no pending-upload queue entry, no notification, no
 *     microphone. `saleshunter-coach://demo/off` (or a process restart) leaves the app
 *     exactly as it was.
 *
 * Driven entirely by deep links, the way iOS is driven by `simctl openurl` —
 * input automation on an emulator is unreliable, `am start` is not:
 *
 * ```
 * adb shell am start -a android.intent.action.VIEW -d "'saleshunter-coach://demo/library'"
 * ```
 *
 * Routes: `library`, `transcript`, `record` (alias `meeting`), `account`
 * (alias `settings`), and `off`.
 *
 * Everything below is invented. No real company, person, account, or meeting is
 * represented, the only address is in the RFC-reserved `example.com`, and the
 * copy is written separately in English and Traditional Chinese — a screenshot
 * set that reads like a translation sells the product short in whichever store
 * it lands in.
 */
object DemoMode {

    /** The screens the listing needs, each addressable by its own URL. */
    enum class Screen { LIBRARY, TRANSCRIPT, MEETING, ACCOUNT }

    /**
     * A navigation request. [serial] makes each one distinct so firing the same
     * URL twice re-navigates instead of being swallowed as "no change".
     */
    data class Navigation(val screen: Screen, val serial: Long)

    private val _enabled = MutableStateFlow(false)

    /** Whether the app is serving fixtures instead of the cloud. */
    val enabled: StateFlow<Boolean> = _enabled.asStateFlow()

    private val _navigation = MutableStateFlow<Navigation?>(null)

    /** The screen the last `saleshunter-coach://demo/…` asked for. */
    val navigation: StateFlow<Navigation?> = _navigation.asStateFlow()

    private var serial = 0L

    /** Cheap synchronous read for the non-Compose injection points. */
    val isActive: Boolean get() = _enabled.value

    /**
     * Handle a `saleshunter-coach://demo/…` deep link. Returns false for anything else — a
     * sign-in callback, or any route in a release build — so `MainActivity`'s
     * real handler still sees it.
     */
    fun handle(uri: Uri): Boolean {
        if (!BuildConfig.DEBUG) return false
        if (uri.scheme != SCHEME || uri.host != HOST) return false
        val route = uri.pathSegments.lastOrNull().orEmpty()
        if (route == ROUTE_OFF) {
            disable()
            return true
        }
        val screen = when (route) {
            "library", "recordings" -> Screen.LIBRARY
            "transcript", "recording" -> Screen.TRANSCRIPT
            "record", "meeting" -> Screen.MEETING
            "account", "settings" -> Screen.ACCOUNT
            else -> return false
        }
        _enabled.value = true
        serial += 1
        _navigation.value = Navigation(screen, serial)
        return true
    }

    /** Leave demo mode. In-memory only, so this is the whole clean-up. */
    fun disable() {
        _enabled.value = false
        _navigation.value = null
    }

    // ── language ─────────────────────────────────────────────────────────────

    // ── account fixtures ─────────────────────────────────────────────────────

    fun user(): CloudUser = CloudUser(
        id = "demo-user",
        name = "Alex Rivera",
        email = "alex@example.com",
    )

    fun quota(): HostedQuota = HostedQuota(
        plan = "free",
        sttSecondsUsed = 8_640.0,
        sttSecondsLimit = 36_000.0,
        llmCreditsUsed = 180.0,
        llmCreditsLimit = 500.0,
        periodResetTs = EPOCH_MS + 18 * DAY_MS,
    )

    // ── library fixtures ─────────────────────────────────────────────────────

    /** The recording the `transcript` route opens: the fully analyzed one. */
    const val FEATURED_ID = "demo-renewal"

    private const val DISCOVERY_ID = "demo-discovery"
    private const val REVIEW_ID = "demo-review"

    fun recordings(): List<RecordingSummary> = listOf(
        RecordingSummary(
            id = FEATURED_ID,
            title = "Renewal terms — Northwind",
            source = RecordingSource.LIVE,
            createdAt = EPOCH_MS,
            durationMs = 1_122_000.0,
            speakerCount = 2,
            findingsCount = 3,
            actionItemsCount = 2,
            hasAudio = true,
            snippet = "Forty seats against an eighty-seat quote; price held through the next renewal.",
        ),
        RecordingSummary(
            id = DISCOVERY_ID,
            title = "Discovery call — Halcyon Labs",
            source = RecordingSource.LIVE,
            createdAt = EPOCH_MS - DAY_MS,
            durationMs = 1_925_000.0,
            speakerCount = 3,
            findingsCount = 2,
            actionItemsCount = 1,
            hasAudio = true,
            snippet = "Security questionnaire due Friday; invoicing split across two cost centres.",
        ),
        RecordingSummary(
            id = REVIEW_ID,
            title = "Quarterly review — Meridian",
            source = RecordingSource.UPLOAD,
            createdAt = EPOCH_MS - 5 * DAY_MS,
            durationMs = 2_831_000.0,
            speakerCount = 2,
            findingsCount = 0,
            actionItemsCount = 0,
            hasAudio = true,
            snippet = "Usage up 22% quarter on quarter; two action items carried over.",
        ),
    )

    /** The meta the detail screen renders, or null for an id we don't have. */
    fun meta(id: String): RecordingMeta? {
        val summary = recordings().firstOrNull { it.id == id } ?: return null
        return RecordingMeta(
            buildJsonObject {
                put("id", summary.id)
                put("title", summary.title)
                put("source", summary.source)
                put("createdAt", summary.createdAt.toLong())
                put("durationMs", summary.durationMs.toLong())
                put("audio", "audio.ogg")
                put("analyzed", summary.findingsCount != 0)
                putJsonObject("speakerNames") {
                    speakerNames(id).forEach { (key, name) -> put(key, name) }
                }
                putJsonArray("segments") {
                    lines(id).forEach { line ->
                        addJsonObject {
                            put("id", "mix-${line.index}")
                            put("source", "mix")
                            put("speaker", line.speaker)
                            put("text", line.text)
                            put("isFinal", true)
                            put("startMs", line.atMs)
                            put("endMs", line.atMs + LINE_LENGTH_MS)
                        }
                    }
                }
                putJsonArray("findings") {
                    findings(id).forEach { finding ->
                        addJsonObject {
                            put("title", finding.title)
                            put("detail", finding.detail)
                            put("atMs", finding.atMs)
                            put("severity", finding.severity)
                        }
                    }
                }
                putJsonArray("actionItems") {
                    actionItems(id).forEach { item ->
                        addJsonObject {
                            put("text", item.text)
                            put("rationale", item.rationale)
                            put("done", false)
                        }
                    }
                }
            }
        )
    }

    private fun speakerNames(id: String): Map<String, String> = when (id) {
        DISCOVERY_ID -> mapOf(
            "mix-1" to "Head of platform",
            "mix-2" to "You",
            "mix-3" to "Security lead",
        )

        else -> mapOf(
            "mix-1" to "Client lead",
            "mix-2" to "You",
        )
    }

    // ── transcript fixtures ──────────────────────────────────────────────────

    private data class Line(val index: Int, val speaker: Int, val atMs: Long, val text: String)

    /**
     * The conversations, written the way B2B calls actually sound — a seat count
     * against a quote, a price hold, an onboarding estimate with a condition
     * attached. A screenshot reading "test test test" tells a reviewer nothing
     * about what the product does.
     */
    private fun lines(id: String): List<Line> = when (id) {
        DISCOVERY_ID -> listOf(
            Line(
                1, 1, 9_000,
                "We run about thirty calls a week across two teams, and nobody writes them up. That's the problem we're trying to solve.",
            ),
            Line(
                2, 2, 31_000,
                "Then the place to start is the transcript, not the summary — people trust a summary once they can check it against what was said.",
            ),
            Line(
                3, 3, 52_000,
                "Before any of that, I need the security questionnaire back. Friday, or this slips to next quarter.",
            ),
            Line(
                4, 2, 74_000,
                "Friday works. One thing to flag: your invoicing has to be split across two cost centres, so I'll set that up before the trial starts.",
            ),
        )

        REVIEW_ID -> listOf(
            Line(
                1, 1, 14_000,
                "Usage is up twenty-two percent quarter on quarter, and almost all of it came from the two teams that onboarded in March.",
            ),
            Line(
                2, 2, 38_000,
                "That matches what we saw. The two action items from last quarter are still open — both are waiting on your IT team.",
            ),
            Line(
                3, 1, 61_000,
                "Carry them over. I'd rather close them properly next quarter than mark them done today.",
            ),
        )

        else -> listOf(
            Line(
                1, 1, 12_000,
                "We're happy with the platform overall. The blocker is the seat count — we budgeted for forty and the quote came back at eighty.",
            ),
            Line(
                2, 2, 27_000,
                "Forty is the floor on the enterprise tier, so I can't go under it. What I can do is hold this year's price through the next renewal.",
            ),
            Line(
                3, 1, 44_000,
                "A price hold helps. What about the onboarding time you mentioned last week — you said two weeks?",
            ),
            Line(
                4, 2, 58_000,
                "Two weeks assumes your SSO is already on Okta. If it isn't, add a week for the identity mapping.",
            ),
            Line(
                5, 1, 76_000,
                "It is. Send the revised quote with the price hold in writing and I'll take it to finance on Thursday.",
            ),
            Line(
                6, 2, 92_000,
                "I'll have it to you tomorrow morning, and I'll include the security questionnaire your team asked for.",
            ),
        )
    }

    // ── analysis fixtures ────────────────────────────────────────────────────

    private data class Finding(
        val title: String,
        val detail: String,
        val atMs: Long,
        val severity: String,
    )

    private data class ActionItem(val text: String, val rationale: String)

    private fun findings(id: String): List<Finding> = when (id) {
        FEATURED_ID -> listOf(
            Finding(
                "Seat count is the only blocker",
                "Forty seats budgeted against an eighty-seat quote. Everything else about the renewal was already agreed.",
                12_000, "high",
            ),
            Finding(
                "A price hold replaced a discount",
                "Holding this year's rate through the next renewal kept the conversation moving without cutting below the enterprise seat floor.",
                27_000, "medium",
            ),
            Finding(
                "The onboarding estimate has a condition",
                "Two weeks assumes SSO is already on Okta; add a week for identity mapping if it isn't. The customer confirmed it is.",
                58_000, "low",
            ),
        )

        DISCOVERY_ID -> listOf(
            Finding(
                "The security questionnaire gates the timeline",
                "Friday is a hard date — missing it pushes the whole evaluation into next quarter.",
                52_000, "high",
            ),
            Finding(
                "Billing needs two cost centres",
                "Raised as an aside, but it has to be set up before the trial starts or the first invoice bounces internally.",
                74_000, "medium",
            ),
        )

        else -> emptyList()
    }

    private fun actionItems(id: String): List<ActionItem> = when (id) {
        FEATURED_ID -> listOf(
            ActionItem(
                "Send the revised quote with the price hold in writing",
                "Finance reviews it on Thursday, so it has to land Wednesday at the latest.",
            ),
            ActionItem(
                "Attach the security questionnaire to the same email",
                "Their team asked for it directly, and it gates their internal sign-off.",
            ),
        )

        DISCOVERY_ID -> listOf(
            ActionItem(
                "Return the security questionnaire by Friday",
                "Named as the gate on the whole evaluation timeline.",
            ),
        )

        else -> emptyList()
    }

    // ── live meeting fixture ─────────────────────────────────────────────────

    /**
     * The renewal conversation again, this time as live segments for
     * [DemoMeetingSession] to play back on a timer — the live screen has to be
     * capturable on an emulator with no microphone and no audio input.
     */
    fun liveScript(): List<TranscriptSegment> =
        lines(FEATURED_ID).map { line ->
            TranscriptSegment(
                id = "mix-${line.index}",
                source = "mix",
                speaker = line.speaker,
                text = line.text,
                isFinal = true,
                startMs = line.atMs,
                endMs = line.atMs + LINE_LENGTH_MS,
            )
        }

    /** The unfinished tail: what the relay has heard but not settled yet. */
    fun liveTail(): TranscriptSegment = TranscriptSegment(
        id = "mix-tail",
        source = "mix",
        speaker = 1,
        text = "So if we sign this week, when could your team actually",
        isFinal = false,
        startMs = 108_000,
        endMs = 112_000,
    )

    private const val SCHEME = "saleshunter-coach"
    private const val HOST = "demo"
    private const val ROUTE_OFF = "off"

    /** A fixed clock, so a re-capture months later produces identical frames. */
    private const val EPOCH_MS = 1_786_498_800_000.0

    private const val DAY_MS = 86_400_000.0
    private const val LINE_LENGTH_MS = 12_000L
}
