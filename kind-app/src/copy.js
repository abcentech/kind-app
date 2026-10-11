// KIND v7 "Ascent" · copy.js — the app's voice.
//
// Reverent, confident, spare. Short declaratives. Praise comes from the Word, not from a cartoon.
// Nigerian English (labour, colour, honour, programme) and West Africa Time: times are the device clock,
// written "8:00 pm", with "WAT" appended only when the device really is on UTC+1 (see zoneTag).
//
// HOW THIS FILE WORKS
//   • Pure. No React, no store, no clock: callers pass in everything (use now() from ./now.js, never new Date()).
//   • Deterministic. Anything that varies is picked by pick(list, seed): the same seed always returns the same
//     line, so text never flickers on a re-render. Pass seq(key, i) as the seed to walk a list with no repeat
//     inside one cycle (e.g. seq(`${series.id}:${day}`, exerciseIndex) for answer verdicts).
//   • A "Line" is { text, ref? }. When `ref` is present, `text` is a Bible quotation: set it in the serif face
//     and put the reference beneath it in mono. Everything else is plain.
//   • Functions that fill a slot return plain objects of strings, never JSX, so any screen can lay them out.
//   • Rules (enforced by tools/test-copy.mjs): no emoji; no "!!"; "!" only on genuine milestones; no ALL-CAPS
//     body copy (write sentence case: the Label component uppercases labels in CSS); no shaming words.
//   • Typographic punctuation throughout (’ “ ” — …). Never straight quotes.

// The implementation lives in src/copy/core.js (eager) and src/copy/more.js (lazy screens). This file is the public barrel:
// import from here anywhere; Rollup resolves each name to the module that defines it, so lazy strings stay out of the first load.
export { hash, seedOf, seq, pick, plain, fmtNum, fmtDate, fmtClock, zoneTag, tMinus, wordsDuration, timeLeft, minsLabel, minsWords, xpDelta, stageTag, daysWord, BIBLE_VERSION, praise, shieldLine, rewardCopy, ringLabels, ringCopy, objectives, UNLOCK_HOUR, launchBarCopy, catchUpCopy, lockedCopy, noticeCopy, DEFAULT_REMINDER, reminderCopy, SHARE_TAGS, TAGLINE, shareCaption, onboardCopy, toastCopy, errorCopy, labels, aria } from './copy/core.js'
export { fmtDateLong, tPlus, xpTotal, dayTag, WORD, partOfDay, seasonOf, greeting, verdictRight, verdictWrong, answerLabel, lessonCopy, launchSequence, flightCallout, slideLabel, journalPlaceholder, checkHint, streakLine, MILESTONES, isMilestone, milestoneCopy, streakLostCopy, rankUpCopy, completionCopy, ledgerCopy, chestCopy, dropCopy, dropChrome, monthCompleteCopy, stageClearCopy, nextUpCopy, rankLine, nextMilestoneCopy, streakStatus, reminderPresets, reminderChrome, emptyCopy, GOALS, goalCopy, settingsHelp, glossary, toastIds, installCopy, coach, missionMeta, POOLS } from './copy/more.js'
