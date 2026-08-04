#!/usr/bin/env bash
# Conform the six Flow plates to the trailer timeline.
#
# Every plate arrives from Veo 3.1 Quality as 1280x720 / 24fps / exactly 8.000s. The cut
# needs six different lengths at 1920x1080 / 30fps, so each one is retimed, upscaled and
# graded here rather than in Remotion — ffmpeg does this once, offline, instead of the
# renderer re-decoding and rescaling on every frame of every render pass.
#
#   bash plates/prep.sh
set -euo pipefail
cd "$(dirname "$0")/.."

# A deliberately light unifying grade. The plates run from a near-black bedroom to a
# blown-out sunrise and a heavy LUT would flatten exactly the contrast the score is
# written around, so this only nudges them onto a common contrast and warmth.
GRADE="eq=contrast=1.045:saturation=1.06:gamma_r=1.01:gamma_b=0.985"
SCALE="scale=1920:1080:flags=lanczos"

conform() { # conform <shot> <filter-chain>
  ffmpeg -v error -i "plates/raw_shot$1.mp4" \
    -vf "$2,$SCALE,$GRADE,format=yuv420p" \
    -an -r 30 -c:v libx264 -crf 16 -preset slow \
    "plates/shot$1_16x9.mp4" -y
  printf '  shot%s  ' "$1"
  ffprobe -v error -select_streams v:0 -show_entries stream=width,height,nb_frames \
    -show_entries format=duration -of csv=p=0 "plates/shot$1_16x9.mp4"
}

# Shot 1 is the only plate that has to grow: 8.0s of footage over a 10.2s shot. Veo
# Quality is fixed at 8s with no duration control, so the choice is slow it or cut back to
# a hold. Slowing wins here because it is the calmest shot in the piece — a slow push from
# the wide onto Micah's face — and 1.275x reads as deliberate rather than soft.
# minterpolate synthesises the in-between frames; a plain setpts stretch judders on a move
# this slow.
echo "conforming (shot 1 uses motion interpolation, this one is slow)..."
#
# Every plate is conformed a few frames LONGER than its slot, never exactly equal. A plate
# that ends on the same frame the Sequence does will show one or two frames of bare
# background if any rounding goes the wrong way, and 1.275 here produced 10.10s against a
# 10.20s shot — three frames short. Overshoot and let Remotion cut it.
conform 1 "minterpolate=fps=30:mi_mode=mci:mc_mode=aobmc:vsbmc=1,setpts=1.30*PTS"

# The rest are trims. In-points chosen per shot, not mechanically from zero:
conform 2 "trim=0:5.6,setpts=PTS-STARTPTS"          # last second of the plate falls dark
conform 3 "trim=1.4:8.0,setpts=PTS-STARTPTS"        # skip to the pull-out; the hand is the beat
conform 4 "trim=0:5.1,setpts=PTS-STARTPTS"          # vault rings from the top
conform 6 "trim=0.2:5.6,setpts=PTS-STARTPTS"        # disc raise lands on the title impact

# Shot 5 is the opposite problem: four montage moments spread over 8s, needed in 4.6s.
# Speeding up 1.74x is on-brief — the shot is specced as "a fast rhythmic montage" and the
# score puts four percussion hits under it. Frames are dropped rather than interpolated;
# on a cut this quick nobody reads the difference.
conform 5 "setpts=PTS/1.7391,trim=0:4.6,setpts=PTS-STARTPTS"

echo "contact sheets..."
for s in 1 2 3 4 5 6; do
  ffmpeg -v error -i "plates/shot${s}_16x9.mp4" \
    -vf "select='not(mod(n\,20))',scale=320:180,tile=4x2" -frames:v 1 "plates/qc/shot$s.jpg" -y
done
echo PREP-OK
