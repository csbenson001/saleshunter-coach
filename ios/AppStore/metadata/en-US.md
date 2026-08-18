# en-US App Store metadata

Copy each field into the English (U.S.) localization in App Store Connect.
American English is SalesHunter Coach's only market and only localization.
(**Action required:** the App Store *primary locale* was zh-Hant, so regions
without their own localization would still be served a Chinese listing — set the
primary locale to English (U.S.) in App Store Connect.)

Character limits below are Apple's. Keep the punctuation as written — the em
dashes and curly quotes are deliberate.

| Field | Value |
| --- | --- |
| Name (≤ 30) | SalesHunter Coach: Dictation & Meetings |
| Subtitle (≤ 30) | Voice typing + meeting notes |
| Promotional text (≤ 170) | Voice typing in any app: tap the mic on the SalesHunter Coach keyboard and your words land at the cursor. Or put the phone on the table and record the meeting as a live transcript. |
| Keywords (≤ 100 bytes) | voice typing,dictation,meeting,transcript,sales,negotiation,interview,speech to text,minutes |
| Support URL | https://saleshunterlive.com/support/ |
| Marketing URL | https://saleshunterlive.com |
| Privacy Policy URL | https://saleshunterlive.com/privacy/ |
| Copyright | © 2026 Pathors AI |

## Description (≤ 4,000 chars)

SalesHunter Coach turns your voice into text on your iPhone two ways — and both run on the
same transcription that powers SalesHunter Coach, your copilot for the high-stakes
conversations of sales, negotiation, and interviews.

TYPE BY VOICE, ANYWHERE

Switch to the SalesHunter Coach keyboard in any app — Messages, Mail, Notes, anything with a
text field — tap the mic, and your words type themselves in at the cursor. Put it
on the Action Button and dictation starts without even switching keyboards. Stop
and pick it up again without being bounced out of the app you are in.

RECORD THE MEETINGS YOU HAVE IN PERSON

Put the phone on the table and a live, speaker-separated transcript arrives while
people are still talking — the coffee shop, the customer's office, the table
where nobody opens a laptop. What you keep is a record you can read, search, and
quote from, not a wall of undifferentiated text.

ALSO IN THE APP

• A consent prompt before every single recording session
• A library of your recordings to browse, search, and file into folders
• Personal and organization spaces, with sharing and moving between them
• Finished recordings survive a dead network: they queue on the phone and sync themselves once you are back
• System, light, and dark appearance

BRING YOUR OWN STACK

SalesHunter Coach is open source, and the point is that the meeting layer stays yours. On
the desktop you pick the transcription vendor and the model provider that fit
your cost, privacy, language, and latency requirements — SalesHunter Coach is the interface,
not another closed AI bundle. On iPhone, signing in gets you hosted
transcription with no API key to manage and a free tier that covers everyday use.

ONE ACCOUNT, TWO DEVICES

Recordings and transcripts sync to your SalesHunter Coach account, so a meeting you caught
on the phone opens on the Mac app — where the deeper work happens: the report
with clickable timestamps, what each side committed to, action items, deal
intelligence, and a scorecard on how you delivered. SalesHunter Coach is a meeting copilot
built for sales, negotiation, and interviews; the phone is its capture end.

WHAT IT DOES NOT DO

SalesHunter Coach for iPhone is honest about the platform. iOS gives no third-party app
access to system audio, so this app does not record phone calls, FaceTime, or
sound from other apps, and it never pretends otherwise. Online meetings belong
on the Mac app, which can capture system audio properly. The phone owns the room
you are sitting in.

YOUR DATA

Recording never starts until you confirm that everyone present has agreed to it.
You can delete your account and personal data permanently from Settings →
Account → Delete Account. The privacy policy has the full detail.

SalesHunter Coach is Apache-2.0 licensed. Source: github.com/pathorsAI/parley

## What's New — 1.3

The keyboard is a keyboard now. Next to voice it has a full English layout —
letters, numbers, symbols, hold-to-repeat delete — and the keys you reach for
in the middle of dictating without leaving the mic: return, @, and delete.
Swipe left or right across the keyboard to move between the two.

The globe key is on every device now, so the system Chinese keyboard is one tap
away and holding it opens the picker. SalesHunter Coach does not ship its own Bopomofo
layout; the way out of this keyboard is no longer hidden on some phones.

The keyboard also lines up with the screen. It used to paint its own background
over the system's, which left a seam along the bottom edge and a top corner that
did not match — it now sits in the system's own input view, at the system's own
key metrics.

Transcript text can be selected and copied, while it is still being transcribed
and not only after. Copy one line from its context menu, or the whole transcript
from the toolbar.

And the app looks like Pathors: brand blue, a lighter page, and the type the rest
of Pathors is set in.

## What's New — 1.1

Voice typing comes to the phone. Add the SalesHunter Coach keyboard and dictate into any
app — Messages, Mail, Notes, anything with a text field — using the same
transcription that runs your meetings. Put it on the Action Button and it starts
without a keyboard switch at all.

Also in this release: the app ships in American English
and follows your iPhone's language; a welcome screen explains what an account
gets you before asking for one; and the record button is never dead — if a
session expires it opens sign-in instead of doing nothing.

## What's New — 1.0 (superseded, kept for history)

First release of SalesHunter Coach for iPhone: in-person meeting recording, live
transcription, cloud sync, personal and organization libraries, offline retry,
and account management.

## Notes on the choices here

- **The name carries two search terms.** "SalesHunter Coach" alone tells the App Store
  nothing about what the app is; "SalesHunter Coach: Meeting Recorder" keeps the brand
  first and buys the two words people actually search. If the team would rather
  ship the bare wordmark, use `SalesHunter Coach` and move "meeting recorder" to the front
  of the keyword list.
- **The subtitle does not mention voice typing.** Thirty characters only buys
  one idea, and the recorder is the one the screenshots open on. Voice typing
  leads the promotional text and the What's New instead, where it has room.
- **"What it does not do" is deliberate.** Saying plainly that the app cannot
  record calls costs nothing with buyers who want a meeting recorder, and heads
  off the one-star reviews from people who install it expecting a call recorder.
