import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {PALETTE} from '../timeline';
import {Grain, Motes, Vignette} from '../components/Atmosphere';
import type {SceneProps} from './props';
import {DISPLAY, SERIF} from '../fonts';
import {gleam, mix, ripple} from '../components/Kinetic';
import {LogoShimmer} from '../components/LogoShimmer';

/**
 * One line of the title lockup, assembled letter by letter.
 *
 * Letters rise into place on a heavily damped spring — no overshoot here, unlike the Code
 * cards. The Codes wanted a mechanical tick because they are locks seating; the title wants
 * to arrive and stay, so it settles once and does not bounce.
 *
 * The blur on approach is what stops it looking like a slide transition: each letter
 * resolves out of the sky rather than sliding across it.
 */
const TitleLine: React.FC<{
  text: string;
  /** Seconds since this line's entrance began. Negative = not yet started. */
  t: number;
  fontSize: number;
  /** Letter-spacing as a fraction of the font size. */
  tracking: number;
  color: string;
  /** Sweep head position, 0..1 across the line. `null` between passes — no gleam at all. */
  sweep: number | null;
  /** Absolute seconds, driving the ripple phase. */
  wave: number;
  /**
   * Per-letter delay in seconds. The default suits short lines; long ones need it tighter or
   * the last letter arrives much later than the first. At 0.022 the 20-character handle took
   * 0.44s to assemble and did not reach full strength until 0.2s before the fade to navy
   * began — the one line the viewer has to act on was barely on screen.
   */
  stagger?: number;
}> = ({text, t, fontSize, tracking, color, sweep, wave, stagger = 0.022}) => {
  const {fps} = useVideoConfig();
  const chars = text.split('');
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        lineHeight: 1.0,
        // Tracking is applied per letter below; this pulls back the trailing gap so the
        // line stays optically centred.
        marginRight: -fontSize * tracking,
      }}
    >
      {chars.map((c, i) => {
        const e = spring({
          frame: (t - i * stagger) * fps,
          fps,
          config: {damping: 200, mass: 0.5, stiffness: 105},
        });
        const pos = chars.length > 1 ? i / (chars.length - 1) : 0;

        // Both effects are scaled by the letter's own landing spring, so nothing gleams or
        // waves before it has arrived.
        const g = sweep === null ? 0 : gleam(pos, sweep) * e;
        // Deliberately ~3% of the font size. The character of this lockup is that it
        // SETTLES; a larger amplitude undoes that and reads as a wobble rather than a sheen.
        const wob = ripple(pos, wave) * fontSize * 0.028 * e;

        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              fontFamily: DISPLAY,
              fontWeight: 900,
              fontSize,
              letterSpacing: fontSize * tracking,
              // Lerp toward white where the light is passing.
              color: g > 0.01 ? mix(color, '#FFFFFF', g * 0.85) : color,
              opacity: e,
              transform: `translateY(${(1 - e) * fontSize * 0.32 + wob}px) scale(${
                0.96 + 0.04 * e + 0.02 * g
              })`,
              filter: `blur(${(1 - e) * fontSize * 0.09}px)`,
              textShadow: `0 ${fontSize * 0.03}px ${fontSize * 0.22}px rgba(60,20,0,0.8), 0 0 ${
                fontSize * 0.7
              }px rgba(255,190,90,${0.35 * e + 0.5 * g})`,
              whiteSpace: 'pre',
            }}
          >
            {c}
          </span>
        );
      })}
    </div>
  );
};

/**
 * SHOT 6 — SUNRISE (0:32.0–0:37.4)
 * "Welcome to The Stewardship Code — Principles of Managing Money."
 *
 * Dawn on a rooftop. A coin is flipped, caught, and CLOSED in the fist — a decision,
 * not a grab. The frame is deliberately wide with empty sky, because the title lockup
 * lands in that sky.
 *
 * NOTE: the delivered VO ends at 36.12s and the recorded read replaces the scripted
 * "Twenty-six episodes. All of August. Crack the code." with a welcome line. The card copy
 * follows the VOICE, not the script — which is also why the subtitle reads "Principles of
 * Managing Money" and not the brief's "Secrets to Managing Money". The voice says
 * Principles; a card that contradicts the narration on screen is just a defect.
 *
 * The scripted "26 EPISODES · ALL AUGUST" line has been dropped in favour of the subscribe
 * CTA. That means the August schedule is no longer stated anywhere on screen — it needs to
 * live in the YouTube description instead.
 */
export const Sunrise: React.FC<SceneProps> = ({overPlate}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = frame / fps;
  const abs = t + 32.0;
  const u = Math.min(width, height);
  const vertical = height > width;

  // sun rising through the shot
  const sun = interpolate(abs, [32.0, 37.0], [0, 1], {extrapolateRight: 'clamp'});
  const sunY = interpolate(sun, [0, 1], [0.86, 0.62]);

  // coin flip: up 32.3 → 33.6, caught and closed at 33.6
  const flip = interpolate(abs, [32.3, 33.6], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const coinY = 0.52 - Math.sin(flip * Math.PI) * 0.26;
  const caught = abs >= 33.6;

  // camera rises and pulls back into silhouette
  const pull = interpolate(abs, [32.0, 37.4], [1.12, 0.98]);

  const titleIn = spring({
    frame: (abs - 33.9) * fps,
    fps,
    config: {damping: 16, mass: 0.5},
  });
  const subIn = spring({frame: (abs - 34.6) * fps, fps, config: {damping: 18, mass: 0.5}});
  const ctaIn = spring({frame: (abs - 35.25) * fps, fps, config: {damping: 18, mass: 0.5}});
  /**
   * The handle enters at 35.5 via TitleLine's own per-letter springs, just after the
   * instruction, and is set larger — it is the thing to act on, so it outranks
   * "SUBSCRIBE ON ALL PLATFORMS" typographically.
   *
   * Both were 0.15s later and the handle used the default 0.022 stagger. Measured on a
   * rendered frame, that left it still spelling itself out at 36.03s and not fully seated
   * until ~36.4 — 0.2s before the fade begins. It now lands by ~35.85 and holds for three
   * quarters of a second at full strength.
   */
  const HANDLE_IN = 35.5;

  /**
   * The gleam: two discrete passes of light across the lockup, not a continuous loop. A
   * looping shine on a two-second end card reads as a screensaver; two passes read as
   * polished metal catching the sunrise.
   *
   * Pass 1 lands just after CODE seats — the light is what completes the landing. Pass 2 sits
   * under the last words of the read and lifts the card before the fade takes it.
   */
  const SWEEPS = [34.55, 36.05];
  const SWEEP_DUR = 0.85;
  const sweep = (() => {
    for (const s of SWEEPS) {
      const p = (abs - s) / SWEEP_DUR;
      // Head travels from just off the left edge to just off the right.
      if (p >= 0 && p <= 1) return p * 1.6 - 0.3;
    }
    return null;
  })();

  // final fade to navy — the read ends at 36.12, so the fade starts after it
  const fade = interpolate(abs, [36.6, 37.4], [0, 1], {extrapolateLeft: 'clamp'});

  return (
    <AbsoluteFill
      style={{background: overPlate ? 'transparent' : '#1A1024', overflow: 'hidden'}}
    >
      {/* dawn sky */}
      {!overPlate && (
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, #241536 0%, #4A2A44 32%, #9B5A3C 62%, #E09A45 84%, #F5C878 100%)`,
        }}
      />
      )}
      {/* the sun itself */}
      {!overPlate && (
      <AbsoluteFill>
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: `${sunY * 100}%`,
            width: u * 0.72,
            height: u * 0.72,
            marginLeft: -u * 0.36,
            marginTop: -u * 0.36,
            borderRadius: '50%',
            background: `radial-gradient(circle, #FFE6A8 0%, #F5B84E 34%, rgba(224,138,60,0.5) 58%, transparent 74%)`,
            filter: `blur(${u * 0.006}px)`,
          }}
        />
      </AbsoluteFill>
      )}

      {/* Skyline, silhouettes and the coin flip are all in the plate — Veo staged the
          toss and the catch, so drawing them again would double the subject. */}
      {!overPlate && (
      <AbsoluteFill style={{transform: `scale(${pull})`}}>
        {/* hazy skyline below */}
        <AbsoluteFill style={{justifyContent: 'flex-end'}}>
          <div style={{display: 'flex', alignItems: 'flex-end', opacity: 0.85}}>
            {new Array(26).fill(0).map((_, i) => {
              const h = 0.05 + (((i * 53) % 17) / 17) * 0.13;
              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: u * h,
                    background: 'rgba(26,14,30,0.9)',
                    marginRight: 2,
                  }}
                />
              );
            })}
          </div>
        </AbsoluteFill>

        {/* two figures in silhouette on the rooftop */}
        <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center'}}>
          <div
            style={{
              position: 'relative',
              display: 'flex',
              gap: u * 0.05,
              alignItems: 'flex-end',
              marginBottom: u * 0.13,
            }}
          >
            {[0, 1].map((i) => (
              <div key={i} style={{position: 'relative', width: u * 0.075}}>
                <div
                  style={{
                    width: u * 0.05,
                    height: u * 0.056,
                    margin: '0 auto',
                    borderRadius: '46%',
                    background: '#150C1C',
                  }}
                />
                <div
                  style={{
                    width: u * 0.075,
                    height: u * 0.15,
                    borderRadius: `${u * 0.03}px ${u * 0.03}px 0 0`,
                    background: '#150C1C',
                    marginTop: -u * 0.006,
                  }}
                />
              </div>
            ))}
            {/* the coin, mid-flip then closed in the fist */}
            {!caught ? (
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: `${coinY * 100}%`,
                  width: u * 0.03,
                  height: u * 0.03 * Math.abs(Math.cos(flip * Math.PI * 5)),
                  marginLeft: -u * 0.015,
                  borderRadius: '50%',
                  background: 'linear-gradient(180deg, #FFE9B0, #C68A18)',
                  boxShadow: `0 0 ${u * 0.035}px rgba(255,220,140,0.95)`,
                }}
              />
            ) : (
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '46%',
                  width: u * 0.02,
                  height: u * 0.02,
                  marginLeft: -u * 0.01,
                  borderRadius: '50%',
                  background: 'rgba(255,230,170,0.9)',
                  filter: `blur(${u * 0.004}px)`,
                  opacity: interpolate(abs, [33.6, 34.4], [1, 0.25], {
                    extrapolateRight: 'clamp',
                  }),
                }}
              />
            )}
          </div>
        </AbsoluteFill>
      </AbsoluteFill>
      )}

      {/* TITLE LOCKUP — lands in the empty sky, which is why the shot is framed wide */}
      <AbsoluteFill
        style={{
          justifyContent: 'flex-start',
          alignItems: 'center',
          paddingTop: height * (vertical ? 0.18 : 0.12),
          textAlign: 'center',
        }}
      >
        {/* The lockup sits in the top half, and the Plate's scrim is bottom-weighted, so
            the title needs its own. It has to be strong: Veo put a very bright gold disc
            and a blown-out sun exactly where the type lands, and in the first render
            "26 EPISODES · ALL AUGUST" was cream-on-gold and effectively unreadable. */}
        {overPlate && (
          <AbsoluteFill
            style={{
              background:
                'linear-gradient(to bottom, rgba(28,12,2,0.78) 0%, rgba(28,12,2,0.62) 30%, rgba(28,12,2,0.28) 52%, transparent 68%)',
              opacity: Math.min(1, Math.max(0, (abs - 33.6) / 0.5)),
            }}
          />
        )}
        <div style={{width: '86%', zIndex: 1}}>
          {/* THE STEWARDSHIP CODE — the one lockup the whole trailer is building to, so it
              gets the most deliberate move in the piece rather than a plain fade.
              "STEWARDSHIP" is the word that matters and it is set on its own line, larger,
              with the two small words tracked out above it. Each line assembles per letter
              on its own stagger, and the whole block eases up a few pixels as it lands so
              the type feels like it is settling into the sky rather than pasted onto it. */}
          <TitleLine
            text="THE"
            t={abs - 33.9}
            fontSize={height * (vertical ? 0.026 : 0.03)}
            tracking={0.5}
            color="#FFDFA0"
            sweep={sweep}
            wave={abs}
          />
          {/* 0.056 in vertical, not 0.072. STEWARDSHIP is eleven characters of a heavy
              condensed face: at 0.072 of 1920 it needs about 1090px inside an 86%-of-1080
              container and was being clipped at both edges. Sized off the longest word in
              the lockup — if the title copy ever changes, re-check this number. */}
          <TitleLine
            text="STEWARDSHIP"
            t={abs - 34.0}
            fontSize={height * (vertical ? 0.056 : 0.105)}
            tracking={0.01}
            color="#FFF0CC"
            sweep={sweep}
            wave={abs}
          />
          <TitleLine
            text="CODE"
            t={abs - 34.2}
            // Matches STEWARDSHIP above — the two words are one lockup and must stay the
            // same size even though CODE alone would fit at 0.072.
            fontSize={height * (vertical ? 0.056 : 0.105)}
            tracking={0.22}
            color="#FFF0CC"
            sweep={sweep}
            wave={abs}
          />

          {/* A gold rule wiping out from centre, between title and subtitle. */}
          <div
            style={{
              margin: `${height * 0.018}px auto 0`,
              width: `${subIn * 62}%`,
              height: Math.max(1, height * 0.0022),
              background:
                'linear-gradient(90deg, transparent, rgba(255,226,150,0.95), transparent)',
              boxShadow: '0 0 18px rgba(255,210,120,0.8)',
            }}
          />

          <div
            style={{
              opacity: subIn,
              // Rises the last few pixels with the rule, so subtitle and rule read as one
              // gesture instead of two separate fades.
              transform: `translateY(${(1 - subIn) * height * 0.012}px)`,
              marginTop: height * 0.016,
              fontFamily: SERIF,
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: height * (vertical ? 0.031 : 0.037),
              color: '#FFFFFF',
              textShadow: '0 2px 16px rgba(60,20,0,0.85)',
            }}
          >
            Principles of Managing Money
          </div>

          {/* CALL TO ACTION. The instruction is small and on a dark pill — that treatment is
              what made this line readable over the bright gold disc behind it. The handle is
              the larger of the two because it is the part anyone actually has to read and
              act on. */}
          <div
            style={{
              opacity: ctaIn,
              transform: `translateY(${(1 - ctaIn) * height * 0.01}px)`,
              marginTop: height * 0.026,
              fontFamily: DISPLAY,
              fontWeight: 900,
              fontSize: height * (vertical ? 0.02 : 0.022),
              letterSpacing: height * 0.0045,
              color: '#FFFFFF',
              display: 'inline-block',
              padding: `${height * 0.008}px ${height * 0.02}px`,
              borderRadius: 999,
              background: 'rgba(24,10,0,0.55)',
              border: '1px solid rgba(255,214,140,0.45)',
              textShadow: '0 2px 12px rgba(30,10,0,0.95)',
            }}
          >
            SUBSCRIBE ON ALL PLATFORMS
          </div>
          <div
            style={{
              marginTop: height * 0.016,
              // The handle catches the same light as the title, so the two read as one
              // surface rather than a headline plus a caption.
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <TitleLine
              text="@KidsInspiringNation"
              t={abs - HANDLE_IN}
              fontSize={height * (vertical ? 0.031 : 0.038)}
              tracking={0.012}
              color="#FFD98A"
              sweep={sweep}
              wave={abs}
              // 20 characters: at the default 0.022 the line takes 0.44s to assemble.
              stagger={0.013}
            />
          </div>
        </div>
      </AbsoluteFill>

      <Motes count={30} opacity={0.5} tint="#FFE7AE" />
      <Vignette strength={0.62} />
      <Grain opacity={0.045} />
      <AbsoluteFill style={{background: PALETTE.navy, opacity: fade}} />

      {/* KIN endorsement — AFTER the navy fade on purpose, so the mark resolves on top of it
          and is the last thing on screen. Above the fade it would simply be wiped out, which
          is what the old version did: it appeared on the CTA beat and then vanished. */}
      <LogoShimmer abs={abs} fade={fade} height={height} vertical={vertical} />
    </AbsoluteFill>
  );
};
