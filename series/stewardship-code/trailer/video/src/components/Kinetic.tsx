import React from 'react';
import {interpolate, spring, useVideoConfig} from 'remotion';
import {PALETTE} from '../timeline';
import {DISPLAY} from '../fonts';

/**
 * Kinetic type for the trailer.
 *
 * The first pass cross-faded whole caption blocks in and out inside a grey rounded box.
 * It was legible and completely inert — the text just appeared, while the picture
 * underneath was moving. Two problems, and they have different fixes.
 *
 * MOVEMENT: type now arrives a word at a time on a stagger, each word springing up from
 * below through a blur. Words land at roughly the rate they are spoken, so the caption
 * feels driven by the voice rather than switched on beside it.
 *
 * LEGIBILITY: the box is gone. A box over a rendered plate reads as a subtitle burned onto
 * someone else's film. What replaced it is a soft elliptical scrim behind the text plus a
 * double shadow — one tight and black for edge contrast, one wide and warm so the type sits
 * in the plate's own light instead of on top of it.
 */

/**
 * Specular falloff for a letter sitting at `pos` (0..1 across its line) given the current
 * position of a sweep head. Returns 1.0 where the light is, falling off either side.
 *
 * Per-letter rather than a CSS `background-clip: text` gradient across the parent. The
 * letters already carry their own springs, opacity and transforms, and a clipped gradient
 * fights all three — quite apart from being fragile once the children are transformed. Plain
 * maths per letter is also deterministic, which matters because Remotion rasterises every
 * frame independently and anything stateful flickers between them.
 */
export const gleam = (pos: number, sweep: number, width = 0.22) => {
  const d = (pos - sweep) / width;
  return Math.exp(-d * d);
};

/** Gentle standing wave along a line. The caller applies the amplitude. */
export const ripple = (pos: number, t: number) => Math.sin(t * 2.1 - pos * 4.2);

/**
 * Blend two `#rrggbb` colours. Only used to lift a letter toward white under the gleam, so
 * it takes the simple path and assumes 6-digit hex — the two call sites both pass literals.
 */
export const mix = (a: string, b: string, amount: number) => {
  const hex = (s: string) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
  const [r1, g1, b1] = hex(a);
  const [r2, g2, b2] = hex(b);
  const k = Math.max(0, Math.min(1, amount));
  const c = (x: number, y: number) => Math.round(x + (y - x) * k);
  return `rgb(${c(r1, r2)},${c(g1, g2)},${c(b1, b2)})`;
};

/** Deterministic per-word jitter. Math.random() would resample every frame and shimmer. */
const jitter = (i: number) => {
  const v = Math.sin(i * 78.233 + 12.9898) * 43758.5453;
  return (v - Math.floor(v)) * 2 - 1;
};

/**
 * Text revealed word by word.
 *
 * `emphasis` words are picked out in gold. They are matched on the stripped word — the copy
 * contains "servant." and "god." with punctuation attached, and requiring the caller to
 * write the punctuation into the emphasis list is the kind of coupling that silently stops
 * working the first time a line is reworded.
 */
export const WordReveal: React.FC<{
  text: string;
  /** Seconds since the cue opened. */
  t: number;
  /** Seconds until the cue closes — drives the exit. */
  remaining: number;
  fontSize: number;
  /** Total seconds over which all words should have landed. */
  spread?: number;
  emphasis?: string[];
  align?: 'center' | 'left';
  color?: string;
}> = ({
  text,
  t,
  remaining,
  fontSize,
  spread = 0.5,
  emphasis = [],
  align = 'center',
  color = '#FFFFFF',
}) => {
  const {fps} = useVideoConfig();
  // Deliberate line breaks in the copy are kept; each line is its own flex row so a long
  // caption cannot reflow mid-reveal and shuffle words that have already landed.
  const lines = text.split('\n').map((l) => l.split(' ').filter(Boolean));
  const total = lines.reduce((n, l) => n + l.length, 0);
  const strip = (w: string) => w.replace(/[^A-Za-z']/g, '').toLowerCase();
  const hot = new Set(emphasis.map(strip));

  // The whole block leaves together — staggering the exit as well reads as indecision.
  const out = interpolate(remaining, [0, 0.22], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  let n = -1;
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: align === 'center' ? 'center' : 'flex-start',
        gap: fontSize * 0.14,
        opacity: out,
      }}
    >
      {lines.map((words, li) => (
        <div
          key={li}
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: align === 'center' ? 'center' : 'flex-start',
            gap: `0 ${fontSize * 0.28}px`,
          }}
        >
          {words.map((w, wi) => {
            n += 1;
            const delay = total > 1 ? (n / total) * spread : 0;
            const e = spring({
              frame: (t - delay) * fps,
              fps,
              config: {damping: 200, mass: 0.42, stiffness: 120},
            });
            const isHot = hot.has(strip(w));
            return (
              <span
                key={wi}
                style={{
                  display: 'inline-block',
                  fontFamily: DISPLAY,
                  fontWeight: 900,
                  fontSize,
                  lineHeight: 1.16,
                  color: isHot ? PALETTE.goldHot : color,
                  letterSpacing: fontSize * (isHot ? 0.03 : 0.005),
                  opacity: e,
                  // Rise, settle, and a touch of horizontal drift so the words do not
                  // march in on a perfect grid.
                  transform: `translate3d(${jitter(n) * fontSize * 0.06 * (1 - e)}px, ${
                    (1 - e) * fontSize * 0.55
                  }px, 0) scale(${0.94 + 0.06 * e})`,
                  filter: `blur(${(1 - e) * fontSize * 0.06}px)`,
                  textShadow: [
                    `0 ${fontSize * 0.03}px ${fontSize * 0.12}px rgba(0,0,0,0.92)`,
                    `0 0 ${fontSize * 0.5}px rgba(0,0,0,0.75)`,
                    isHot ? `0 0 ${fontSize * 0.55}px rgba(240,194,75,0.6)` : '',
                  ]
                    .filter(Boolean)
                    .join(', '),
                  whiteSpace: 'pre',
                }}
              >
                {w}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

/**
 * The soft scrim that replaced the caption box. An ellipse, not a rectangle: it has no
 * visible edge anywhere, so over a bright plate it reads as the picture darkening rather
 * than as a panel being laid over it.
 */
export const TextScrim: React.FC<{opacity: number; y: string; height: string}> = ({
  opacity,
  y,
  height,
}) => (
  <div
    style={{
      position: 'absolute',
      left: '-10%',
      width: '120%',
      top: y,
      height,
      background:
        'radial-gradient(ellipse at 50% 50%, rgba(3,6,15,0.82) 0%, rgba(3,6,15,0.5) 45%, transparent 72%)',
      opacity,
      pointerEvents: 'none',
    }}
  />
);

/**
 * The four Code names — letter by letter, on a much harder curve than the captions.
 *
 * This is the vault shot, so the letters behave like tumblers rather than like speech: each
 * one drops the last few pixels into place with a stiff spring and no blur, close enough
 * together to read as one mechanical action. A rule wipes out underneath on the same beat.
 */
export const CodeLockup: React.FC<{
  label: string;
  /** Seconds since the click landed. */
  t: number;
  fontSize: number;
  /** Index 0-3. The fourth Code is the payoff and is given more weight. */
  index: number;
  /**
   * Set when the shot behind is a bright plate.
   *
   * The first render of this had gold type over the vault plate and FAITHFULNESS was
   * effectively invisible — gold letters on a frame that is almost entirely blazing gold.
   * Over a plate the fill goes to warm cream and the gold moves into the glow behind the
   * letter, which keeps the shot's colour without asking gold to separate from gold.
   */
  onBright?: boolean;
}> = ({label, t, fontSize, index, onBright = false}) => {
  const {fps} = useVideoConfig();
  const chars = label.split('');
  const last = index === 3;
  const fill = onBright ? '#FFF8E8' : PALETTE.goldHot;

  // Per-letter stagger, tight: the whole word is seated in about a fifth of a second.
  const per = 0.014;
  const rule = spring({
    frame: (t - 0.1) * fps,
    fps,
    config: {damping: 200, mass: 0.6, stiffness: 90},
  });

  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
      <div style={{display: 'flex'}}>
        {chars.map((c, i) => {
          const e = spring({
            frame: (t - i * per) * fps,
            fps,
            // Stiff and barely damped — it arrives with a tick, like a lock seating.
            config: {damping: 12, mass: 0.32, stiffness: 260},
          });
          return (
            <span
              key={i}
              style={{
                display: 'inline-block',
                fontFamily: DISPLAY,
                fontWeight: 900,
                fontSize,
                letterSpacing: fontSize * 0.16,
                color: fill,
                opacity: Math.min(1, e * 1.4),
                // Overshoot is intentional: the spring passes 1 and settles back, which is
                // what gives the letter its click.
                transform: `translateY(${(1 - e) * -fontSize * 0.16}px) scale(${
                  0.86 + 0.14 * e
                })`,
                // Over a plate the black shadow does the separating and the gold becomes a
                // halo. A single soft shadow was not enough against a blown-out gold
                // background, so this is a tight ring plus a wide one.
                textShadow: onBright
                  ? [
                      `0 0 ${fontSize * 0.06}px rgba(20,10,0,0.95)`,
                      `0 ${fontSize * 0.03}px ${fontSize * 0.14}px rgba(20,8,0,0.95)`,
                      `0 0 ${fontSize * 0.5}px rgba(60,26,0,0.85)`,
                      `0 0 ${fontSize * 0.22}px rgba(255,206,110,${0.6 + (last ? 0.3 : 0)})`,
                    ].join(', ')
                  : `0 0 ${fontSize * 0.28}px rgba(240,194,75,${
                      0.55 + (last ? 0.35 : 0)
                    }), 0 ${fontSize * 0.04}px ${fontSize * 0.1}px rgba(0,0,0,0.95)`,
              }}
            >
              {c}
            </span>
          );
        })}
      </div>
      {/* The rule. Grows from the centre outward on the click, gold and thin. */}
      <div
        style={{
          marginTop: fontSize * 0.34,
          width: `${rule * 100}%`,
          height: Math.max(1, fontSize * 0.028),
          background: `linear-gradient(90deg, transparent, ${PALETTE.goldHot}, transparent)`,
          opacity: 0.5 + (last ? 0.4 : 0.2),
          boxShadow: `0 0 ${fontSize * 0.22}px rgba(240,194,75,0.7)`,
        }}
      />
    </div>
  );
};
