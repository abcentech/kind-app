import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {PALETTE} from '../timeline';
import {Grain, Motes, Vignette} from '../components/Atmosphere';
import type {SceneProps} from './props';

/**
 * SHOT 1 — THE LOCK (0:00–0:10.2)
 * "Everybody serves a master… until money asks them to choose."
 *
 * A boy alone with a phone. The camera pulls back and the shadows resolve into an
 * enormous vault dial with him sitting at its centre like a keyhole. The reveal is the
 * whole shot, so the dial starts almost invisible and is only fully legible by ~7s.
 */
export const Lock: React.FC<SceneProps> = ({overPlate}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = frame / fps;
  const u = Math.min(width, height);

  // Pull-back: subject large and close, then receding into the ring.
  const zoom = interpolate(t, [0, 10.2], [1.35, 0.92], {extrapolateRight: 'clamp'});
  // The dial fades up late — the audience should feel watched before they see why.
  const dial = interpolate(t, [2.6, 7.4], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const spin = interpolate(t, [0, 10.2], [-8, 4]);

  // Phone light: a slow breathing glow, plus one hard buzz-flash at 6.2s.
  const breathe = 0.82 + 0.18 * Math.sin(t * 1.7);
  const buzz = t > 6.2 && t < 6.42 ? 1.7 : 1;
  const phoneGlow = breathe * buzz;

  const ringCount = 3;

  return (
    <AbsoluteFill
      style={{
        background: overPlate ? 'transparent' : PALETTE.navyDeep,
        overflow: 'hidden',
      }}
    >
      {/* The plate does this shot better than the geometry could: Veo staged the same
          reveal as a real camera move, wide on the room then pushing onto Micah's face,
          so the drawn dial and silhouette come out entirely. */}
      {!overPlate && (
      <AbsoluteFill style={{transform: `scale(${zoom})`}}>
        {/* the vault dial, drawn as concentric rings with radial tumbler notches */}
        <AbsoluteFill
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            opacity: dial,
          }}
        >
          <div
            style={{
              position: 'relative',
              width: u * 1.15,
              height: u * 1.15,
              transform: `rotate(${spin}deg)`,
            }}
          >
            {new Array(ringCount).fill(0).map((_, i) => {
              const s = 1 - i * 0.19;
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    inset: `${((1 - s) / 2) * 100}%`,
                    borderRadius: '50%',
                    border: `${u * (0.004 + i * 0.001)}px solid rgba(184,134,11,${
                      0.16 + i * 0.05
                    })`,
                    boxShadow: `inset 0 0 ${u * 0.05}px rgba(184,134,11,0.12)`,
                  }}
                />
              );
            })}
            {/* tumbler notches around the outer ring */}
            {new Array(48).fill(0).map((_, i) => {
              const a = (i / 48) * Math.PI * 2;
              const major = i % 4 === 0;
              return (
                <div
                  key={`n${i}`}
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    width: major ? u * 0.03 : u * 0.016,
                    height: u * 0.0035,
                    marginTop: -u * 0.00175,
                    background: `rgba(184,134,11,${major ? 0.5 : 0.24})`,
                    transformOrigin: '0 50%',
                    transform: `rotate(${a}rad) translateX(${u * 0.535}px)`,
                  }}
                />
              );
            })}
          </div>
        </AbsoluteFill>

        {/* the figure: a small seated silhouette, lit only from the phone in his lap */}
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
          <div style={{position: 'relative', width: u * 0.3, height: u * 0.34}}>
            {/* phone bloom, behind the body so it rims him */}
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '64%',
                width: u * 0.42,
                height: u * 0.42,
                marginLeft: -u * 0.21,
                marginTop: -u * 0.21,
                borderRadius: '50%',
                background: `radial-gradient(circle, rgba(240,194,75,${
                  0.5 * phoneGlow
                }) 0%, rgba(46,117,182,${0.16 * phoneGlow}) 42%, transparent 68%)`,
                filter: `blur(${u * 0.012}px)`,
              }}
            />
            {/* head */}
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '2%',
                width: u * 0.082,
                height: u * 0.095,
                marginLeft: -u * 0.041,
                borderRadius: '46% 46% 42% 42%',
                background: '#050A14',
              }}
            />
            {/* hunched shoulders and torso */}
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '27%',
                width: u * 0.2,
                height: u * 0.2,
                marginLeft: -u * 0.1,
                borderRadius: `${u * 0.06}px ${u * 0.06}px ${u * 0.02}px ${u * 0.02}px`,
                background: '#050A14',
              }}
            />
            {/* knees drawn up */}
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '58%',
                width: u * 0.26,
                height: u * 0.14,
                marginLeft: -u * 0.13,
                borderRadius: `${u * 0.055}px ${u * 0.055}px 0 0`,
                background: '#03060D',
              }}
            />
            {/* the phone itself */}
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '61%',
                width: u * 0.028,
                height: u * 0.05,
                marginLeft: -u * 0.014,
                borderRadius: u * 0.005,
                background: `rgba(240,220,170,${0.9 * Math.min(1, phoneGlow)})`,
                boxShadow: `0 0 ${u * 0.03}px rgba(240,194,75,0.9)`,
              }}
            />
          </div>
        </AbsoluteFill>

        {/* two blank discs resting on the floor beside him — never minted currency */}
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
          {[-0.13, -0.085, 0.115].map((dx, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `calc(50% + ${dx * u}px)`,
                top: `calc(50% + ${u * (0.15 + (i % 2) * 0.012)}px)`,
                width: u * 0.026,
                height: u * 0.009,
                borderRadius: '50%',
                background: `linear-gradient(180deg, rgba(240,194,75,0.75), rgba(120,85,10,0.5))`,
                boxShadow: `0 0 ${u * 0.012}px rgba(240,194,75,0.35)`,
              }}
            />
          ))}
        </AbsoluteFill>
      </AbsoluteFill>
      )}

      <Motes count={45} opacity={0.35} />
      <Vignette strength={0.95} />
      <Grain />
    </AbsoluteFill>
  );
};
