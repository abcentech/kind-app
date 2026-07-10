---
name: devotional
description: Produce a complete gDx Monthly Devotional series from one biblical theme — a full journey, weekly framework, daily episodes, companion Shorts, and a compiled master document. Use when the user wants to build a new month's devotional, start a new teaching series, draft episodes/Shorts, or asks to "make a devotional", "new month", "build a series", or names a monthly theme (e.g. "Walking in Wisdom", "The Fear of the Lord").
---

# gDx Monthly Devotional

Turn **one monthly theme** into a complete discipleship resource: a teaching journey
plus every content format needed to publish it. One series = 20–25 episodes, a matching
Short for each, written devotionals, discussion prompts, and a compiled master document —
all reinforcing one message.

**Mission:** every devotional helps believers *know Christ, grow in Christ, live for
Christ, and finish well.*

## Read these first (the canon)

Before writing anything, read the framework so the new series matches house style:

- `framework/production-system.md` — the 5-layer system, teaching formula, content ecosystem
- `framework/writing-standards.md` — editorial + theological guardrails (non-negotiable)
- `framework/style-guide.md` — **the episode template, voice, and file naming (follow exactly)**

For a finished reference series to imitate for depth and cadence, read:
`series/secrets-of-longevity/week-1-foundation/episode-01-life-is-authored-by-god.md`
(the gold-standard exemplar) and `series/secrets-of-longevity/00-series-overview.md`.

## Workflow

### 1. Lock the theme & journey
Confirm the theme with the user (or take it from their prompt). Then design a **journey**,
not a list — each week is a step the audience travels through. Propose:
- A theme Scripture (one primary verse) and a memory verse.
- A **weekly framework** of 4–5 memorable, alliterative or parallel words a child could
  repeat (e.g. Foundation · Faith · Focus · Fitness · Finishing; or Believe · Become ·
  Build · Bless · Be Faithful).
- An **episode map** (20–25 episodes) — each episode = one step, with its key Scripture.

Show the user this overview and get a thumbs-up before drafting all episodes. Use
`AskUserQuestion` only if the theme or scope is genuinely ambiguous.

### 2. Scaffold the files
Create under `series/<kebab-theme>/`:
```
00-series-overview.md      theme, weekly framework, episode map, ecosystem, memory verse
00-introduction.md         the 1-minute opener episode
week-1-<theme>/ … week-N-<theme>/   episode-NN-<kebab-title>.md
shorts/                    short-NN-<kebab-title>.md (one per episode)
discussion-guides/         (optional) one per episode or per week
```
Follow naming in `framework/style-guide.md`. Numbers are zero-padded and stay aligned
across an episode, its Short, and its discussion guide.

### 3. Write canonical Week 1 yourself
Write the introduction + all of Week 1 to **full template depth** (every section in the
style guide, including the Companion Short and the recurring Insight feature). These set
the standard and become the exemplar for parallel drafting.

### 4. Draft the remaining weeks in parallel
Dispatch one subagent per remaining week via the `Agent` tool (run them concurrently in a
single message). Give each agent: the paths to the three framework docs + the Week 1
exemplar to read, its week's episode outlines, the shared weekly challenge, the exact
output file paths, and the instruction to **match Episode 1's section order and cadence
exactly**. Have each agent write its episode files *and* the standalone Short files.

### 5. Verify
Glob the series folder; confirm every episode + Short exists. Spot-read one mid-series
episode and the finale for template fidelity, KJV accuracy, Christ-centeredness, and no
prosperity distortion (see `writing-standards.md`).

### 6. Compile the master document
Build a single polished `.docx`: title page → table of contents → series overview →
introduction → all episodes (each starting a new page; Companion Shorts stay embedded).
Reuse/adapt the build script pattern in this repo (docx-js, US-Letter, Georgia body /
Arial headings, navy+gold theme, TOC field, header/footer). After building, verify the
docx is well-formed (unpack the zip and XML-parse each part) and that key strings appear.

## The episode template (summary — full spec in style-guide.md)

```
# EPISODE N / ## Title  ·  > Series: <name> — Week n: <Week Theme>
Key Scripture (KJV) → Hook → Big Idea → Why This Matters →
Teaching (3–5 points: explanation + Supporting Scriptures + Application) →
Biblical Example → Illustration → Application ("What should I do today?") →
Reflection Questions → Prayer → Weekly Challenge → <Theme> Insight →
🎬 Companion Short (Hook · Scripture · Truth · Challenge) → Multiplication notes
```

## Guardrails (from writing-standards.md)

- **KJV** Scripture, quoted accurately with book/chapter/verse. One primary passage per
  episode (two max).
- **Christ central**, always — not a closing line. Move from revelation to application;
  end with hope and action.
- **No prosperity distortion**: God's promises serve His purpose and glory, not human
  comfort or accumulation. Hold both a long life lived for God *and* the eternal value of
  any life in Christ.
- Speak to children, youth, adults, and elders at once. Practical before inspirational.
- Companion Short is a **fresh hook**, never a summary.

## Output

When done, report: the series name, the weekly framework, episode + Short counts, and the
path to the master `.docx`.
