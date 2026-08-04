import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {PALETTE} from '../timeline';
import {Grain, Motes, Vignette} from '../components/Atmosphere';
import type {SceneProps} from './props';

/**
 * SHOT 2 — THE CHAINS (0:10.2–0:15.8)
 * "Money is a great servant. And a terrible god."
 *
 * Molten gold chains erupt from the coins and coil tight around both wrists. The VO
 * direction says the second line DROPS in volume, so the picture drops with it: at
 * 12.9s local (the "terrible god" line) the gold goes cold and the frame darkens.
 * Menace is quiet.
 */
export const Chains: React.FC<SceneProps> = ({overPlate}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = frame / fps;
  const u = Math.min(width, height);

  // local seconds → absolute, so the beat comments match the VO transcript
  const abs = t + 10.2;

  // The coil: chains whip out fast, then tighten slowly and never let go.
  const coil = interpolate(abs, [10.6, 12.2], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const tighten = interpolate(abs, [12.2, 15.8], [1, 0.86], {extrapolateRight: 'clamp'});

  // "And a terrible god." — the light curdles instead of flaring.
  const cold = interpolate(abs, [12.7, 14.4], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const heat = 1 - cold * 0.75;
  const push = interpolate(abs, [10.2, 15.8], [1.02, 1.14]);

  // Chunky, well-spaced links. An early pass used 26 tightly-packed ovals and the
  // result read as a coiled spring, not a chain.
  const links = 9;

  return (
    <AbsoluteFill
      style={{
        background: overPlate ? 'transparent' : PALETTE.navyDeep,
        overflow: 'hidden',
      }}
    >
      {/* The plate carries the wrists, the chain and Ada's offered palm — all of it
          rendered, not silhouetted. The "terrible god" darkening below stays either way:
          that is a grade beat cut to the VO, not geometry. */}
      {!overPlate && (
      <AbsoluteFill style={{transform: `scale(${push})`}}>
        {/* molten pool the chains are born from */}
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
          <div
            style={{
              width: u * 0.9,
              height: u * 0.9,
              borderRadius: '50%',
              background: `radial-gradient(circle, rgba(240,194,75,${
                0.3 * heat
              }) 0%, rgba(184,134,11,${0.14 * heat}) 35%, transparent 66%)`,
              filter: `blur(${u * 0.02}px)`,
            }}
          />
        </AbsoluteFill>

        {/* MICAH — head and torso. Without a body between them the two forearms read
            as disembodied objects floating in the dark. */}
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
          <div style={{position: 'relative', width: u * 0.3, height: u * 0.36}}>
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: 0,
                width: u * 0.085,
                height: u * 0.1,
                marginLeft: -u * 0.0425,
                borderRadius: '46% 46% 42% 42%',
                background: '#0A1224',
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '27%',
                width: u * 0.2,
                height: u * 0.26,
                marginLeft: -u * 0.1,
                borderRadius: `${u * 0.055}px ${u * 0.055}px ${u * 0.015}px ${u * 0.015}px`,
                background: 'linear-gradient(180deg, #101B33, #060B18)',
              }}
            />
          </div>
        </AbsoluteFill>

        {/* two wrists, and the chain coiled around each */}
        {[-1, 1].map((side) => (
          <AbsoluteFill
            key={side}
            style={{justifyContent: 'center', alignItems: 'center'}}
          >
            <div
              style={{
                position: 'absolute',
                left: `calc(50% + ${side * u * 0.17}px)`,
                top: '50%',
                width: u * 0.11,
                height: u * 0.26,
                marginLeft: -u * 0.055,
                marginTop: -u * 0.13,
                // forearm, straining outward as the chain pulls
                transform: `rotate(${side * (14 + coil * 10)}deg) scaleY(${tighten})`,
              }}
            >
              {/* the arm */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: u * 0.05,
                  background: 'linear-gradient(180deg, #16223A, #070C18)',
                }}
              />
              {/* chain links wrapping it */}
              {new Array(links).fill(0).map((_, i) => {
                const p = i / (links - 1);
                // links arrive in sequence from the wrist upward
                const arrive = interpolate(coil, [p * 0.7, p * 0.7 + 0.3], [0, 1], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                });
                const wob = Math.sin(t * 6 + i) * (1 - coil) * u * 0.02;
                return (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: `${p * 100}%`,
                      width: u * 0.062 * arrive,
                      height: u * 0.028,
                      marginLeft: -u * 0.031 * arrive,
                      // Alternating flat/edge-on links. Rotating every link the same
                      // way (±22°) produced a helix that read as a spring.
                      transform: `translateX(${wob}px) rotate(${
                        i % 2 ? 82 : 0
                      }deg) scale(${arrive})`,
                      borderRadius: '50%',
                      border: `${u * 0.005}px solid rgba(240,194,75,${
                        (0.55 + 0.35 * Math.sin(t * 3 + i)) * heat * arrive
                      })`,
                      boxShadow: `0 0 ${u * 0.012}px rgba(240,194,75,${0.5 * heat * arrive})`,
                      opacity: arrive,
                    }}
                  />
                );
              })}
            </div>
          </AbsoluteFill>
        ))}

        {/* ADA — the open hand offered out of the dark, calm and certain */}
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: u * 0.13,
              height: u * 0.13,
              marginLeft: -u * 0.065,
              marginTop: u * 0.09,
              borderRadius: '50%',
              background: `radial-gradient(circle, rgba(42,157,143,${
                0.34 * interpolate(abs, [13.4, 15.8], [0, 1], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                })
              }) 0%, transparent 70%)`,
              filter: `blur(${u * 0.008}px)`,
            }}
          />
        </AbsoluteFill>
      </AbsoluteFill>
      )}

      {/* the frame itself darkening on "terrible god" */}
      <AbsoluteFill style={{background: '#000', opacity: cold * 0.32}} />
      <Motes count={35} opacity={0.3 * heat} />
      <Vignette strength={0.9 + cold * 0.08} />
      <Grain />
    </AbsoluteFill>
  );
};
