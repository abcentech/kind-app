import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {PALETTE} from '../timeline';
import {Grain, Motes, Vignette} from '../components/Atmosphere';
import type {SceneProps} from './props';

/**
 * SHOT 5 — PUT IT TO WORK (0:27.4–0:32.0)
 * "Be faithful in the little. Don't bury what He puts in your hands."
 *
 * Stewardship isn't only freedom FROM — it's freedom FOR. A fast montage of small
 * faithful actions, each leaving a thread of gold light that gathers upward. The cuts
 * are on a steady ~0.55s pulse so the picture feels percussive under the line.
 */

type Vignette5 = {label: string; draw: (u: number) => React.ReactNode};

// Each panel is drawn as simple geometry — a notebook, a broom, a hand giving, a
// sketched design, a seedling. Deliberately iconic rather than illustrative: at 0.55s
// per beat there is no time to read detail.
const PANELS: Vignette5[] = [
  {
    label: 'counting honestly',
    draw: (u) => (
      <>
        <div
          style={{
            width: u * 0.26,
            height: u * 0.19,
            background: '#101B33',
            borderRadius: u * 0.008,
            border: `${u * 0.003}px solid rgba(240,194,75,0.5)`,
          }}
        />
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: '38%',
              top: `${44 + i * 8}%`,
              width: u * (0.13 - i * 0.03),
              height: u * 0.006,
              background: 'rgba(240,194,75,0.65)',
            }}
          />
        ))}
      </>
    ),
  },
  {
    label: 'working',
    draw: (u) => (
      <>
        <div
          style={{
            width: u * 0.008,
            height: u * 0.24,
            background: 'rgba(240,194,75,0.75)',
            transform: 'rotate(18deg)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: '58%',
            top: '62%',
            width: u * 0.09,
            height: u * 0.05,
            background: 'rgba(184,134,11,0.55)',
            borderRadius: `0 0 ${u * 0.01}px ${u * 0.01}px`,
            transform: 'rotate(18deg)',
          }}
        />
      </>
    ),
  },
  {
    label: 'giving',
    draw: (u) => (
      <>
        {/* one blank disc passing from one open palm to another */}
        <div
          style={{
            width: u * 0.05,
            height: u * 0.017,
            borderRadius: '50%',
            background: 'linear-gradient(180deg, #F0C24B, #8A6208)',
            boxShadow: `0 0 ${u * 0.03}px rgba(240,194,75,0.8)`,
          }}
        />
        {[-1, 1].map((s) => (
          <div
            key={s}
            style={{
              position: 'absolute',
              left: `calc(50% + ${s * u * 0.11}px)`,
              top: '54%',
              width: u * 0.12,
              height: u * 0.035,
              marginLeft: -u * 0.06,
              borderRadius: `0 0 ${u * 0.06}px ${u * 0.06}px`,
              background: '#0C1428',
            }}
          />
        ))}
      </>
    ),
  },
  {
    label: 'building',
    draw: (u) => (
      <>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${42 + i * 6}%`,
              top: `${58 - i * 9}%`,
              width: u * 0.05,
              height: u * 0.05,
              border: `${u * 0.003}px solid rgba(240,194,75,0.7)`,
              background: 'rgba(31,56,100,0.5)',
            }}
          />
        ))}
      </>
    ),
  },
  {
    label: 'growing',
    draw: (u) => (
      <>
        <div
          style={{
            width: u * 0.11,
            height: u * 0.13,
            border: `${u * 0.003}px solid rgba(46,117,182,0.6)`,
            borderRadius: `${u * 0.01}px ${u * 0.01}px ${u * 0.02}px ${u * 0.02}px`,
            background: 'rgba(31,56,100,0.35)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '36%',
            width: u * 0.004,
            height: u * 0.09,
            marginLeft: -u * 0.002,
            background: PALETTE.teal,
          }}
        />
        {[-1, 1].map((s) => (
          <div
            key={s}
            style={{
              position: 'absolute',
              left: `calc(50% + ${s * u * 0.022}px)`,
              top: '38%',
              width: u * 0.04,
              height: u * 0.022,
              marginLeft: -u * 0.02,
              borderRadius: '50%',
              background: PALETTE.teal,
              opacity: 0.85,
            }}
          />
        ))}
      </>
    ),
  },
];

export const Work: React.FC<SceneProps> = ({overPlate}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = frame / fps;
  const u = Math.min(width, height);

  const BEAT = 0.55;
  const idx = Math.min(PANELS.length - 1, Math.floor(t / BEAT) % PANELS.length);
  const local = (t % BEAT) / BEAT;
  const panel = PANELS[idx];

  // gold threads gathering upward across the whole shot
  const gather = interpolate(t, [0, 4.6], [0, 1], {extrapolateRight: 'clamp'});

  return (
    <AbsoluteFill
      style={{background: overPlate ? 'transparent' : '#080E1E', overflow: 'hidden'}}
    >
      {/* The plate is its own four-panel montage — ledger, broom, disc into an open palm,
          seedling — cut on the same rhythm, so the drawn panels come out. The gold threads
          further down stay: they run over the top and tie the four moments together. */}
      {!overPlate && (
      <>
      {/* warm key behind the montage. Without it the panels were islands of thin line
          work floating in black and the shot read as under-exposed. */}
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
        <div
          style={{
            width: u * 1.1,
            height: u * 1.1,
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(184,134,11,0.30) 0%, rgba(31,56,100,0.30) 38%, transparent 68%)`,
          }}
        />
      </AbsoluteFill>

      {/* the montage panel — hard cut in, slight push, no dissolve */}
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          transform: `scale(${1.02 + local * 0.06})`,
          opacity: interpolate(local, [0, 0.08, 0.9, 1], [0.3, 1, 1, 0.75]),
        }}
      >
        <div
          style={{
            // 2x the first pass — at 0.55s a panel has to fill the frame to register
            position: 'relative',
            width: u * 0.8,
            height: u * 0.8,
            transform: 'scale(2)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {panel.draw(u)}
        </div>
      </AbsoluteFill>
      </>
      )}

      {/* threads of gold light left behind by every action, gathering up */}
      <AbsoluteFill style={{pointerEvents: 'none'}}>
        {new Array(14).fill(0).map((_, i) => {
          const x = (i / 13) * width;
          const h = u * (0.1 + ((i * 37) % 30) / 100) * gather;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: x,
                bottom: 0,
                width: 2,
                height: h,
                background: `linear-gradient(0deg, rgba(240,194,75,0.55), transparent)`,
                opacity: 0.5 + 0.5 * Math.sin(t * 3 + i),
                filter: 'blur(1.5px)',
              }}
            />
          );
        })}
      </AbsoluteFill>

      <Motes count={40} opacity={0.45} />
      <Vignette strength={0.86} />
      <Grain />
    </AbsoluteFill>
  );
};
