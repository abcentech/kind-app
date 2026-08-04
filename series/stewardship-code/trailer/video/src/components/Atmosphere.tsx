import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {PALETTE} from '../timeline';

/** Deterministic pseudo-random — Math.random() would flicker between rendered frames. */
export const rand = (seed: number) => {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

/**
 * Floating dust motes. The style bible asks for "fine floating dust motes" in every
 * shot; drifting them slowly is what keeps the flat vector scenes from reading as a
 * static slide deck.
 */
export const Motes: React.FC<{count?: number; opacity?: number; tint?: string}> = ({
  count = 60,
  opacity = 0.5,
  tint = PALETTE.goldHot,
}) => {
  const frame = useCurrentFrame();
  const {width, height, fps} = useVideoConfig();
  const t = frame / fps;

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {new Array(count).fill(0).map((_, i) => {
        const speed = 4 + rand(i + 1) * 10;
        const size = 1.5 + rand(i + 99) * 4.5;
        const x = rand(i + 7) * width + Math.sin(t * 0.4 + i) * width * 0.02;
        // wrap vertically so motes re-enter from the bottom instead of running out
        const y = (rand(i + 13) * height - t * speed + height * 4) % height;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: size,
              height: size,
              borderRadius: '50%',
              background: tint,
              opacity: opacity * (0.25 + rand(i + 21) * 0.75),
              filter: `blur(${size * 0.4}px)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** Anamorphic-ish falloff. Keeps the eye centred and hides the hard frame edges. */
export const Vignette: React.FC<{strength?: number}> = ({strength = 0.85}) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(ellipse at 50% 48%, rgba(0,0,0,0) 30%, rgba(0,0,0,${
        strength * 0.55
      }) 72%, rgba(0,0,0,${strength}) 100%)`,
      pointerEvents: 'none',
    }}
  />
);

/**
 * Film grain, drawn as a repeating radial-gradient rather than an image so the bundle
 * stays asset-free. Re-seeded every 3 frames — per-frame reseeding reads as noise TV.
 */
export const Grain: React.FC<{opacity?: number}> = ({opacity = 0.05}) => {
  const frame = useCurrentFrame();
  const step = Math.floor(frame / 3);
  const ox = Math.floor(rand(step) * 200);
  const oy = Math.floor(rand(step + 500) * 200);
  return (
    <AbsoluteFill
      style={{
        opacity,
        pointerEvents: 'none',
        mixBlendMode: 'overlay',
        backgroundImage:
          'radial-gradient(rgba(255,255,255,0.9) 0.5px, transparent 0.6px)',
        backgroundSize: '3px 3px',
        backgroundPosition: `${ox}px ${oy}px`,
      }}
    />
  );
};

/** Warm anamorphic streak used on the shockwaves and the sunrise. */
export const LensStreak: React.FC<{y: string; width: number; opacity: number}> = ({
  y,
  width,
  opacity,
}) => (
  <div
    style={{
      position: 'absolute',
      top: y,
      left: '50%',
      transform: 'translate(-50%,-50%)',
      width: `${width}%`,
      height: 3,
      background: `linear-gradient(90deg, transparent, ${PALETTE.goldHot}, transparent)`,
      opacity,
      filter: 'blur(2px)',
    }}
  />
);
