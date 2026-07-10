# gDx Monthly Devotional

A content production system for monthly discipleship devotionals. One biblical theme becomes a complete teaching series plus every content format needed to publish it across platforms.

**Mission:** Every devotional helps believers *know Christ, grow in Christ, live for Christ, and finish well.*

---

## How this repository is organized

```
Monthly Devotional/
├── README.md                     ← you are here
├── framework/                    ← the reusable production system (theme-agnostic)
│   ├── production-system.md      The 5-layer framework + teaching formula + content ecosystem
│   ├── writing-standards.md      Editorial standards every devotional must meet
│   └── style-guide.md            Voice, formatting, and the episode template (the canon)
│
├── series/
│   └── secrets-of-longevity/     ← the first series (this month's theme)
│       ├── 00-series-overview.md     Theme, Five F's, episode map
│       ├── 00-introduction.md        The 1-minute introduction episode
│       ├── week-1-foundation/        Episodes 1–3
│       ├── week-2-faith/             Episodes 4–8
│       ├── week-3-focus/             Episodes 9–13
│       ├── week-4-fitness/           Episodes 14–18
│       ├── week-5-finishing/         Episodes 19–23
│       ├── shorts/                   Companion 60-second Shorts (one per episode)
│       └── discussion-guides/        Small-group / family discussion guides
│
└── .claude/skills/devotional/    ← the reusable Skill (run /devotional to build a new month)
```

Each **episode file** is self-contained and follows the full episode template in
[style-guide.md](framework/style-guide.md): Hook → Scripture → Big Idea → Teaching →
Biblical Example → Illustration → Application → Prayer → Challenge → Companion Short →
Longevity Insight → Multiplication notes.

---

## The teaching formula

Every lesson moves through the same invisible-but-consistent arc:

> **Hook → Scripture → Revelation → Illustration → Application → Prayer → Challenge → Short**

And every lesson answers four questions:

1. **What does God say?** *(Scripture)*
2. **What does it mean?** *(Interpretation)*
3. **What does it look like?** *(Illustration)*
4. **What must I do?** *(Application)*

---

## Producing a new month

Run the Skill and give it a theme:

```
/devotional theme: "Walking in Wisdom"
```

The Skill walks through the framework, proposes a journey + weekly framework + episode
map, then drafts content to the same standard as this series. See
[.claude/skills/devotional/SKILL.md](.claude/skills/devotional/SKILL.md).
