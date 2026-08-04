"""
Original score + SFX for THE STEWARDSHIP CODE trailer.

Everything here is synthesised from scratch — no sample libraries, no AI music
service, no third-party stems. That is deliberate: brief §7 wants every asset
cleared for commercial use with the licence logged, and "we wrote it in code"
is the only licence position that needs no one's permission.

Cue sheet is locked to the DELIVERED VO (public/vo.m4a, 37.4s). Every timestamp
below is an absolute second in the finished trailer and matches src/timeline.ts.
Change one, change both.

    python synth.py            writes music-bed.wav, sfx.wav, mix stems
"""
import numpy as np
from scipy.io import wavfile
from scipy.signal import fftconvolve, butter, sosfilt
import os

SR = 48000
DUR = 37.55          # a shade past the 37.4s VO so the final tail can ring out
N = int(SR * DUR)
BPM = 92.0
BEAT = 60.0 / BPM    # 0.652s

HERE = os.path.dirname(os.path.abspath(__file__))


# ── helpers ────────────────────────────────────────────────────────────────
def buf():
    return np.zeros(N, dtype=np.float64)


def idx(t):
    return int(t * SR)


def place(dst, src, t, gain=1.0):
    """Mix `src` into `dst` starting at second `t`, clipping at the buffer end.
    Clips against len(dst), not the global N — the SFX builders assemble into
    their own short local buffers."""
    i = idx(t)
    if i >= len(dst):
        return
    n = min(len(src), len(dst) - i)
    dst[i:i + n] += src[:n] * gain


def env_adsr(n, a, d, s, r, sus=0.7):
    """Sample-count ADSR. a/d/r in seconds, s = sustain length in seconds."""
    A, D, S, R = int(a * SR), int(d * SR), int(s * SR), int(r * SR)
    total = A + D + S + R
    e = np.zeros(max(n, total))
    e[:A] = np.linspace(0, 1, A) if A else []
    e[A:A + D] = np.linspace(1, sus, D) if D else []
    e[A + D:A + D + S] = sus
    e[A + D + S:total] = np.linspace(sus, 0, R) if R else []
    return e[:n]


def env_exp(n, tau):
    return np.exp(-np.arange(n) / (tau * SR))


def lp(x, fc, order=4):
    sos = butter(order, min(fc / (SR / 2), 0.99), btype='low', output='sos')
    return sosfilt(sos, x)


def hp(x, fc, order=4):
    sos = butter(order, max(fc / (SR / 2), 1e-4), btype='high', output='sos')
    return sosfilt(sos, x)


def bp(x, f1, f2, order=4):
    sos = butter(order, [max(f1 / (SR / 2), 1e-4), min(f2 / (SR / 2), 0.99)],
                 btype='band', output='sos')
    return sosfilt(sos, x)


def note(name, octave):
    """Equal temperament. A4 = 440."""
    semis = {'C': -9, 'C#': -8, 'D': -7, 'D#': -6, 'E': -5, 'F': -4,
             'F#': -3, 'G': -2, 'G#': -1, 'A': 0, 'A#': 1, 'B': 2}
    return 440.0 * 2 ** ((semis[name] + (octave - 4) * 12) / 12.0)


# ── reverb: a synthetic hall, made from decaying filtered noise ────────────
def make_ir(seconds=2.6, decay=1.1, seed=7, predelay=0.02, damp=6500):
    rng = np.random.default_rng(seed)
    n = int(seconds * SR)
    ir = rng.standard_normal(n) * np.exp(-np.arange(n) / (decay * SR))
    ir = lp(ir, damp)
    # early reflections give it a sense of a real room rather than a wash
    for t, g in [(0.011, 0.6), (0.023, 0.45), (0.037, 0.32), (0.058, 0.24)]:
        i = int(t * SR)
        ir[i:i + 400] += rng.standard_normal(400) * g
    pre = np.zeros(int(predelay * SR))
    ir = np.concatenate([pre, ir])
    return ir / np.max(np.abs(ir))


IR = make_ir()
IR_BIG = make_ir(seconds=4.2, decay=1.9, seed=11, damp=5200)


def verb(x, ir=IR, wet=0.3):
    w = fftconvolve(x, ir)[:len(x)]
    w /= (np.max(np.abs(w)) + 1e-9)
    return (1 - wet) * x + wet * w * np.max(np.abs(x))


# ── instruments ────────────────────────────────────────────────────────────
def strings(freq, dur, detune=0.7, voices=7, bright=2200, attack=0.9,
            release=1.2, vib=0.25, seed=1):
    """
    Bowed-string stack: several slightly detuned saw-ish voices, each with its
    own slow drift, low-passed to take the buzz off. Layering odd numbers of
    voices avoids the phasey doubling you get from pairs.
    """
    rng = np.random.default_rng(seed)
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for v in range(voices):
        cents = (v - voices // 2) * detune
        f = freq * 2 ** (cents / 1200.0)
        # slow independent drift — real sections are never perfectly in tune
        drift = 1 + 0.0016 * np.sin(2 * np.pi * (0.12 + 0.05 * v) * t + rng.random() * 6)
        vibrato = 1 + (vib / 100.0) * np.sin(2 * np.pi * 5.2 * t + rng.random() * 6)
        ph = np.cumsum(2 * np.pi * f * drift * vibrato / SR)
        # a saw built from a few harmonics — cheaper and smoother than a raw ramp
        sig = np.zeros(n)
        for h in range(1, 9):
            sig += np.sin(ph * h) / h
        out += sig / voices
    out = lp(out, bright)
    sus = max(dur - attack - release, 0.01)
    return out * env_adsr(n, attack, 0.25, sus, release, sus=0.82)


def cello_drone(freq, dur, seed=3):
    """Lower, darker, rosin-y. Gets its own function because the trailer leans
    on it for ten straight seconds and it must not sound like a synth pad."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(seed)
    body = strings(freq, dur, detune=1.1, voices=5, bright=900, attack=2.2,
                   release=2.0, vib=0.18, seed=seed)
    # bow noise, tracked to the fundamental
    noise = bp(rng.standard_normal(n), freq * 1.5, freq * 6) * 0.05
    noise *= (0.6 + 0.4 * np.sin(2 * np.pi * 0.3 * t))
    return body + noise * env_adsr(n, 2.2, 0.3, max(dur - 4.2, 0.1), 2.0, sus=0.8)


def choir(freq, dur, seed=5):
    """Ah-vowel-ish: a formant pair over a detuned stack, plus breath."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(seed)
    stack = np.zeros(n)
    for v, cents in enumerate([-9, -4, 0, 5, 11]):
        f = freq * 2 ** (cents / 1200.0)
        vibrato = 1 + 0.004 * np.sin(2 * np.pi * (4.6 + 0.3 * v) * t + rng.random() * 6)
        ph = np.cumsum(2 * np.pi * f * vibrato / SR)
        for h, g in [(1, 1.0), (2, 0.5), (3, 0.33), (4, 0.2), (5, 0.14), (6, 0.1)]:
            stack += np.sin(ph * h) * g / 5
    # vowel formants for "ah"
    voiced = bp(stack, 600, 1000) * 1.0 + bp(stack, 1000, 1500) * 0.55 + lp(stack, 400) * 0.8
    breath = bp(rng.standard_normal(n), 1800, 5200) * 0.03
    e = env_adsr(n, 1.1, 0.4, max(dur - 2.9, 0.1), 1.8, sus=0.85)
    return (voiced * 0.5 + breath) * e


def piano(freq, dur=2.4, seed=2):
    """Struck note: inharmonic partials, hammer thud, fast attack, long decay."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    # slight inharmonicity — the reason real piano partials aren't integer multiples
    B = 0.0004
    for h, g in [(1, 1.0), (2, 0.52), (3, 0.31), (4, 0.19), (5, 0.12),
                 (6, 0.08), (7, 0.05), (8, 0.035)]:
        fh = freq * h * np.sqrt(1 + B * h * h)
        out += np.sin(2 * np.pi * fh * t) * g * np.exp(-t / (1.9 / (1 + 0.35 * h)))
    rng = np.random.default_rng(seed)
    thud = lp(rng.standard_normal(int(0.02 * SR)), 900) * 0.5
    out[:len(thud)] += thud * np.exp(-np.arange(len(thud)) / (0.006 * SR))
    return out / (np.max(np.abs(out)) + 1e-9)


def sub_pulse(freq, dur, seed=4):
    """Felt more than heard. Carries the shots where the music is 'silent'."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = np.sin(2 * np.pi * freq * t) + 0.3 * np.sin(2 * np.pi * freq * 2 * t)
    return s * env_adsr(n, 0.06, 0.2, max(dur - 0.9, 0.05), 0.6, sus=0.6)


# ── SFX ────────────────────────────────────────────────────────────────────
def vault_click(seed=1, weight=1.0):
    """Heavy mechanism: a metallic transient, a bolt thud, and a short ring."""
    rng = np.random.default_rng(seed)
    n = int(0.55 * SR)
    t = np.arange(n) / SR
    # the strike
    strike = bp(rng.standard_normal(n), 1800, 7000) * np.exp(-t / 0.012)
    # the bolt seating
    thud = np.sin(2 * np.pi * 62 * t) * np.exp(-t / 0.09) * 1.3 * weight
    thud += np.sin(2 * np.pi * 41 * t) * np.exp(-t / 0.14) * 0.9 * weight
    # the ring left in the metal
    ring = sum(np.sin(2 * np.pi * f * t) * np.exp(-t / d) * g
               for f, d, g in [(430, 0.22, 0.3), (611, 0.16, 0.22), (884, 0.1, 0.14)])
    out = strike * 0.9 + thud + ring
    return out / (np.max(np.abs(out)) + 1e-9)


def chain_rattle(dur=1.6, density=42, seed=9):
    """Many small metal-on-metal ticks, thinning out as the chain goes taut."""
    rng = np.random.default_rng(seed)
    n = int(dur * SR)
    out = np.zeros(n)
    for i in range(density):
        # front-loaded: the eruption is violent, the tightening is sparse
        t0 = (i / density) ** 1.7 * dur * 0.95
        ln = int(0.05 * SR)
        tt = np.arange(ln) / SR
        f1 = 2200 + rng.random() * 3500
        tick = bp(rng.standard_normal(ln), f1, f1 * 2.2) * np.exp(-tt / 0.008)
        tick += np.sin(2 * np.pi * (700 + rng.random() * 900) * tt) * np.exp(-tt / 0.02) * 0.4
        place(out, tick, t0, gain=0.5 + rng.random() * 0.5)
    return out / (np.max(np.abs(out)) + 1e-9)


def coin_ring(seed=6, f0=2650):
    """A struck disc: two close partials beating against each other, long tail."""
    n = int(2.2 * SR)
    t = np.arange(n) / SR
    out = (np.sin(2 * np.pi * f0 * t) * np.exp(-t / 0.9)
           + np.sin(2 * np.pi * f0 * 1.006 * t) * np.exp(-t / 0.85) * 0.9
           + np.sin(2 * np.pi * f0 * 2.76 * t) * np.exp(-t / 0.3) * 0.35
           + np.sin(2 * np.pi * f0 * 5.4 * t) * np.exp(-t / 0.12) * 0.15)
    rng = np.random.default_rng(seed)
    strike = bp(rng.standard_normal(int(0.01 * SR)), 3000, 9000)
    out[:len(strike)] += strike * np.exp(-np.arange(len(strike)) / (0.002 * SR)) * 0.6
    return out / (np.max(np.abs(out)) + 1e-9)


def coin_spin_to_rest(dur=2.6, seed=8):
    """A disc spinning down on wood: the wobble accelerates as it settles."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    # wobble rate ramps from slow to a fast blur, the classic settling sound
    rate = 3.0 + 26.0 * (t / dur) ** 2.6
    phase = np.cumsum(2 * np.pi * rate / SR)
    contact = (np.sin(phase) * 0.5 + 0.5) ** 3
    rng = np.random.default_rng(seed)
    body = bp(rng.standard_normal(n), 900, 4200)
    tone = np.sin(2 * np.pi * 1750 * t) * 0.5 + np.sin(2 * np.pi * 2380 * t) * 0.3
    out = (body * 0.7 + tone) * contact * np.exp(-t / (dur * 0.7))
    return out / (np.max(np.abs(out)) + 1e-9)


def phone_buzz(dur=0.42):
    """Haptic on a hard surface — low motor with a rattle riding on it."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    gate = (np.sin(2 * np.pi * 46 * t) > 0).astype(float)
    motor = np.sin(2 * np.pi * 92 * t) * 0.8 + np.sin(2 * np.pi * 184 * t) * 0.3
    rng = np.random.default_rng(12)
    rattle = bp(rng.standard_normal(n), 1200, 4000) * 0.25
    out = (motor + rattle) * gate * env_adsr(n, 0.005, 0.02, dur - 0.08, 0.05, sus=0.9)
    return out / (np.max(np.abs(out)) + 1e-9)


def shatter(dur=2.4, shards=70, seed=21):
    """Glass breaking, resolving into wind chimes — the script asks for exactly
    this transition on the fourth vault click."""
    rng = np.random.default_rng(seed)
    n = int(dur * SR)
    out = np.zeros(n)
    burst = bp(rng.standard_normal(int(0.25 * SR)), 2500, 12000)
    burst *= np.exp(-np.arange(len(burst)) / (0.045 * SR))
    place(out, burst, 0.0, 1.0)
    # chimes tuned to a D-minor pentatonic so they land musically, not randomly
    scale = [note(nm, o) for nm, o in
             [('D', 6), ('F', 6), ('G', 6), ('A', 6), ('C', 7), ('D', 7)]]
    for i in range(shards):
        t0 = 0.02 + (i / shards) ** 1.4 * dur * 0.7
        f = scale[rng.integers(0, len(scale))] * (1 + rng.standard_normal() * 0.002)
        ln = int(1.1 * SR)
        tt = np.arange(ln) / SR
        ch = (np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.55)
              + np.sin(2 * np.pi * f * 2.7 * tt) * np.exp(-tt / 0.16) * 0.3)
        place(out, ch, t0, gain=(0.16 + rng.random() * 0.3) * (1 - i / shards * 0.6))
    return out / (np.max(np.abs(out)) + 1e-9)


def riser(dur, f_start=180, f_end=5200, seed=15):
    """Filtered-noise sweep. Used once, into the vault sequence."""
    rng = np.random.default_rng(seed)
    n = int(dur * SR)
    x = rng.standard_normal(n)
    # sweep by processing in blocks — cheap but smooth enough at this length
    out = np.zeros(n)
    blocks = 64
    bl = n // blocks
    for b in range(blocks):
        p = b / (blocks - 1)
        fc = f_start * (f_end / f_start) ** (p ** 1.5)
        seg = x[b * bl:(b + 1) * bl + 1024]
        filt = bp(seg, fc * 0.7, fc * 1.5)
        out[b * bl:b * bl + len(filt)] += filt[:n - b * bl]
    t = np.arange(n) / SR
    return out * (t / dur) ** 1.8 / (np.max(np.abs(out)) + 1e-9)


def impact(seed=31, weight=1.0):
    """Cinematic hit for the title card."""
    rng = np.random.default_rng(seed)
    n = int(3.0 * SR)
    t = np.arange(n) / SR
    boom = (np.sin(2 * np.pi * 44 * t * (1 - 0.15 * t)) * np.exp(-t / 0.55)
            + np.sin(2 * np.pi * 29 * t) * np.exp(-t / 0.9) * 0.8) * weight
    crack = bp(rng.standard_normal(n), 900, 6000) * np.exp(-t / 0.05) * 0.5
    out = boom + crack
    return out / (np.max(np.abs(out)) + 1e-9)


def scratch(dur=0.3, seed=1):
    """Pencil on paper."""
    rng = np.random.default_rng(seed)
    n = int(dur * SR)
    x = bp(rng.standard_normal(n), 1800, 7000)
    t = np.arange(n) / SR
    x *= (0.5 + 0.5 * np.sin(2 * np.pi * 14 * t))
    return x * np.exp(-t / 0.12) / (np.max(np.abs(x)) + 1e-9)


def sweep_broom(dur=0.5, seed=2):
    rng = np.random.default_rng(seed)
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = bp(rng.standard_normal(n), 700, 4500)
    return x * np.sin(np.pi * t / dur) ** 2 / (np.max(np.abs(x)) + 1e-9)


def hammer_tap(seed=3):
    rng = np.random.default_rng(seed)
    n = int(0.4 * SR)
    t = np.arange(n) / SR
    x = (bp(rng.standard_normal(n), 1200, 5000) * np.exp(-t / 0.01)
         + np.sin(2 * np.pi * 320 * t) * np.exp(-t / 0.05) * 0.6
         + np.sin(2 * np.pi * 180 * t) * np.exp(-t / 0.08) * 0.4)
    return x / (np.max(np.abs(x)) + 1e-9)


# ══ THE SCORE ══════════════════════════════════════════════════════════════
# D minor throughout, turning to D major on the last chord — the oldest trick
# there is for "trapped resolves to free", and it is the whole emotional arc.
music = buf()

D2, A2, D3, F3, A3, Bb2, Bb3, C3, C4, D4, F4, A4, D5, F5, A5 = (
    note('D', 2), note('A', 2), note('D', 3), note('F', 3), note('A', 3),
    note('A#', 2), note('A#', 3), note('C', 3), note('C', 4), note('D', 4),
    note('F', 4), note('A', 4), note('D', 5), note('F', 5), note('A', 5))
FS3, FS4, FS5 = note('F#', 3), note('F#', 4), note('F#', 5)

# ── SHOT 1 · THE LOCK (0.0–10.2) ───────────────────────────────────────────
# "A low cello drone entering under it." Nothing else. The VO owns this shot.
place(music, cello_drone(D2, 11.5, seed=3), 1.4, 0.30)
place(music, cello_drone(A2, 9.0, seed=4), 3.4, 0.14)
place(music, sub_pulse(D2 / 2, 3.0), 0.2, 0.10)

# ── SHOT 2 · THE CHAINS (10.2–15.8) ────────────────────────────────────────
# "Rising drone." The fifth becomes a minor sixth — the interval tightens with
# the chains. Then everything drops for "And a terrible god."
place(music, cello_drone(D2, 6.0, seed=6), 9.9, 0.34)
place(music, strings(A2, 3.6, voices=5, bright=1100, attack=1.4, seed=7), 10.3, 0.16)
place(music, strings(Bb2, 2.6, voices=5, bright=1000, attack=1.0, seed=8), 11.9, 0.20)
# the drop: darker, quieter, no top end. Menace is quiet.
place(music, cello_drone(Bb2 / 2, 4.4, seed=9), 13.2, 0.30)
place(music, sub_pulse(29.0, 2.4), 13.3, 0.22)

# ── SHOT 3 · THE QUESTION (15.8–22.3) ──────────────────────────────────────
# "Everything drops to near-silence. A single sustained high string. Distant,
# wide reverb." This is the quietest point in the trailer by a wide margin.
q = buf()
place(q, strings(A4, 6.6, voices=5, detune=0.5, bright=2600, attack=2.4,
                 release=2.4, vib=0.3, seed=11), 15.9, 0.22)
place(q, strings(D5, 4.0, voices=3, detune=0.4, bright=3000, attack=1.8,
                 release=1.8, seed=12), 19.4, 0.13)
q = verb(q, IR_BIG, wet=0.55)
music += q
place(music, sub_pulse(D2 / 2, 5.0), 16.2, 0.07)

# ── SHOT 4 · THE FOUR CODES (22.3–27.4) ────────────────────────────────────
# A riser into the sequence, a struck piano note on each of the four clicks,
# and — per the script — the music CUT DEAD for the half-second before click 4.
place(music, riser(1.9, 150, 4200), 20.9, 0.13)

# Measured speech onsets, not ASR word timings — see the note on CODE_CLICKS in
# src/timeline.ts. Keep these two lists identical.
CLICKS = [22.72, 23.75, 24.60, 25.48]
CHORD = [
    [D3, F3, A3],        # Dm   — OWNERSHIP
    [Bb2, D3, F3],       # Bb   — FAITHFULNESS
    [C3, note('E', 3), note('G', 3)],  # C — MASTERY
    [D3, FS3, A3],       # D major — MULTIPLICATION, the turn to hope
]
for i, (ct, ch) in enumerate(zip(CLICKS, CHORD)):
    last = i == 3
    for f in ch:
        place(music, piano(f, 2.8 if last else 1.6, seed=20 + i),
              ct, 0.30 if last else 0.19)
    if not last:
        # a short string swell between clicks, deliberately cut off by the next
        place(music, strings(ch[0] * 2, 1.0, voices=5, attack=0.25, release=0.35,
                             bright=1800, seed=30 + i), ct, 0.10)

# The silence before click four. Applied here on the dry signal, and AGAIN after
# the reverb pass at the bottom of the file — gating only the dry signal left the
# hall tail smearing across the gap, which measured as a 13 dB dip rather than
# the dead cut the script asks for.
#
# The script asks for half a second. The delivered read only leaves 260ms of true
# silence between "mastery" and "multiplication" (25.20–25.46 measured), so the gate
# is 300ms, opening as "mastery" decays. Holding the full 500ms would have muted the
# music underneath a spoken word, which is worse than a shorter hole.
GATE_A, GATE_B = 25.16, 25.46


def cut_dead(x, floor=0.012, ramp_s=0.04):
    a, b = idx(GATE_A), idx(GATE_B)
    r = int(ramp_s * SR)
    x[a:a + r] *= np.linspace(1, floor, r)
    x[a + r:b] *= floor        # not absolute zero — a true null clicks on the way out
    return x


music = cut_dead(music)

# click four lands and the room opens up
place(music, strings(D4, 3.2, voices=7, attack=0.05, release=1.4, bright=2400, seed=35),
      CLICKS[3], 0.17)
place(music, strings(FS4, 3.0, voices=5, attack=0.08, release=1.4, bright=2600, seed=36),
      CLICKS[3] + 0.03, 0.11)

# ── SHOT 5 · PUT IT TO WORK (27.4–32.0) ────────────────────────────────────
# "Percussive, building. Strings climbing underneath."
for i, (f, t0) in enumerate([(D3, 27.5), (F3, 28.6), (note('G', 3), 29.8), (A3, 30.9)]):
    place(music, strings(f, 2.0, voices=5, attack=0.3, release=0.7, bright=1700,
                         seed=40 + i), t0, 0.13 + i * 0.022)
    place(music, strings(f * 2, 1.8, voices=3, attack=0.35, release=0.6, bright=2400,
                         seed=50 + i), t0, 0.07 + i * 0.014)
place(music, sub_pulse(D2 / 2, 4.6), 27.5, 0.16)

# ── SHOT 6 · SUNRISE (32.0–37.4) ───────────────────────────────────────────
# "Full strings and choir resolving to one clean sustained note. Let it ring."
# D major. The Picardy third against the D minor of everything before it.
sun = buf()
for f, g, sd in [(D3, 0.20, 60), (A3, 0.15, 61), (FS4, 0.13, 62), (D4, 0.16, 63),
                 (A4, 0.10, 64), (FS5, 0.07, 65)]:
    place(sun, strings(f, 5.6, voices=7, attack=0.7, release=2.6, bright=2600, seed=sd),
          32.0, g)
for f, g, sd in [(D4, 0.12, 70), (FS4, 0.09, 71), (A4, 0.08, 72), (D5, 0.06, 73)]:
    place(sun, choir(f, 5.4, seed=sd), 32.2, g)
sun = verb(sun, IR_BIG, wet=0.34)
music += sun
place(music, sub_pulse(note('D', 1), 5.4), 32.0, 0.20)
# the one clean sustained note left ringing into the fade
place(music, strings(D5, 4.4, voices=3, detune=0.35, attack=0.5, release=2.6,
                     bright=3000, seed=80), 33.0, 0.09)

music = cut_dead(verb(music, IR, wet=0.16))


# ══ SFX ════════════════════════════════════════════════════════════════════
sfx = buf()

# SHOT 1 — "A coin spinning to rest on wood. One phone buzz."
place(sfx, coin_spin_to_rest(2.8), 0.15, 0.30)
place(sfx, phone_buzz(), 6.15, 0.26)        # lands on the buzz-flash in Lock.tsx

# SHOT 2 — "Chain links tightening, close and metallic."
place(sfx, chain_rattle(1.7, 46, seed=9), 10.55, 0.36)
place(sfx, chain_rattle(1.1, 16, seed=14), 12.25, 0.16)   # the taut creak after
place(sfx, impact(seed=33, weight=0.7), 13.35, 0.16)      # "terrible god"

# SHOT 3 — near-silence by design. One distant low swell, nothing else.
place(sfx, verb(impact(seed=34, weight=0.4), IR_BIG, 0.7), 15.85, 0.07)

# SHOT 4 — four heavy vault clicks, then glass into wind chimes on the fourth.
for i, ct in enumerate(CLICKS):
    last = i == 3
    place(sfx, vault_click(seed=40 + i, weight=1.0 + 0.35 * i), ct,
          0.42 if last else 0.30 + 0.03 * i)
place(sfx, shatter(2.6, 80), CLICKS[3] + 0.02, 0.30)

# SHOT 5 — "A pencil scratch, a broom, a coin ring, a hammer tap — each cut on
# the beat." Beats are real BPM subdivisions off 27.5, not eyeballed.
b0 = 27.52
place(sfx, scratch(0.34, seed=1), b0 + 0 * BEAT, 0.16)
place(sfx, sweep_broom(0.52, seed=2), b0 + 2 * BEAT, 0.15)
place(sfx, coin_ring(seed=6, f0=2900), b0 + 4 * BEAT, 0.14)
place(sfx, hammer_tap(seed=3), b0 + 6 * BEAT, 0.17)
place(sfx, scratch(0.28, seed=4), b0 + 7 * BEAT, 0.11)

# SHOT 6 — "The coin rings as it's caught." Then the title impact.
place(sfx, coin_ring(seed=7, f0=2450), 32.55, 0.24)
place(sfx, impact(seed=36, weight=1.0), 32.05, 0.22)
place(sfx, verb(coin_ring(seed=8, f0=3100), IR_BIG, 0.6), 34.4, 0.10)

sfx = verb(sfx, IR, wet=0.20)


# ══ output ═════════════════════════════════════════════════════════════════
def stereo(mono, width=0.12, seed=1):
    """Gentle Haas widening. Kept small so the mix stays mono-safe for phones."""
    d = int(width * 0.01 * SR)
    l = mono.copy()
    r = np.concatenate([np.zeros(d), mono[:-d]]) if d else mono.copy()
    return np.stack([l, r], axis=1)


def write(path, mono, peak=0.89):
    x = mono / (np.max(np.abs(mono)) + 1e-9) * peak
    st = stereo(x)
    wavfile.write(path, SR, (st * 32767).astype(np.int16))
    return np.max(np.abs(x))


os.makedirs(HERE, exist_ok=True)
write(os.path.join(HERE, 'music-bed.wav'), music)
write(os.path.join(HERE, 'sfx.wav'), sfx)

# a music+sfx stem, pre-balanced, for anyone cutting this outside Remotion
bedmix = music / (np.max(np.abs(music)) + 1e-9) * 0.62 + \
         sfx / (np.max(np.abs(sfx)) + 1e-9) * 0.72
write(os.path.join(HERE, 'music-and-sfx.wav'), bedmix)

print(f'wrote music-bed.wav, sfx.wav, music-and-sfx.wav  ({DUR}s @ {SR}Hz)')
