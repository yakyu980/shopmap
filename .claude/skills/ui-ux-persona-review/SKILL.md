---
name: ui-ux-persona-review
description: >
  Reviews a page/flow of this app (shopmap / SuperNav AI) through several
  roleplaying "persona" sub-agents — a child, an average person, someone who
  doesn't understand technology, an elderly person, and someone giving it a
  quick first-glance skim — who each open the real app in a browser, click
  around, and react in plain, non-technical, human language (never terms
  like "aria-label", "focus-trap", "z-index"). After the user reads the
  persona reactions, a separate design agent turns the complaints into
  concrete design fixes with inspiration from well-known real apps, and only
  after the user explicitly approves does an implementation step touch the
  code. Use this whenever the user wants a UI/UX review "like a real user
  would see it", asks to test the app with different kinds of people/personas,
  says things like "תבדוק את זה כאילו אתה ילד/סבתא/מישהו שלא מבין
  במחשבים", or wants human, non-technical feedback on a screen before
  deciding what to fix. Do NOT use this for a technical code-level review
  (see code-review/ponytail-everything skills for that) — this skill is
  specifically about simulated human reactions, not bug reports.
---

# UI/UX Persona Review

A three-phase loop: **persona feedback → design proposal → implementation**,
with the user in the loop between every phase. Never skip a phase or merge
two phases together without the user asking for it — the whole point of this
skill is that the user reads real, human-sounding reactions *before* anyone
starts talking about fixes, and approves a *design* before any code changes.

## Why this skill exists

Technical QA tools (linters, accessibility scanners, code review) are great
at finding things like "missing aria-label" — but they can't tell you that a
button *feels* untrustworthy, or that a screen is *confusing* to someone in
a hurry, or that a kid would tap the wrong thing because it looks like a
toy. Real human reactions come from different kinds of people noticing
different things for different reasons. This skill simulates that variety on
purpose — five personas that each *judge* the app by a different yardstick —
so the feedback phase reads like actual people talking, not a bug tracker.

## Phase 0 — Establish scope (always, every time)

**Never assume "the whole app" and never silently narrow to "the pages I
already know about."** At the start of every invocation, confirm with the
user (via AskUserQuestion if it's not already obvious from what they just
said) exactly which page, tab, or flow to review this round — e.g. "דף
הבית", "החיפוש עם המצלמה", "כל תהליך ההוספה לרשימה עד תשלום", etc. If they
say "הכל" or "כל האפליקציה", that's a valid answer too — just make it an
explicit choice, not a default you picked yourself.

Also note (briefly, don't interrogate) whether they want the default five
personas or a subset/custom set for this round — default is all five.

## Phase 1 — Persona review (parallel, live browser)

### 1. Get the app running

Start the dev server once, in the current session (not inside a persona
subagent) so every persona hits the same running instance:

```bash
npm run dev &   # or check if already running on the usual port first
```

Confirm it's actually serving (curl or check the log) before spawning
personas — a persona agent that opens a blank/error page will produce
useless, misleading "feedback."

### 2. Spawn one sub-agent per persona, in parallel

For each persona in scope, spawn an `Agent` (subagent_type: `general-purpose`
— it needs Bash to drive a browser, Read to look at screenshots, and no code
tools since it shouldn't be editing anything at this stage) **in the same
message**, so they truly run in parallel. Each persona is an independent
subagent with no memory of this conversation, so brief it fully:

- The dev server URL and exactly which page/tab/flow to test (from Phase 0).
- The persona's character file from `personas/` (read it yourself and paste
  its content into the prompt, or point the subagent at the file path — the
  subagent can Read it directly since it has that tool).
- **Read `references/playwright-quickstart.md` yourself first** — it has the
  exact pattern (Chromium path, how to click/screenshot/read text) to hand
  the subagent so it doesn't have to rediscover Playwright basics.
- Explicit instruction: actually click through the flow like that persona
  would — don't describe the code, describe the *experience*. Take
  screenshots along the way and look at them (multimodal Read) before
  writing the reaction, the same way a real screenshot review would work.
- Output format: a short first-person reaction in the persona's own voice,
  in Hebrew (this app is Hebrew/RTL), covering what they understood, what
  confused them, what they liked, and anything they'd have tapped that
  didn't do what they expected. No jargon — if the persona wouldn't say
  "accessibility" or "contrast ratio," neither should the output.

Adding a new persona later is just adding a new file to `personas/` (see
`personas/TEMPLATE.md`) and including it in the spawn list — nothing else in
this skill needs to change.

### 3. Present the raw reactions, not a summary

When the sub-agents return, show the user each persona's reaction **in full,
in their voice**, clearly separated by persona (e.g. a heading or emoji per
persona). Resist the urge to compress everything into a bullet list of
"issues" at this stage — a large part of the value is hearing five distinct
voices, including the things they liked. A short "themes that came up more
than once" note at the end is fine, but don't replace the raw quotes with it.

End Phase 1 here. Wait for the user to read and react — don't jump ahead to
design proposals unless they ask for it.

## Phase 2 — Design proposal (only when the user asks for it)

Spawn a design-focused agent (or do this inline yourself if it's a small
scope) that:

1. Reads the full persona feedback from Phase 1 as the input — these are the
   real complaints/confusions to address, not a fresh audit.
2. Reads the actual component/CSS code for the page(s) in question, so
   proposals are grounded in what's really there (structure, existing
   classes, the app's own design language) rather than generic advice.
3. For each real complaint, proposes a concrete fix — specific enough that
   implementation could follow it directly (what changes, roughly how).
4. Where it helps illustrate the fix, references a recognizable pattern from
   a well-known existing app (e.g. "empty-state card like X", "bottom sheet
   like Y") and briefly says why that pattern solves the specific complaint
   — this is inspiration/reference, not a mandate to copy another app's
   branding or exact visuals.
5. Explicitly does **not** touch any code in this phase.

Present the proposal to the user and ask for explicit approval — approving
one item doesn't imply approval of all of them; if the user approves some
and not others, only take the approved ones into Phase 3.

## Phase 3 — Implementation (only after explicit approval)

Only now make actual changes: follow this repo's normal engineering
practices (RTL correctness, existing component/CSS patterns, no unrelated
refactors). After implementing, verify in the live browser (reuse the
running dev server) that the change actually addresses what the persona
complained about — a code diff that "should" fix it isn't the same as
confirming it in the running app.

## Notes on scope creep

If mid-review you notice something clearly broken but outside what the user
scoped in Phase 0 (e.g. reviewing the home page surfaces a bug on the search
page), mention it briefly as an aside — don't silently expand the review to
cover it, and don't silently skip it either. Let the user decide whether to
fold it in.
