import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {CUES} from '../timeline';
import {TextScrim, WordReveal} from './Kinetic';

/**
 * Burned-in captions for the social cuts. The brief wants a clean uncaptioned master for
 * YouTube (where the .srt is uploaded as a real subtitle track), so this is a prop on the
 * composition rather than always-on.
 *
 * Placement follows the caption spec table in 02-trailer-script.md: bottom-centre for 16:9,
 * upper-middle for 9:16 — vertical crops would otherwise collide with the title cards in
 * the last shot.
 *
 * The reveal itself lives in Kinetic.tsx; see the note there on why the old grey caption
 * box was removed rather than restyled.
 */

/**
 * Words lifted into gold as they land.
 *
 * These are the words the read itself leans on — checked against the delivered VO, not
 * chosen off the page. "servant" and "god" are the hinge of the whole trailer, and the
 * couplet only works if the two halves are weighted equally, so both are in.
 *
 * Matching is on letters only (Kinetic strips punctuation), which is why "god" here covers
 * "god." in the copy.
 */
const EMPHASIS = [
  'master',
  'choose',
  'servant',
  'god',
  'owner',
  'manager',
  'trusted',
  'bury',
  'hands',
  'stewardship',
  'code',
];

/**
 * When the title lockup starts assembling in Sunrise.tsx. Any cue overlapping the end card
 * is dropped from the burned-in captions — keep this in step with the `titleIn` spring
 * there.
 */
const TITLE_IN = 33.9;

export const Captions: React.FC<{vertical?: boolean}> = ({vertical = false}) => {
  const frame = useCurrentFrame();
  const {fps, height, width} = useVideoConfig();
  const t = frame / fps;

  // The four Code names are skipped here on purpose: the Codes scene already renders them
  // as designed title cards on the vault clicks. Captioning them too would stack the same
  // word twice in frame. They stay in CUES because the exported .srt still needs them for
  // accessibility.
  //
  // The end card is skipped for the same reason, and it is not hypothetical: the 9:16 render
  // put "Welcome to The Stewardship Code — Principles of Managing Money." straight across the
  // STEWARDSHIP CODE lockup, so the payoff frame had the title twice, overlapping. 16:9 never
  // showed it because captions are off there by default. Everything the caption would say is
  // already on screen as designed type from 33.9 onward; the .srt still carries the line.
  const cue = CUES.find(
    (c) => t >= c.from && t < c.to && !c.gold && !(c.to > TITLE_IN && c.from < 37.4),
  );
  if (!cue) return null;

  const fontSize = height * (vertical ? 0.038 : 0.045);
  const local = t - cue.from;
  const remaining = cue.to - t;

  // Words land across the first part of the cue, but never slower than the line is spoken:
  // a long caption on a short cue would still be assembling itself as the voice moves on.
  const spread = Math.min(0.62, (cue.to - cue.from) * 0.42);

  return (
    <AbsoluteFill
      style={{
        justifyContent: vertical ? 'flex-start' : 'flex-end',
        alignItems: 'center',
        paddingTop: vertical ? height * 0.3 : 0,
        paddingBottom: vertical ? 0 : height * 0.1,
        paddingLeft: width * 0.06,
        paddingRight: width * 0.06,
        pointerEvents: 'none',
      }}
    >
      <TextScrim
        opacity={Math.min(1, local / 0.18) * Math.min(1, remaining / 0.25)}
        y={vertical ? '24%' : '68%'}
        height={vertical ? '30%' : '34%'}
      />
      <div style={{maxWidth: vertical ? '90%' : '76%', zIndex: 1}}>
        <WordReveal
          text={cue.text}
          t={local}
          remaining={remaining}
          fontSize={fontSize}
          spread={spread}
          emphasis={EMPHASIS}
        />
      </div>
    </AbsoluteFill>
  );
};
