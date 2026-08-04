import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useVideoConfig} from 'remotion';
import {DURATION_IN_FRAMES, SHOTS, sec} from './timeline';
import {Lock} from './scenes/Lock';
import {Chains} from './scenes/Chains';
import {Question} from './scenes/Question';
import {Codes} from './scenes/Codes';
import {Work} from './scenes/Work';
import {Sunrise} from './scenes/Sunrise';
import {Captions} from './components/Captions';
import {Plate} from './components/Plate';
import type {SceneProps} from './scenes/props';

const SCENES: Record<string, React.FC<SceneProps>> = {
  lock: Lock,
  chains: Chains,
  question: Question,
  codes: Codes,
  work: Work,
  sunrise: Sunrise,
};

/**
 * Which shots have a generated plate behind them, and how much scrim that plate needs.
 *
 * All six 16:9 plates exist (Veo 3.1 Quality via Google Flow — see
 * ../03-FLOW-SHOTLIST-FINAL.md), conformed by plates/prep.sh. Any entry removed from this
 * map falls straight back to the all-code render of that shot, which is why the scenes kept
 * both paths: a plate that gets rejected in review is a one-line change here, not a rebuild.
 *
 * The 9:16 set (plates/prep9.sh) is separately generated on Omni Flash and covers shots 1-5.
 * `Plate` picks the variant off the composition's aspect; this map is shared by both.
 *
 * SHOT 6 IS DELIBERATELY EXCLUDED IN VERTICAL — see VERTICAL_PLATES below.
 *
 * Scrim is per shot rather than global. Shot 6 needs the most — the title lockup lands in a
 * sky that Veo filled with a very bright sun, and 'THE STEWARDSHIP CODE' in cream over
 * blown-out white would not read. The two dark shots need none at all.
 */
const PLATES: Record<string, {shot: number; scrim: number}> = {
  lock: {shot: 1, scrim: 0},
  chains: {shot: 2, scrim: 0},
  question: {shot: 3, scrim: 0.25},
  codes: {shot: 4, scrim: 0.45},
  work: {shot: 5, scrim: 0.3},
  sunrise: {shot: 6, scrim: 0.5},
};

/**
 * Shots with a usable native 9:16 plate.
 *
 * Sunrise is absent on purpose. There is no native vertical generation of the rooftop, and
 * deriving one from the landscape plate does not work: cropping 16:9 to 9:16 magnifies that
 * plate's push-in until the raised gold disc fills the top of frame — exactly where
 * 'THE STEWARDSHIP CODE' has to sit. Freezing the move earlier just picks a different frame
 * with the same disc in the same place, and it is a 2.7x upscale on top of that. Three
 * conform attempts confirmed it before this call was made; the sheets are in plates/qc.
 *
 * The code-rendered sunrise is sharp at 1080x1920 and was composed with empty sky for the
 * lockup, so vertical falls back to it. It is a visible style break at the payoff and the
 * real fix is a native 9:16 generation — add 'sunrise' here once shot6_9x16.mp4 is one.
 */
const VERTICAL_PLATES = new Set(['lock', 'chains', 'question', 'codes', 'work']);

export type TrailerProps = {
  /** Burn captions into the picture. Off for the YouTube master (upload the .srt
   *  instead), on for the muted-autoplay social cuts. */
  captions: boolean;
  /** Drop every audio track for the silent/textless deliverable. */
  silent: boolean;
};

// Stem balance. The VO is the anchor and is never ducked by more than these fixed
// offsets — the score and SFX were composed around the voice, so no dynamic
// ducking is needed. Levels verified against the per-second RMS in
// audio/synth.py's cue sheet.
// Absolute values, not just ratios: at VO 1.0 the mixdown measured -10.6 LUFS, which
// YouTube would simply turn down by 3.5 dB, and it left only 0.2 dB of peak headroom.
// These land the finished mix at -14.5 LUFS / -1.0 dBFS true peak. Verified by
// pre-mixing the three stems with ffmpeg and measuring, rather than by re-rendering.
const VO_GAIN = 0.635;
const MUSIC_GAIN = 0.267;
const SFX_GAIN = 0.368;

export const Trailer: React.FC<TrailerProps> = ({captions, silent}) => {
  const {height, width} = useVideoConfig();
  const vertical = height > width;

  return (
    <AbsoluteFill style={{backgroundColor: '#03060F'}}>
      {!silent && (
        <>
          <Audio src={staticFile('music.m4a')} volume={MUSIC_GAIN} />
          <Audio src={staticFile('sfx.m4a')} volume={SFX_GAIN} />
          {/* VO last so it sits on top of the bed in the mixdown */}
          <Audio src={staticFile('vo.m4a')} volume={VO_GAIN} />
        </>
      )}

      {SHOTS.map((shot) => {
        const Scene = SCENES[shot.id];
        const plate =
          vertical && !VERTICAL_PLATES.has(shot.id) ? undefined : PLATES[shot.id];
        return (
          <Sequence
            key={shot.id}
            from={sec(shot.from)}
            durationInFrames={sec(shot.to) - sec(shot.from)}
            name={shot.id}
          >
            {plate && <Plate shot={plate.shot} scrim={plate.scrim} />}
            <Scene overPlate={Boolean(plate)} />
          </Sequence>
        );
      })}

      {captions && <Captions vertical={vertical} />}
    </AbsoluteFill>
  );
};

export const TRAILER_DURATION = DURATION_IN_FRAMES;
