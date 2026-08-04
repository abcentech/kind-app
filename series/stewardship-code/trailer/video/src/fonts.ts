import {continueRender, delayRender, staticFile} from 'remotion';

/**
 * The trailer's typefaces — Nunito for display, Fraunces for the italic line.
 *
 * These are the KIND app's own brand fonts, lifted from kind-app (see its styles.css:
 * "Fraunces (display & scripture) · Nunito (UI)"). That settles two things at once: the
 * trailer now looks like the product it is advertising, and the last open licence item in
 * the brief is closed — both faces are SIL Open Font License, already shipping in the app,
 * so nothing new has to be cleared.
 *
 * Previously this was `Arial Black, Arial, sans-serif` — a system fallback that renders as
 * a different face on every machine and would have differed between my render and anyone
 * else's.
 *
 * Loaded by hand rather than with @remotion/fonts because the Remotion version here is
 * pinned to 4.0.246 to match a known-good project, and adding a dependency mid-build is a
 * worse risk than eight lines of @font-face.
 */

const FACES = [
  {family: 'Nunito', weight: '900', style: 'normal', file: 'nunito-900.woff2'},
  {family: 'Nunito', weight: '700', style: 'normal', file: 'nunito-700.woff2'},
  {family: 'Fraunces', weight: '600', style: 'normal', file: 'fraunces-600.woff2'},
  {family: 'Fraunces', weight: '400', style: 'italic', file: 'fraunces-400-italic.woff2'},
];

/** Display face — headlines, captions, the title lockup. */
export const DISPLAY = 'Nunito, "Arial Black", Arial, sans-serif';
/** Serif face — the one italic subtitle line under the title. */
export const SERIF = 'Fraunces, Georgia, serif';

let started = false;

/**
 * Register the faces and hold the render until the browser reports them ready.
 *
 * The delayRender handle is the important part. Without it Remotion happily rasterises
 * frame 0 while the woff2 files are still in flight, so the first frames of a render come
 * out in the fallback face and the rest come out in Nunito — a defect that only shows up
 * in the finished file, never in the studio, because by then the fonts are cached.
 */
export const loadFonts = () => {
  if (started || typeof document === 'undefined') return;
  started = true;

  const style = document.createElement('style');
  style.textContent = FACES.map(
    (f) => `@font-face{font-family:'${f.family}';font-style:${f.style};font-weight:${f.weight};font-display:block;src:url('${staticFile(
      `fonts/${f.file}`
    )}') format('woff2');}`
  ).join('\n');
  document.head.appendChild(style);

  const handle = delayRender('Loading Nunito and Fraunces');
  Promise.all(
    FACES.map((f) => document.fonts.load(`${f.style} ${f.weight} 64px ${f.family}`))
  )
    .then(() => continueRender(handle))
    // Never hang a render on a font. Falling back to Arial is a visible flaw; a render
    // that never finishes is a broken build.
    .catch(() => continueRender(handle));
};
