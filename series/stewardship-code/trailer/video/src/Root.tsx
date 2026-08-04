import React from 'react';
import {Composition} from 'remotion';
import {Trailer} from './Trailer';
import {DURATION_IN_FRAMES, FPS} from './timeline';
import {loadFonts} from './fonts';

// At module scope, so the faces are requested and the render is held before any composition
// mounts. Called from inside a component this would race the first frame.
loadFonts();

/**
 * Three aspects, all NATIVE renders rather than crops — the title lockup and captions
 * reposition per aspect, which a centre crop cannot do.
 *
 * Captions default OFF: the brief wants a clean master for YouTube with the .srt
 * uploaded as a real subtitle track. Render the `-captioned` variants for feeds.
 */
export const RemotionRoot: React.FC = () => {
  const common = {
    component: Trailer,
    durationInFrames: DURATION_IN_FRAMES,
    fps: FPS,
  } as const;

  return (
    <>
      <Composition
        {...common}
        id="Trailer16x9"
        width={1920}
        height={1080}
        defaultProps={{captions: false, silent: false}}
      />
      <Composition
        {...common}
        id="Trailer9x16"
        width={1080}
        height={1920}
        defaultProps={{captions: true, silent: false}}
      />
      <Composition
        {...common}
        id="Trailer1x1"
        width={1080}
        height={1080}
        defaultProps={{captions: true, silent: false}}
      />
    </>
  );
};
