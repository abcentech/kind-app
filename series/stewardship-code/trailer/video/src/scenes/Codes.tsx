import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {CODE_CLICKS, PALETTE} from '../timeline';
import {Grain, LensStreak, Vignette, rand} from '../components/Atmosphere';
import {CodeLockup, TextScrim} from '../components/Kinetic';
import {DISPLAY} from '../fonts';
import type {SceneProps} from './props';

/**
 * SHOT 4 — THE FOUR CODES (0:22.3–0:27.4)
 * "Ownership. Faithfulness. Mastery. Multiplication."
 *
 * The money shot. Four concentric rings hang in a dark vault; each one rotates and
 * SLAMS into alignment on the exact frame its Code name is spoken, firing a shockwave.
 * On the fourth, the chains shatter into rising embers.
 *
 * The click times in CODE_CLICKS are measured word onsets from the delivered VO — this
 * sync is the best two seconds in the trailer and it is not eyeballed.
 */
const Ring: React.FC<{index: number; abs: number; u: number}> = ({index, abs, u}) => {
  const {fps} = useVideoConfig();
  const click = CODE_CLICKS[index].t;

  // Approach: the ring spins fast, decelerating into its click.
  const preroll = interpolate(abs, [click - 1.5, click], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const spinAmount = 130 * (index % 2 ? -1 : 1);
  const rot = spinAmount * Math.pow(preroll, 1.7);

  // Slam: a stiff spring so it lands hard and rings once, rather than easing in.
  const landed = abs >= click;
  const slam = landed
    ? spring({
        frame: (abs - click) * fps,
        fps,
        config: {damping: 9, mass: 0.5, stiffness: 220},
      })
    : 0;

  const scale = 1 + (1 - slam) * 0.12 * (landed ? 1 : 0);
  const size = u * (1.02 - index * 0.19);
  const glow = landed ? 0.35 + 0.65 * slam : 0.1;

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: size,
        height: size,
        marginLeft: -size / 2,
        marginTop: -size / 2,
        transform: `rotate(${rot}deg) scale(${scale})`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: `${u * 0.008}px solid rgba(184,134,11,${0.25 + 0.6 * glow})`,
          boxShadow: landed
            ? `0 0 ${u * 0.05 * slam}px rgba(240,194,75,${0.55 * slam}), inset 0 0 ${
                u * 0.04 * slam
              }px rgba(240,194,75,${0.4 * slam})`
            : 'none',
        }}
      />
      {/* tumbler teeth — these are what visibly "align" on the slam */}
      {new Array(12).fill(0).map((_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: u * 0.026,
              height: u * 0.006,
              marginTop: -u * 0.003,
              background: `rgba(240,194,75,${0.2 + 0.7 * glow})`,
              transformOrigin: '0 50%',
              transform: `rotate(${a}rad) translateX(${size / 2 - u * 0.026}px)`,
            }}
          />
        );
      })}
    </div>
  );
};

export const Codes: React.FC<SceneProps> = ({overPlate}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = frame / fps;
  const abs = t + 22.3;
  const u = Math.min(width, height);

  const fourth = CODE_CLICKS[3].t;
  const shatter = interpolate(abs, [fourth, fourth + 1.3], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // The active card is whichever click we are past, within a 1.1s hold.
  const active = CODE_CLICKS.map((c, i) => ({
    ...c,
    i,
    on: abs >= c.t && abs < c.t + (i === 3 ? 1.4 : 1.05),
  })).find((c) => c.on);

  // Shockwave from the most recent click.
  const last = [...CODE_CLICKS].reverse().find((c) => abs >= c.t);
  const waveP = last
    ? interpolate(abs, [last.t, last.t + 0.55], [0, 1], {extrapolateRight: 'clamp'})
    : 1;

  const push = interpolate(abs, [22.3, 27.4], [1.0, 1.09]);

  return (
    <AbsoluteFill
      style={{background: overPlate ? 'transparent' : '#060B18', overflow: 'hidden'}}
    >
      {/* This is the one shot where the plate cannot carry the whole thing. Veo staged a
          convincing vault — glowing rings, chains falling away into embers — but it has no
          idea when OWNERSHIP / FAITHFULNESS / MASTERY / MULTIPLICATION are spoken, so its
          own flashes land wherever they land. The drawn rings and the freed figure come
          out; the shockwave, the click flash and the title cards stay, because those are
          what actually sit on the measured onsets. Losing that sync to get prettier rings
          would be a bad trade — it is the best two seconds in the trailer. */}
      {!overPlate && (
      <AbsoluteFill style={{transform: `scale(${push})`}}>
        {/* vault ambience */}
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
          <div
            style={{
              width: u * 1.4,
              height: u * 1.4,
              borderRadius: '50%',
              background: `radial-gradient(circle, rgba(31,56,100,0.55) 0%, transparent 62%)`,
            }}
          />
        </AbsoluteFill>

        <AbsoluteFill>
          {CODE_CLICKS.map((_, i) => (
            <Ring key={i} index={i} abs={abs} u={u} />
          ))}
        </AbsoluteFill>

        {/* the freed figure, standing to full height as the fourth ring lands */}
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
          <div
            style={{
              position: 'relative',
              width: u * 0.09,
              height: u * (0.14 + 0.08 * shatter),
              background: 'linear-gradient(180deg, #0D1730, #050A14)',
              borderRadius: `${u * 0.045}px ${u * 0.045}px ${u * 0.01}px ${u * 0.01}px`,
              boxShadow: `0 0 ${u * 0.06}px rgba(240,194,75,${0.25 + 0.5 * shatter})`,
            }}
          />
        </AbsoluteFill>

        {/* chains shattering into rising embers on click four */}
        {shatter > 0 && (
          <AbsoluteFill>
            {new Array(80).fill(0).map((_, i) => {
              const a = rand(i) * Math.PI * 2;
              const dist = (0.1 + rand(i + 5) * 0.55) * u * shatter;
              const lift = shatter * u * (0.1 + rand(i + 9) * 0.35);
              const s = (1.5 + rand(i + 17) * 3.5) * (1 - shatter * 0.5);
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: width / 2 + Math.cos(a) * dist,
                    top: height / 2 + Math.sin(a) * dist * 0.6 - lift,
                    width: s,
                    height: s,
                    borderRadius: '50%',
                    background: PALETTE.goldHot,
                    opacity: (1 - shatter) * 0.9,
                    filter: `blur(${s * 0.3}px)`,
                  }}
                />
              );
            })}
          </AbsoluteFill>
        )}
      </AbsoluteFill>
      )}

      {/* SYNC LAYER — runs in both versions, and over the plate it is the only thing
          carrying the four clicks. The expanding ring plus a short full-frame gold flash
          on each measured onset; over footage the flash does most of the work, since a
          thin drawn ring reads as an overlay against a rendered vault. */}
      {waveP < 1 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
          <div
            style={{
              width: u * 0.2 + u * 1.5 * waveP,
              height: u * 0.2 + u * 1.5 * waveP,
              borderRadius: '50%',
              border: `${u * 0.005}px solid rgba(240,194,75,${
                0.7 * (1 - waveP) * (overPlate ? 0.55 : 1)
              })`,
              filter: `blur(${u * 0.003}px)`,
            }}
          />
        </AbsoluteFill>
      )}
      {overPlate && (
        <AbsoluteFill
          style={{
            // A DARK pulse, not a bright one. The first attempt flashed gold on each click
            // and it was invisible: the vault plate is already near-blown gold across most
            // of the frame, so adding light did nothing. Briefly crushing the edges reads
            // instantly on a bright frame and doubles as the vault iris closing.
            background: `radial-gradient(circle at 50% 50%, transparent 18%, rgba(6,3,0,0.55) 78%, rgba(6,3,0,0.85) 100%)`,
            opacity: Math.max(0, 1 - waveP / 0.4) * 0.9,
          }}
        />
      )}

      {/* the Code title cards — brief §"On-Screen Text", gold, all caps, wide tracking */}
      {active && (
        <AbsoluteFill
          style={{
            justifyContent: 'flex-end',
            alignItems: 'center',
            paddingBottom: height * 0.14,
          }}
        >
          {/* Over the plate the card needs its own ground. Without this band the name sits
              directly on the vault's brightest region and disappears. */}
          {overPlate && (
            <TextScrim opacity={Math.min(1, (abs - active.t) / 0.12)} y="58%" height="46%" />
          )}
          <CodeCard
            label={active.label}
            t={abs - active.t}
            u={u}
            height={height}
            index={active.i}
            onBright={overPlate}
          />
        </AbsoluteFill>
      )}

      <LensStreak y="50%" width={90} opacity={(1 - waveP) * 0.5} />
      <Vignette strength={0.88} />
      <Grain />
    </AbsoluteFill>
  );
};

/**
 * One Code name.
 *
 * The earlier version set "THE OWNERSHIP CODE" as a single nowrap string and sprang the
 * whole line at once. Two things were wrong with that. The line is the same eight
 * characters of chrome ("THE"/"CODE") on all four cards, which buries the one word that
 * changes; and a single spring on a whole line cannot read as a lock seating.
 *
 * So the Code name is now the card — set large, letter by letter, on a stiff spring — and
 * THE / CODE are demoted to small tracked-out gold rules either side of it.
 */
const CodeCard: React.FC<{
  label: string;
  t: number;
  u: number;
  height: number;
  index: number;
  onBright: boolean;
}> = ({label, t, u, height, index, onBright}) => {
  const {fps} = useVideoConfig();
  // The chrome fades in behind the name rather than springing with it.
  const chrome = spring({frame: (t - 0.16) * fps, fps, config: {damping: 200, mass: 0.5}});
  // MULTIPLICATION is 14 characters and has to fit 9:16 at this tracking, so the size is
  // set from the label length rather than a flat number per index.
  const fit = Math.min(1, 11 / label.length);
  const fontSize = height * (index === 3 ? 0.062 : 0.055) * fit;
  const small = height * 0.019;

  const Chrome: React.FC<{children: string}> = ({children}) => (
    <span
      style={{
        fontFamily: DISPLAY,
        fontWeight: 700,
        fontSize: small,
        letterSpacing: small * 0.42,
        color: onBright ? '#FFE7B0' : PALETTE.gold,
        opacity: chrome * (onBright ? 0.95 : 0.85),
        textShadow: onBright ? '0 1px 8px rgba(20,8,0,0.95)' : 'none',
      }}
    >
      {children}
    </span>
  );

  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: small,
          marginBottom: small * 0.7,
        }}
      >
        <Chrome>THE</Chrome>
        <div
          style={{
            width: u * 0.05 * chrome,
            height: 1,
            background: PALETTE.gold,
            opacity: 0.5,
          }}
        />
        <Chrome>CODE</Chrome>
      </div>
      <CodeLockup label={label} t={t} fontSize={fontSize} index={index} />
    </div>
  );
};
