/**
 * Generates the .srt files from the CUES array in src/timeline.ts.
 *
 * This exists because the caption files drifted out of sync with the picture once
 * already: they were written against the 45s script while the delivered read is 37.4s,
 * and separately the fourth Code name was half a second late. Deriving them from the
 * same array the renderer uses makes that class of bug impossible.
 *
 *     node scripts/make-srt.mjs
 */
import {readFileSync, writeFileSync, mkdirSync} from 'fs';
import {dirname, join} from 'path';
import {fileURLToPath} from 'url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');

const src = readFileSync(join(ROOT, 'src/timeline.ts'), 'utf8');

// Pull the CUES array out of the TS source. A regex is fine here — the array is a flat
// list of object literals and this script fails loudly if the shape ever changes.
const block = src.match(/export const CUES: Cue\[\] = \[([\s\S]*?)\n\];/);
if (!block) throw new Error('Could not find CUES in src/timeline.ts');

// Both quote styles: one cue contains an apostrophe and is written with double quotes.
const cues = [...block[1].matchAll(
  /\{from:\s*([\d.]+),\s*to:\s*([\d.]+),\s*text:\s*(['"])((?:[^\\]|\\.)*?)\3(?:,\s*gold:\s*true)?\}/g
)].map((m) => ({
  from: parseFloat(m[1]),
  to: parseFloat(m[2]),
  text: m[4].replace(/\\n/g, '\n').replace(/\\(['"])/g, '$1'),
}));

// Count the entries independently and insist the parse got all of them. The first
// version of this regex silently dropped the one double-quoted cue and emitted 13 of
// 14 — a missing caption is exactly the kind of thing nobody notices until air.
const declared = (block[1].match(/\{from:/g) || []).length;
if (cues.length !== declared) {
  throw new Error(`Parsed ${cues.length} cues but CUES declares ${declared}`);
}

const stamp = (s) => {
  const ms = Math.round(s * 1000);
  const h = String(Math.floor(ms / 3600000)).padStart(2, '0');
  const m = String(Math.floor(ms / 60000) % 60).padStart(2, '0');
  const sec = String(Math.floor(ms / 1000) % 60).padStart(2, '0');
  return `${h}:${m}:${sec},${String(ms % 1000).padStart(3, '0')}`;
};

/** Re-wrap to a max line length, preserving deliberate breaks already in the cue. */
const wrap = (text, max) =>
  text
    .split('\n')
    .flatMap((line) => {
      const words = line.split(' ');
      const out = [];
      let cur = '';
      for (const w of words) {
        if (cur && (cur + ' ' + w).length > max) {
          out.push(cur);
          cur = w;
        } else {
          cur = cur ? cur + ' ' + w : w;
        }
      }
      if (cur) out.push(cur);
      return out;
    })
    .join('\n');

const build = (max) =>
  cues
    .map((c, i) => `${i + 1}\n${stamp(c.from)} --> ${stamp(c.to)}\n${wrap(c.text, max)}\n`)
    .join('\n');

mkdirSync(join(ROOT, 'out'), {recursive: true});
// 42 chars for 16:9, 26 for 9:16 — the caption spec table in 02-trailer-script.md
writeFileSync(join(ROOT, 'out/stewardship-trailer.srt'), build(42), 'utf8');
writeFileSync(join(ROOT, 'out/stewardship-trailer-vertical.srt'), build(26), 'utf8');

console.log(`wrote 2 srt files from ${cues.length} cues`);
