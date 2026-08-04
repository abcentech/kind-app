import React from 'react';
import {AbsoluteFill, OffthreadVideo, staticFile, useVideoConfig} from 'remotion';

/**
 * A generated background plate (Veo 3.1 Quality, via Google Flow).
 *
 * Each plate is already conformed to 30fps and to the exact length of its shot, so it plays
 * from frame 0 with no trimming or rate conversion here. That is deliberate: doing it
 * offline means the renderer is not rescaling 720p and resampling frame rates on every
 * frame of every one of the three aspect renders.
 *
 * There are two conformed sets and the aspect picks between them:
 *   plates/prep.sh  → shot<N>_16x9.mp4  1920x1080
 *   plates/prep9.sh → shot<N>_9x16.mp4  1080x1920
 *
 * The vertical set is separately generated in Flow, not cropped out of the landscape one.
 * Centre-cropping a 16:9 plate to 9:16 throws away three quarters of the frame and puts
 * heads against the top edge — the reframing has to happen at generation time. The 1:1
 * render uses the landscape plates with `objectFit: cover`, which is a real crop, but a
 * square crop of 16:9 keeps enough of the middle to hold up.
 *
 * OffthreadVideo rather than Video — it extracts the exact frame with ffmpeg instead of
 * relying on a <video> element's seek accuracy, which is what you want when the picture is
 * cut to measured word onsets.
 *
 * `scrim` darkens the plate under text. The plates were generated with empty space for the
 * lockups, but Veo does not guarantee it frame to frame, and captions have to stay legible
 * over whatever actually turned up.
 */
export const Plate: React.FC<{
  shot: number;
  /** 0 = none. Bottom-weighted gradient, since that is where captions and cards sit. */
  scrim?: number;
  /** Extra push-in on top of whatever camera move the plate already has. */
  scale?: number;
}> = ({shot, scrim = 0, scale = 1}) => {
  const {width, height} = useVideoConfig();
  const variant = height > width ? '9x16' : '16x9';

  return (
  <AbsoluteFill style={{overflow: 'hidden', backgroundColor: '#03060F'}}>
    <AbsoluteFill style={{transform: `scale(${scale})`}}>
      <OffthreadVideo
        src={staticFile(`plates/shot${shot}_${variant}.mp4`)}
        // The plates are silent (prep.sh strips audio) but be explicit: the mix is the
        // three stems in Trailer.tsx and nothing else.
        muted
        style={{width: '100%', height: '100%', objectFit: 'cover'}}
      />
    </AbsoluteFill>
    {scrim > 0 && (
      <AbsoluteFill
        style={{
          background: `linear-gradient(to bottom, rgba(3,6,15,${scrim * 0.35}) 0%, transparent 32%, transparent 52%, rgba(3,6,15,${scrim}) 100%)`,
        }}
      />
    )}
  </AbsoluteFill>
  );
};
