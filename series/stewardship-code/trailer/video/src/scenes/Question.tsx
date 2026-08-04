import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {PALETTE} from '../timeline';
import {Grain, Vignette, rand} from '../components/Atmosphere';
import type {SceneProps} from './props';

/**
 * SHOT 3 — THE QUESTION (0:15.8–0:22.3)
 * "The first question was never 'How much do I have?' It is — 'Whose is it?'"
 *
 * The theological hinge. The room falls away into a starfield and everything he owns
 * is revealed resting in an enormous open hand of light. Audio drops to near-silence
 * here, so the picture gets almost nothing moving in it — the stillness is the point.
 */
export const Question: React.FC<SceneProps> = ({overPlate}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = frame / fps;
  const abs = t + 15.8;
  const u = Math.min(width, height);

  // the room dissolving away
  const room = interpolate(abs, [15.8, 18.2], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // the hand of light arriving underneath everything
  const hand = interpolate(abs, [17.4, 20.4], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // "Whose is it?" — one slow widening breath, no cut
  const wide = interpolate(abs, [20.1, 22.3], [1, 1.08], {extrapolateLeft: 'clamp'});
  const rise = interpolate(abs, [15.8, 22.3], [0, -u * 0.06]);

  return (
    <AbsoluteFill
      style={{background: overPlate ? 'transparent' : '#03060F', overflow: 'hidden'}}
    >
      {/* starfield */}
      {!overPlate && (
      <AbsoluteFill>
        {new Array(140).fill(0).map((_, i) => {
          const s = 1 + rand(i + 3) * 2.4;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: rand(i + 31) * width,
                top: rand(i + 61) * height,
                width: s,
                height: s,
                borderRadius: '50%',
                background: '#EAF0FF',
                opacity:
                  (0.2 + rand(i + 91) * 0.8) *
                  (0.6 + 0.4 * Math.sin(t * 1.4 + i)) *
                  (1 - room * 0.7),
              }}
            />
          );
        })}
      </AbsoluteFill>
      )}

      {/* The plate is the whole shot here — it pulls out from the phone to a giant hand
          of light cradling the city, with a lone figure standing in the palm. That is the
          "you are not the owner" beat, and it reads far better than the drawn version. */}
      {!overPlate && (
      <AbsoluteFill style={{transform: `scale(${wide}) translateY(${rise}px)`}}>
        {/* the open hand of light — a broad cupped glow, deliberately not literal */}
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
          <div
            style={{
              position: 'absolute',
              top: '58%',
              width: u * 1.05,
              height: u * 0.62,
              borderRadius: '50% 50% 46% 46% / 62% 62% 38% 38%',
              background: `radial-gradient(ellipse at 50% 30%, rgba(244,239,228,${
                0.62 * hand
              }) 0%, rgba(240,194,75,${0.34 * hand}) 38%, transparent 70%)`,
              filter: `blur(${u * 0.03}px)`,
            }}
          />
          {/* the palm line the objects rest on */}
          <div
            style={{
              position: 'absolute',
              top: '61%',
              width: u * 0.66,
              height: u * 0.012,
              borderRadius: '50%',
              background: `linear-gradient(90deg, transparent, rgba(244,239,228,${
                0.45 * hand
              }), transparent)`,
              filter: `blur(${u * 0.004}px)`,
            }}
          />
        </AbsoluteFill>

        {/* everything he owns, tiny, resting in it — phone, discs, the whole city */}
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
          <div
            style={{
              position: 'absolute',
              top: '57.2%',
              display: 'flex',
              alignItems: 'flex-end',
              gap: u * 0.026,
              opacity: hand,
            }}
          >
            {/* skyline — silhouetted against the palm light, so it needs to be big
                enough to read as a CITY resting in a hand, not as specks */}
            {[0.075, 0.12, 0.05, 0.098, 0.066].map((h, i) => (
              <div
                key={i}
                style={{
                  width: u * 0.024,
                  height: u * h,
                  background: 'rgba(6,11,24,0.95)',
                  boxShadow: `0 0 ${u * 0.01}px rgba(240,194,75,0.5)`,
                }}
              />
            ))}
            {/* phone */}
            <div
              style={{
                width: u * 0.019,
                height: u * 0.034,
                background: 'rgba(255,236,190,0.95)',
                borderRadius: u * 0.003,
                boxShadow: `0 0 ${u * 0.02}px rgba(240,194,75,0.8)`,
              }}
            />
            {/* blank discs */}
            {[0, 1].map((i) => (
              <div
                key={`d${i}`}
                style={{
                  width: u * 0.022,
                  height: u * 0.008,
                  borderRadius: '50%',
                  background: 'rgba(255,215,120,0.95)',
                  boxShadow: `0 0 ${u * 0.014}px rgba(240,194,75,0.7)`,
                }}
              />
            ))}
          </div>
        </AbsoluteFill>

        {/* the room, dissolving out */}
        <AbsoluteFill style={{opacity: room}}>
          <div
            style={{
              position: 'absolute',
              inset: '18% 14%',
              border: `${u * 0.004}px solid rgba(46,117,182,0.35)`,
              borderRadius: u * 0.01,
              background:
                'linear-gradient(180deg, rgba(31,56,100,0.5), rgba(3,6,15,0.9))',
            }}
          />
        </AbsoluteFill>
      </AbsoluteFill>
      )}

      {/* a single sustained highlight, the visual equivalent of the held string note */}
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
        <div
          style={{
            width: u * 0.5,
            height: u * 0.0025,
            background: `linear-gradient(90deg, transparent, ${PALETTE.cream}, transparent)`,
            opacity:
              0.35 *
              interpolate(abs, [20.1, 20.6, 22.0], [0, 1, 0.2], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
            filter: 'blur(2px)',
          }}
        />
      </AbsoluteFill>

      {/* lighter than the other shots on purpose — this is the one moment of relief,
          and a heavy vignette was crushing the hand of light into the background */}
      <Vignette strength={0.6} />
      <Grain opacity={0.04} />
    </AbsoluteFill>
  );
};
