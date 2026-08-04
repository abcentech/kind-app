#!/usr/bin/env bash
# Conform the 9:16 Flow plates to the trailer timeline.
#
# The vertical set was generated separately in Flow as native 9:16 rather than cropped out
# of the 16:9 masters, which is the whole point of doing it twice: shot 1 reframes from a
# wide bedroom to a tight portrait, and a centre-crop of the landscape plate would have put
# Micah's head against the top edge.
#
# Plates arrive as 720x1280 / 24fps / exactly 8.000s (Omni Flash, 720p). The retimes below
# are identical to prep.sh — same shots, same lengths, same reasons — because both aspects
# cut to the same voiceover.
#
#   bash plates/prep9.sh
set -euo pipefail
cd "$(dirname "$0")/.."

GRADE="eq=contrast=1.045:saturation=1.06:gamma_r=1.01:gamma_b=0.985"
SCALE="scale=1080:1920:flags=lanczos"

conform() { # conform <shot> <filter-chain>
  ffmpeg -v error -i "plates/raw9_shot$1.mp4" \
    -vf "$2,$SCALE,$GRADE,format=yuv420p" \
    -an -r 30 -c:v libx264 -crf 16 -preset slow \
    "plates/shot$1_9x16.mp4" -y
  printf '  shot%s  ' "$1"
  ffprobe -v error -select_streams v:0 -show_entries stream=width,height,nb_frames \
    -show_entries format=duration -of csv=p=0 "plates/shot$1_9x16.mp4"
}

echo "conforming (shot 1 uses motion interpolation, this one is slow)..."
# 8.0s of footage over a 10.2s shot. Same reasoning as prep.sh: slowed rather than held,
# and overshot past the slot so Remotion does the cut instead of rounding exposing a frame
# of bare background at the tail.
conform 1 "minterpolate=fps=30:mi_mode=mci:mc_mode=aobmc:vsbmc=1,setpts=1.30*PTS"

conform 2 "trim=0:5.6,setpts=PTS-STARTPTS"
conform 3 "trim=1.4:8.0,setpts=PTS-STARTPTS"
conform 4 "trim=0:5.1,setpts=PTS-STARTPTS"
conform 5 "setpts=PTS/1.7391,trim=0:4.6,setpts=PTS-STARTPTS"

# ---------------------------------------------------------------------------------------
# Shot 6 has NO native 9:16 plate — only five verticals were generated. This derives one
# from the 16:9 master so the end card is illustrated like the other five rather than
# dropping to the code-rendered sunrise, which would be a visible style break at the single
# most important moment in the piece.
#
# It is a compromise and it looks like one: cropping 1280x720 to 405x720 and scaling that to
# 1080x1920 is a 2.7x upscale, so this plate is softer than its neighbours. A mild unsharp
# claws some of it back but cannot invent detail. Replace it with a native 9:16 generation
# when there are credits to spend.
#
# The crop sits slightly left of centre (0.46) because the raised fist and the two
# silhouettes are grouped left of frame in the landscape plate; a true centre crop clipped
# the fist.
#
# It also uses a DIFFERENT range from the 16:9 conform, which is the important part. The
# plate pushes in hard, and once cropped to 9:16 that push fills the whole frame with a fist
# from about 2.6s — landing a giant hand exactly where 'THE STEWARDSHIP CODE' has to sit.
# The first attempt did use 0.2-5.6 to match prep.sh and the title was unreadable over it.
# So the vertical takes only the wide opening (0.2-2.6, both kids and open sky) and slows it
# 2.3x to fill the slot. A held, slowed rise suits an end card; a face full of knuckles does
# not.
echo "shot 6 derived from the 16:9 plate (see comment) ..."
ffmpeg -v error -i "plates/raw_shot6.mp4" \
  -vf "trim=0.2:2.6,setpts=2.3*(PTS-STARTPTS),minterpolate=fps=30:mi_mode=mci:mc_mode=aobmc:vsbmc=1,crop=in_h*9/16:in_h:(in_w-in_h*9/16)*0.46:0,$SCALE,unsharp=5:5:0.7,$GRADE,format=yuv420p" \
  -an -r 30 -c:v libx264 -crf 16 -preset slow \
  "plates/shot6_9x16.mp4" -y
printf '  shot6  '
ffprobe -v error -select_streams v:0 -show_entries stream=width,height,nb_frames \
  -show_entries format=duration -of csv=p=0 "plates/shot6_9x16.mp4"

# Remotion can only staticFile() things under video/public, so the conformed plates have to
# live there too. This copy was done by hand for the 16:9 set and that is exactly how a
# stale plate ends up in a render — the script does it now.
echo "publishing to video/public/plates ..."
mkdir -p video/public/plates
cp plates/shot[1-6]_9x16.mp4 video/public/plates/

echo "contact sheets..."
for s in 1 2 3 4 5 6; do
  ffmpeg -v error -i "plates/shot${s}_9x16.mp4" \
    -vf "select='not(mod(n\,20))',scale=180:320,tile=4x2" -frames:v 1 "plates/qc/shot${s}_9x16.jpg" -y
done
echo PREP9-OK
