import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile} from 'remotion';

/**
 * The KIN endorsement mark: present and quietly alive through the end card, resolving to
 * full strength as the picture fades to navy.
 *
 * It used to simply appear on the CTA beat and sit there. Two things are better about this.
 * The brand is present for the whole end card instead of arriving at the last moment, and
 * the trailer now ends on the mark resolving rather than on a cut to flat navy — the fade
 * becomes the reveal instead of just being the end.
 *
 * The reveal is driven by the caller's existing `fade` value rather than a timer of its own.
 * That is deliberate: tying the two to the same number makes them one gesture. Given
 * separate timings they drift, and it reads as two things happening near each other.
 */
export const LogoShimmer: React.FC<{
  /** Absolute seconds on the trailer timeline. */
  abs: number;
  /** The scene's fade-to-navy progress, 0..1. Drives the reveal. */
  fade: number;
  height: number;
  vertical: boolean;
}> = ({abs, fade, height, vertical}) => {
  // Quiet presence, well before the CTA beat.
  const enter = interpolate(abs, [32.5, 33.4], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Small and dim → large and full, on the fade. The quiet values were 0.075h at 0.3 opacity
  // and on a rendered frame the mark was near-invisible against a busy sunrise — quiet is
  // meant to mean understated, not absent.
  const size = height * (vertical ? 0.072 : 0.086) +
    height * (vertical ? 0.09 : 0.115) * fade;
  const opacity = enter * (0.42 + 0.58 * fade);
  /**
   * Lifts only slightly off the lower edge.
   *
   * The first version rose to 0.38 of frame height to land centre-frame, on the assumption
   * that the title would be gone by then. It is not: the lockup carries `zIndex: 1` so it
   * survives the fade to navy — which makes a strong end card and keeps the handle readable
   * to the last frame — and the rising mark landed straight on top of
   * "@KidsInspiringNation". It resolves at the bottom instead.
   */
  const lift = interpolate(fade, [0, 1], [height * 0.045, height * 0.085]);

  /**
   * Sweep head, in percent across the mark.
   *
   * Quiet phase: one pass every 2.4s. Reveal: a single strong pass driven by `fade`, so the
   * light crosses the mark exactly as it resolves. `abs` is used for the loop rather than a
   * frame counter so the cadence does not change with fps.
   */
  const loop = ((abs - 32.5) % 2.4) / 2.4;
  const p = fade > 0 ? interpolate(fade, [0.05, 0.75], [-25, 125]) : loop * 150 - 25;
  const shine = fade > 0 ? 0.9 : 0.45;

  const box: React.CSSProperties = {
    position: 'absolute',
    width: size,
    height: size,
    left: '50%',
    marginLeft: -size / 2,
    bottom: lift,
  };

  return (
    <AbsoluteFill style={{pointerEvents: 'none', opacity}}>
      <div style={box}>
        <Img
          src={staticFile('kin-logo.png')}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            filter: `drop-shadow(0 2px 10px rgba(20,8,0,0.95)) brightness(${
              0.88 + 0.22 * fade
            })`,
          }}
        />
        {/* The shimmer: a diagonal light band clipped to the mark's own alpha. The PNG is
            1120x1120 RGBA, so it can be its own mask — no separate matte needed, and the
            highlight can never spill outside the artwork. */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            WebkitMaskImage: `url(${staticFile('kin-logo.png')})`,
            maskImage: `url(${staticFile('kin-logo.png')})`,
            WebkitMaskSize: 'contain',
            maskSize: 'contain',
            WebkitMaskPosition: 'center',
            maskPosition: 'center',
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
            background: `linear-gradient(105deg, transparent ${p - 18}%, rgba(255,244,210,${shine}) ${p}%, transparent ${p + 18}%)`,
            mixBlendMode: 'screen',
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
