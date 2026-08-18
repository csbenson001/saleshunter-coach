// Seeds the App Review / screenshot account with realistic-looking meetings.
// Content is fictional but written the way real B2B meetings actually sound —
// screenshots should show the product doing its job, not a placeholder.
// No real companies, people, or customer data appear anywhere.
import { readFileSync } from "node:fs";

const TOKEN = readFileSync("/tmp/review-token.txt", "utf8").trim();
const API = "https://api.parley.tw";

const seg = (i, speaker, text, startMs, endMs) => ({
  id: `mix-${i}`,
  source: "mix",
  speaker,
  text,
  isFinal: true,
  startMs,
  endMs,
});

const meetings = [
  {
    id: "a1c9f2e0-4b71-4f28-9c33-6d2b8e5a1074",
    title: "Renewal terms — Northwind",
    daysAgo: 1,
    hour: 14,
    minute: 30,
    durationMs: 27 * 60 * 1000 + 12_000,
    speakerNames: { "mix-1": "Me", "mix-2": "Customer" },
    segments: [
      [1, "I mainly want to pin down the scope of the renewal today. Roughly how many seats will you need next year?", 4_200, 9_800],
      [2, "We're at twelve now. Sales is adding another pod next year, so call it eighteen to twenty.", 10_400, 17_600],
      [1, "Got it. At twenty you land in our Growth plan, which is a tier down on unit price from where you are now.", 18_200, 25_400],
      [2, "Price matters, but I care more about ramp time. The last group of new hires took nearly three weeks to get comfortable.", 26_100, 36_800],
      [1, "This time we can run a two-hour team training, and give you a template for your own internal playbook.", 37_500, 46_900],
      [2, "If the training lands in the first week of January that's ideal, because quarterly targets start the week after.", 47_600, 58_300],
      [1, "First week works. I'll hold the date now. Do you want to stay on annual billing?", 59_000, 67_200],
      [2, "Annual is fine, but we'd like the invoice split into two, it's easier for accounting.", 68_100, 76_400],
      [1, "Two invoices is no problem — half at signature, half in April.", 77_000, 83_600],
      [2, "Then I'll write up the requirements for procurement this week and we can go through the details again next week.", 84_300, 93_100],
      [1, "Good. I'll send the proposal and the training schedule together today.", 94_000, 100_800],
    ],
  },
  {
    id: "b7d4e8a2-91c6-4a55-8e17-3f0c5b9d2e46",
    title: "Discovery call — Halcyon Labs",
    daysAgo: 3,
    hour: 10,
    minute: 15,
    durationMs: 41 * 60 * 1000 + 38_000,
    speakerNames: { "mix-1": "Me", "mix-2": "Customer" },
    segments: [
      [1, "To start with, how do you handle meeting notes today?", 3_800, 9_200],
      [2, "Honestly, there's no system. Reps take their own notes and type them into the CRM later, often two or three days after.", 9_900, 21_400],
      [1, "So if someone leaves in the meantime, the context of those conversations goes with them.", 22_000, 28_600],
      [2, "Exactly, and that's my biggest headache. It happened last month — whoever picked it up had no idea where the deal stood.", 29_300, 40_100],
      [1, "How many customer calls do you run in a week?", 40_800, 45_200],
      [2, "Six reps, three to five calls each, so somewhere around twenty-five a week.", 46_000, 55_800],
      [1, "If all of those had transcripts, and the highlights were pulled out automatically, what would change most for you?", 56_500, 66_300],
      [2, "Managers wouldn't have to ask about every deal. Right now the weekly meeting alone takes an hour and a half just on status.", 67_000, 78_400],
      [1, "Understood. And to roll it out, what does the security review involve?", 79_100, 86_200],
      [2, "A security questionnaire, plus a note on where the data is stored. That's about two weeks.", 87_000, 96_500],
      [1, "No problem, we have those documents ready. I'll set up a trial for the sales team.", 97_200, 107_800],
      [2, "Works for me. Start with two reps — if they find it useful, it'll spread much faster.", 108_500, 118_900],
    ],
  },
];

const dayMs = 24 * 60 * 60 * 1000;

for (const m of meetings) {
  const d = new Date(Date.now() - m.daysAgo * dayMs);
  d.setHours(m.hour, m.minute, 0, 0);
  const createdAt = d.getTime();
  const segments = m.segments.map(([speaker, text, s, e], i) =>
    seg(i, speaker, text, s, e)
  );
  const snippet = segments[0].text;
  const speakers = new Set(segments.map((s) => `${s.source}-${s.speaker}`)).size;

  const summary = {
    id: m.id,
    title: m.title,
    source: "live",
    createdAt,
    durationMs: m.durationMs,
    speakerCount: speakers,
    findingsCount: 0,
    actionItemsCount: 0,
    hasAudio: false,
    snippet,
    folderId: null,
  };
  const meta = {
    id: m.id,
    title: m.title,
    source: "live",
    createdAt,
    durationMs: m.durationMs,
    segments,
    speakerNames: m.speakerNames,
    findings: [],
    actionItems: [],
    meetingContext: "",
    meetingBatna: "",
    meetingTarget: "",
    meetingFloor: "",
    audio: null,
    analyzed: false,
  };

  const res = await fetch(`${API}/recordings/${m.id}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ summary, meta }),
  });
  console.log(res.status, m.title, `${segments.length} segments`);
}
