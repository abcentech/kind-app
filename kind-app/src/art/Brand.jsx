// owner: brand — <Mark/>, <Wordmark/>, <Lockup/>.
//
// The block between the @generated markers is written by `node scripts/make-icons.mjs` from the very geometry that
// draws public/icon.svg, the iOS splash and the store art — so the in-app mark, the home-screen icon and the
// listing can never drift apart. Edit the script, not the block. Colours inside it are hex copies of the tokens
// (the script reads src/styles/tokens.css and fails if one goes missing); a logo is not themeable.
import { useId, useMemo } from 'react'

/* @generated:begin — scripts/make-icons.mjs · do not edit */
const MARK = {
  badge: "<defs><!--@kd--><linearGradient id=\"__ID__-ig\" gradientUnits=\"userSpaceOnUse\" x1=\"190\" y1=\"374.8\" x2=\"336\" y2=\"110.64\"><stop offset=\"0\" stop-color=\"#ff4a0f\"/><stop offset=\".56\" stop-color=\"#ff8a1c\"/><stop offset=\"1\" stop-color=\"#ffc43d\"/></linearGradient><linearGradient id=\"__ID__-sheen\" gradientUnits=\"userSpaceOnUse\" x1=\"0\" y1=\"112\" x2=\"0\" y2=\"296\"><stop offset=\"0\" stop-color=\"#fff\" stop-opacity=\".30\"/><stop offset=\"1\" stop-color=\"#fff\" stop-opacity=\"0\"/></linearGradient><clipPath id=\"__ID__-kClip\"><path transform=\"translate(170 146) scale(1.04)\" d=\"M0 16 L16 0 L42 0 L42 82 C66 50 112 40 144 -34 C150 -4 182 42 156 76 C132 100 96 108 70 118 L134 220 L86 220 L42 156 L42 220 L0 220 Z\"/></clipPath><filter id=\"__ID__-blur8\" x=\"-40%\" y=\"-40%\" width=\"180%\" height=\"180%\"><feGaussianBlur stdDeviation=\"8\"/></filter><!--@full--><linearGradient id=\"__ID__-core\" gradientUnits=\"userSpaceOnUse\" x1=\"274\" y1=\"239.6\" x2=\"315.6\" y2=\"139.76\"><stop offset=\"0\" stop-color=\"#ffc43d\" stop-opacity=\"0\"/><stop offset=\".45\" stop-color=\"#ffc43d\" stop-opacity=\".55\"/><stop offset=\"1\" stop-color=\"#fbe6a8\" stop-opacity=\".95\"/></linearGradient><linearGradient id=\"__ID__-shade\" gradientUnits=\"userSpaceOnUse\" x1=\"0\" y1=\"270.8\" x2=\"0\" y2=\"378.96\"><stop offset=\"0\" stop-color=\"#000\" stop-opacity=\"0\"/><stop offset=\"1\" stop-color=\"#000\" stop-opacity=\".10\"/></linearGradient><linearGradient id=\"__ID__-edge\" gradientUnits=\"userSpaceOnUse\" x1=\"0\" y1=\"112\" x2=\"0\" y2=\"376\"><stop offset=\"0\" stop-color=\"#fff\" stop-opacity=\".85\"/><stop offset=\".35\" stop-color=\"#fff\" stop-opacity=\".25\"/><stop offset=\"1\" stop-color=\"#fff\" stop-opacity=\"0\"/></linearGradient><filter id=\"__ID__-blur1\" x=\"-20%\" y=\"-20%\" width=\"140%\" height=\"140%\"><feGaussianBlur stdDeviation=\"1.6\"/></filter><!--@/full--><filter id=\"__ID__-blur14\" x=\"-60%\" y=\"-60%\" width=\"220%\" height=\"220%\"><feGaussianBlur stdDeviation=\"14\"/></filter><!--@/kd--><linearGradient id=\"__ID__-ti\" gradientUnits=\"userSpaceOnUse\" x1=\"196\" y1=\"56\" x2=\"316\" y2=\"456\"><stop offset=\"0\" stop-color=\"#eef1f8\"/><stop offset=\".34\" stop-color=\"#aeb5c6\"/><stop offset=\".62\" stop-color=\"#343a4c\"/><stop offset=\"1\" stop-color=\"#aeb5c6\"/></linearGradient><linearGradient id=\"__ID__-plate\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0\" stop-color=\"#11141f\"/><stop offset=\".6\" stop-color=\"#0b0d15\"/><stop offset=\"1\" stop-color=\"#06070d\"/></linearGradient><radialGradient id=\"__ID__-plateLight\" gradientUnits=\"userSpaceOnUse\" cx=\"256\" cy=\"186\" r=\"190\"><stop offset=\"0\" stop-color=\"#232839\" stop-opacity=\".55\"/><stop offset=\"1\" stop-color=\"#232839\" stop-opacity=\"0\"/></radialGradient><radialGradient id=\"__ID__-bloom\" gradientUnits=\"userSpaceOnUse\" cx=\"318\" cy=\"180.64\" r=\"130\"><stop offset=\"0\" stop-color=\"#ff8a1c\" stop-opacity=\".26\"/><stop offset=\".55\" stop-color=\"#ff4a0f\" stop-opacity=\".07\"/><stop offset=\"1\" stop-color=\"#ff4a0f\" stop-opacity=\"0\"/></radialGradient><clipPath id=\"__ID__-plateClip\"><polygon points=\"256,80.25 408.21,168.12 408.21,343.88 256,431.75 103.79,343.88 103.79,168.12\"/></clipPath></defs><g transform=\"translate(256 256) scale(1) translate(-256 -256)\"><g class=\"brand-mark__rim\"><polygon points=\"256,56 429.21,156 429.21,356 256,456 82.79,356 82.79,156\" fill=\"url(#__ID__-ti)\"/><polygon points=\"256,56 429.21,156 423.21,159.46 256,62.93\" fill=\"#cdd2df\"/><polygon points=\"256,74.48 413.21,165.24 408.21,168.12 256,80.25\" fill=\"#4a5164\"/><polygon points=\"429.21,156 429.21,356 423.21,352.54 423.21,159.46\" fill=\"#737a8e\"/><polygon points=\"413.21,165.24 413.21,346.76 408.21,343.88 408.21,168.12\" fill=\"#848b9e\"/><polygon points=\"429.21,356 256,456 256,449.07 423.21,352.54\" fill=\"#51586b\"/><polygon points=\"413.21,346.76 256,437.52 256,431.75 408.21,343.88\" fill=\"#cacfdc\"/><polygon points=\"256,456 82.79,356 88.79,352.54 256,449.07\" fill=\"#596074\"/><polygon points=\"256,437.52 98.79,346.76 103.79,343.88 256,431.75\" fill=\"#afb6c7\"/><polygon points=\"82.79,356 82.79,156 88.79,159.46 88.79,352.54\" fill=\"#a0a7b9\"/><polygon points=\"98.79,346.76 98.79,165.24 103.79,168.12 103.79,343.88\" fill=\"#5e657a\"/><polygon points=\"82.79,156 256,56 256,62.93 88.79,159.46\" fill=\"#eaedf5\"/><polygon points=\"98.79,165.24 256,74.48 256,80.25 103.79,168.12\" fill=\"#444a5d\"/><polygon points=\"256,68.7 418.21,162.35 418.21,349.65 256,443.3 93.79,349.65 93.79,162.35\" fill=\"none\" stroke=\"url(#__ID__-ti)\" stroke-width=\"10\" stroke-linejoin=\"miter\"/><!--@full--><line x1=\"256\" y1=\"56.6\" x2=\"428.69\" y2=\"156.3\" stroke=\"#fff\" stroke-opacity=\"0.41\" stroke-width=\"1.6\"/><line x1=\"428.69\" y1=\"156.3\" x2=\"428.69\" y2=\"355.7\" stroke=\"#fff\" stroke-opacity=\"0\" stroke-width=\"1.6\"/><line x1=\"428.69\" y1=\"355.7\" x2=\"256\" y2=\"455.4\" stroke=\"#fff\" stroke-opacity=\"0\" stroke-width=\"1.6\"/><line x1=\"256\" y1=\"455.4\" x2=\"83.31\" y2=\"355.7\" stroke=\"#fff\" stroke-opacity=\"0\" stroke-width=\"1.6\"/><line x1=\"83.31\" y1=\"355.7\" x2=\"83.31\" y2=\"156.3\" stroke=\"#fff\" stroke-opacity=\"0.2\" stroke-width=\"1.6\"/><line x1=\"83.31\" y1=\"156.3\" x2=\"256\" y2=\"56.6\" stroke=\"#fff\" stroke-opacity=\"0.53\" stroke-width=\"1.6\"/><!--@/full--></g><g class=\"brand-mark__plate\"><polygon points=\"256,80.25 408.21,168.12 408.21,343.88 256,431.75 103.79,343.88 103.79,168.12\" fill=\"url(#__ID__-plate)\"/><g clip-path=\"url(#__ID__-plateClip)\"><rect width=\"512\" height=\"512\" fill=\"url(#__ID__-plateLight)\"/><rect width=\"512\" height=\"512\" fill=\"url(#__ID__-bloom)\"/><!--@full--><path class=\"brand-mark__ticks\" d=\"M256 89.25l-6.5 11.26M270.44 97.59l-3.5 6.06M284.88 105.92l-3.5 6.06M299.32 114.26l-3.5 6.06M313.76 122.6l-3.5 6.06M328.21 130.94l-3.5 6.06M342.65 139.27l-3.5 6.06M357.09 147.61l-3.5 6.06M371.53 155.95l-3.5 6.06M385.97 164.29l-3.5 6.06M400.41 172.62l-13 0M400.41 189.3l-7 0M400.41 205.97l-7 0M400.41 222.65l-7 0M400.41 239.32l-7 0M400.41 256l-7 0M400.41 272.68l-7 0M400.41 289.35l-7 0M400.41 306.03l-7 0M400.41 322.7l-7 0M400.41 339.38l-6.5 -11.26M385.97 347.71l-3.5 -6.06M371.53 356.05l-3.5 -6.06M357.09 364.39l-3.5 -6.06M342.65 372.73l-3.5 -6.06M328.21 381.06l-3.5 -6.06M313.76 389.4l-3.5 -6.06M299.32 397.74l-3.5 -6.06M284.88 406.08l-3.5 -6.06M270.44 414.41l-3.5 -6.06M256 422.75l6.5 -11.26M241.56 414.41l3.5 -6.06M227.12 406.08l3.5 -6.06M212.68 397.74l3.5 -6.06M198.24 389.4l3.5 -6.06M183.79 381.06l3.5 -6.06M169.35 372.73l3.5 -6.06M154.91 364.39l3.5 -6.06M140.47 356.05l3.5 -6.06M126.03 347.71l3.5 -6.06M111.59 339.38l13 0M111.59 322.7l7 0M111.59 306.03l7 0M111.59 289.35l7 0M111.59 272.68l7 0M111.59 256l7 0M111.59 239.32l7 0M111.59 222.65l7 0M111.59 205.97l7 0M111.59 189.3l7 0M111.59 172.62l6.5 11.26M126.03 164.29l3.5 6.06M140.47 155.95l3.5 6.06M154.91 147.61l3.5 6.06M169.35 139.27l3.5 6.06M183.79 130.94l3.5 6.06M198.24 122.6l3.5 6.06M212.68 114.26l3.5 6.06M227.12 105.92l3.5 6.06M241.56 97.59l3.5 6.06\" stroke=\"#6a7186\" stroke-opacity=\".5\" stroke-width=\"1.8\" fill=\"none\"/><!--@/full--><polygon points=\"256,78.25 409.94,167.12 409.94,344.88 256,433.75 102.06,344.88 102.06,167.12\" fill=\"none\" stroke=\"#000\" stroke-opacity=\".55\" stroke-width=\"10\" filter=\"url(#__ID__-blur8)\"/></g><polygon points=\"256,80.25 408.21,168.12 408.21,343.88 256,431.75 103.79,343.88 103.79,168.12\" fill=\"none\" stroke=\"#03040a\" stroke-opacity=\".9\" stroke-width=\"1.5\"/></g><!--@glow--><!--@k--><g class=\"brand-mark__k\"><g filter=\"url(#__ID__-blur8)\" opacity=\".7\"><path transform=\"translate(170 155) scale(1.04)\" d=\"M0 16 L16 0 L42 0 L42 82 C66 50 112 40 144 -34 C150 -4 182 42 156 76 C132 100 96 108 70 118 L134 220 L86 220 L42 156 L42 220 L0 220 Z\" fill=\"#000\"/></g><path transform=\"translate(170 146) scale(1.04)\" d=\"M0 16 L16 0 L42 0 L42 82 C66 50 112 40 144 -34 C150 -4 182 42 156 76 C132 100 96 108 70 118 L134 220 L86 220 L42 156 L42 220 L0 220 Z\" fill=\"url(#__ID__-ig)\"/><g clip-path=\"url(#__ID__-kClip)\"><rect y=\"106\" width=\"512\" height=\"200\" fill=\"url(#__ID__-sheen)\"/></g><!--@full--><path transform=\"translate(170 146) scale(1.04)\" d=\"M0 16 L16 0 L42 0 L42 82 C66 50 112 40 144 -34 C150 -4 182 42 156 76 C132 100 96 108 70 118 L134 220 L86 220 L42 156 L42 220 L0 220 Z\" fill=\"none\" stroke=\"url(#__ID__-edge)\" stroke-width=\"3.2\" stroke-linejoin=\"round\" clip-path=\"url(#__ID__-kClip)\"/><g clip-path=\"url(#__ID__-kClip)\"><rect y=\"260.4\" width=\"512\" height=\"200\" fill=\"url(#__ID__-shade)\"/></g><path class=\"brand-mark__flame\" transform=\"translate(170 146) scale(1.04)\" d=\"M104 84 C126 80 148 64 144 44 C142 30 138 18 139 -2 C128 24 108 42 94 62 C90 72 94 86 104 84 Z\" fill=\"url(#__ID__-core)\" filter=\"url(#__ID__-blur1)\"/><!--@/full--></g><!--@/k--></g>",
  mono: "<path class=\"brand-mark__rim\" fill-rule=\"evenodd\" fill=\"currentColor\" d=\"M256,56L429.21,156L429.21,356L256,456L82.79,356L82.79,156ZM256,81.4L407.21,168.7L407.21,343.3L256,430.6L104.79,343.3L104.79,168.7Z\"/><path class=\"brand-mark__k\" transform=\"translate(170 146) scale(1.04)\" d=\"M0 16 L16 0 L42 0 L42 82 C66 50 112 40 144 -34 C150 -4 182 42 156 76 C132 100 96 108 70 118 L134 220 L86 220 L42 156 L42 220 L0 220 Z\" fill=\"currentColor\"/>",
  glow: "<g class=\"brand-mark__glow\" filter=\"url(#__ID__-blur14)\" opacity=\"__OP__\"><path transform=\"translate(170 146) scale(1.04)\" d=\"M0 16 L16 0 L42 0 L42 82 C66 50 112 40 144 -34 C150 -4 182 42 156 76 C132 100 96 108 70 118 L134 220 L86 220 L42 156 L42 220 L0 220 Z\" fill=\"#ff8a1c\"/></g>",
}
const WORDMARK = { w: 1901, h: 700, d: "m12 700q-5 0-8-3q-4-4-4-9l0 0l0-676q0-5 4-8q3-4 8-4l0 0l117 0q5 0 9 4q3 3 3 8l0 0l0 252q0 4 3 5q2 0 3-4l0 0l129-256q5-9 14-9l0 0l124 0q7 0 10 4q2 3-1 10l0 0l-148 288q-1 4-1 6l0 0l157 378q1 2 1 6l0 0q0 8-10 8l0 0l-125 0q-11 0-14-9l0 0l-104-262q-1-3-3-2q-2 0-4 2l0 0l-29 52q-2 4-2 6l0 0l0 201q0 5-3 9q-4 3-9 3l0 0l-117 0m548 0q-5 0-8-3q-4-4-4-9l0 0l0-676q0-5 4-8q3-4 8-4l0 0l117 0q5 0 9 4q3 3 3 8l0 0l0 676q0 5-3 9q-4 3-9 3l0 0l-117 0m611-688q0-5 4-8q3-4 8-4l0 0l116 0q5 0 9 4q3 3 3 8l0 0l0 676q0 5-3 9q-4 3-9 3l0 0l-132 0q-10 0-13-10l0 0l-124-387q-1-3-3-2q-3 0-3 3l0 0l1 384q0 5-3 9q-4 3-9 3l0 0l-116 0q-5 0-8-3q-4-4-4-9l0 0l0-676q0-5 4-8q3-4 8-4l0 0l131 0q10 0 13 10l0 0l125 387q1 3 4 3q2-1 2-4l0 0l-1-384m348 688q-5 0-8-3q-4-4-4-9l0 0l0-676q0-5 4-8q3-4 8-4l0 0l181 0q91 0 146 53q55 53 55 141l0 0l0 312q0 88-55 141q-55 53-146 53l0 0l-181 0m129-126q0 5 5 5l0 0l45-1q27-1 44-23q17-22 18-58l0 0l0-294q0-38-17-60q-17-22-46-22l0 0l-44 0q-5 0-5 5l0 0l0 448" }
const TAGLINE = { cap: 67.2, desc: 19.78, main: "m27 0q-1 0-2-1l0 0l-8-28q0 0 0 0l0 0l-5 0q-1 0-1 1l0 0l0 27q0 0 0 1q-1 0-1 0l0 0l-9 0q0 0-1 0q0-1 0-1l0 0l0-65q0-1 0-1q1 0 1 0l0 0l18 0q5 0 9 2q4 3 6 7q2 5 2 10l0 0q0 6-2 11q-2 4-6 6l0 0q-1 0-1 1l0 0l10 29q0 0 0 0l0 0q0 1-1 1l0 0l-9 0m-15-58q-1 0-1 1l0 0l0 19q0 0 1 0l0 0l5 0q4 0 6-2q2-3 2-8l0 0q0-4-2-7q-2-3-6-3l0 0l-5 0m86 58q-1 0-1-1l0 0l-2-10q0-1 0-1l0 0l-14 0q-1 0-1 1l0 0l-2 10q0 1-1 1l0 0l-9 0q-1 0-1-1l0 0l14-65q1-1 2-1l0 0l10 0q1 0 1 1l0 0l14 65l0 0q0 1-1 1l0 0l-9 0m-16-21q0 1 0 1l0 0l11 0q1 0 0-1l0 0l-5-30q0 0 0 0q-1 0-1 0l0 0l-5 30m60 21q0 0-1 0q0-1 0-1l0 0l0-65q0-1 0-1q1 0 1 0l0 0l9 0q0 0 1 0q0 0 0 1l0 0l0 65q0 0 0 1q-1 0-1 0l0 0l-9 0m62 1q-8 0-13-5q-4-5-4-13l0 0l0-2q0-1 0-1q0 0 1 0l0 0l8 0q1 0 1 0q1 0 1 1l0 0l0 2q0 4 1 6q2 2 5 2l0 0q3 0 5-2q2-2 2-6l0 0q0-2-1-4q-1-2-3-3q-2-2-6-5l0 0q-5-4-8-6q-3-3-5-7q-2-4-2-9l0 0q0-8 5-12q5-5 13-5l0 0q8 0 13 5q5 5 5 13l0 0l0 2q0 1-1 1q0 1-1 1l0 0l-8 0q-1 0-1-1q0 0 0-1l0 0l0-2q0-4-2-6q-2-2-5-2l0 0q-3 0-5 2q-2 2-2 5l0 0q0 4 2 6q2 3 8 7l0 0q6 4 9 7q3 3 4 6q2 3 2 8l0 0q0 8-5 13q-5 5-13 5l0 0m53-1q0 0-1 0q0-1 0-1l0 0l0-65q0-1 0-1q1 0 1 0l0 0l9 0q1 0 1 0q0 0 0 1l0 0l0 65q0 0 0 1q0 0-1 0l0 0l-9 0m74-66q0-1 0-1q1 0 1 0l0 0l9 0q0 0 1 0q0 0 0 1l0 0l0 65q0 0 0 1q-1 0-1 0l0 0l-10 0q-1 0-1-1l0 0l-15-41q0 0 0 0q0 0 0 0l0 0l0 41q0 0-1 1q0 0 0 0l0 0l-9 0q-1 0-1 0q0-1 0-1l0 0l0-65q0-1 0-1q0 0 1 0l0 0l10 0q1 0 1 1l0 0l14 40q0 0 1 0q0 0 0 0l0 0l0-40m64 67q-8 0-13-5q-5-5-5-13l0 0l0-34q0-7 5-12q5-5 13-5l0 0q8 0 14 5q5 5 5 13l0 0l0 3q0 1-1 1q0 0-1 0l0 0l-8 0q-1 0-1 0q-1 0-1-1l0 0l0-4q0-3-2-5q-2-2-5-2l0 0q-3 0-5 2q-2 2-2 5l0 0l0 34q0 4 2 6q2 2 5 2l0 0q3 0 5-2q2-2 2-6l0 0l0-9q0 0 0 0l0 0l-6 0q0 0-1-1q0 0 0 0l0 0l0-7q0-1 0-1q1-1 1-1l0 0l16 0q1 0 1 1q1 0 1 1l0 0l0 17q0 8-5 13q-6 5-14 5l0 0m419-22q-3 0-5-2q-2-1-2-4l0 0q0-3 2-5q2-2 5-2l0 0q3 0 5 2q2 2 2 5l0 0q0 3-2 4q-2 2-5 2l0 0m123 3q0 8-5 13q-5 5-13 5l0 0l-17 0q0 0-1 0q0-1 0-1l0 0l0-65q0-1 0-1q1 0 1 0l0 0l15 0q9 0 15 4q5 5 5 14l0 0q0 10-7 14l0 0q-1 0 0 1l0 0q3 2 5 6q2 4 2 10l0 0m-24-40q-1 0-1 1l0 0l0 18q0 0 1 0l0 0l4 0q4 0 7-2q2-3 2-7l0 0q0-5-2-7q-3-3-7-3l0 0l-4 0m5 48q4 0 6-2q2-3 2-8l0 0q0-5-2-8q-2-3-6-3l0 0l-5 0q-1 0-1 1l0 0l0 20q0 0 1 0l0 0l5 0m71 11q-8 0-13-6q-5-5-5-14l0 0l0-47q0-1 0-1q1 0 1 0l0 0l9 0q0 0 1 0q0 0 0 1l0 0l0 49q0 3 2 6q2 2 5 2l0 0q3 0 5-2q2-3 2-6l0 0l0-49q0-1 0-1q1 0 1 0l0 0l9 0q1 0 1 0q0 0 0 1l0 0l0 47q0 9-5 14q-5 6-13 6l0 0m55-1q0 0 0 0q-1-1-1-1l0 0l0-65q0-1 1-1q0 0 0 0l0 0l9 0q1 0 1 0q0 0 0 1l0 0l0 65q0 0 0 1q0 0-1 0l0 0l-9 0m48 0q-1 0-1 0q0-1 0-1l0 0l0-65q0-1 0-1q0 0 1 0l0 0l9 0q0 0 1 0q0 0 0 1l0 0l0 56q0 0 0 0l0 0l21 0q1 0 1 1q0 0 0 1l0 0l0 7q0 0 0 1q0 0-1 0l0 0l-31 0m66 0q-1 0-1 0q0-1 0-1l0 0l0-65q0-1 0-1q0 0 1 0l0 0l16 0q9 0 13 5q5 5 5 13l0 0l0 31q0 8-5 13q-4 5-13 5l0 0l-16 0m10-10q0 0 0 0l0 0l6 0q3 0 5-2q2-3 2-7l0 0l0-29q0-5-2-7q-2-3-5-3l0 0l-6 0q0 0 0 1l0 0l0 47m61 10q0 0-1 0q0-1 0-1l0 0l0-65q0-1 0-1q1 0 1 0l0 0l9 0q1 0 1 0q0 0 0 1l0 0l0 65q0 0 0 1q0 0-1 0l0 0l-9 0m74-66q0-1 0-1q1 0 1 0l0 0l9 0q0 0 1 0q0 0 0 1l0 0l0 65q0 0 0 1q-1 0-1 0l0 0l-10 0q-1 0-2-1l0 0l-14-41q0 0 0 0q0 0 0 0l0 0l0 41q0 0-1 1q0 0-1 0l0 0l-8 0q-1 0-1 0q0-1 0-1l0 0l0-65q0-1 0-1q0 0 1 0l0 0l10 0q1 0 1 1l0 0l14 40q0 0 1 0q0 0 0 0l0 0l0-40m64 67q-8 0-13-5q-5-5-5-13l0 0l0-34q0-7 5-12q5-5 13-5l0 0q8 0 13 5q5 5 5 13l0 0l0 3q0 1 0 1q0 0-1 0l0 0l-9 0q0 0 0 0q-1 0-1-1l0 0l0-4q0-3-2-5q-2-2-5-2l0 0q-3 0-5 2q-2 2-2 5l0 0l0 34q0 4 2 6q2 2 5 2l0 0q3 0 5-2q2-2 2-6l0 0l0-9q0 0 0 0l0 0l-6 0q-1 0-1-1q0 0 0 0l0 0l0-7q0-1 0-1q0-1 1-1l0 0l16 0q1 0 1 1q0 0 0 1l0 0l0 17q0 8-5 13q-5 5-13 5l0 0m126-67q0-1 1-1q0 0 0 0l0 0l9 0q1 0 1 0q0 0 0 1l0 0l0 65q0 0 0 1q0 0-1 0l0 0l-10 0q-1 0-1-1l0 0l-15-41q0 0 0 0q0 0 0 0l0 0l0 41q0 0 0 1q-1 0-1 0l0 0l-9 0q0 0-1 0q0-1 0-1l0 0l0-65q0-1 0-1q1 0 1 0l0 0l10 0q1 0 1 1l0 0l15 40q0 0 0 0q0 0 0 0l0 0l0-40m75 66q-1 0-1-1l0 0l-2-10q0-1-1-1l0 0l-14 0q0 0 0 1l0 0l-2 10q0 1-1 1l0 0l-9 0q-1 0-1-1l0 0l14-65q0-1 1-1l0 0l10 0q2 0 2 1l0 0l14 65l0 0q0 1-1 1l0 0l-9 0m-17-21q0 1 1 1l0 0l11 0q0 0 0-1l0 0l-6-30q0 0 0 0q0 0 0 0l0 0l-6 30m88-46q1 0 1 0q0 0 0 1l0 0l0 7q0 1 0 1q0 0-1 0l0 0l-12 0q0 0 0 1l0 0l0 56q0 0-1 1q0 0-1 0l0 0l-8 0q-1 0-1 0q-1-1-1-1l0 0l0-56q0-1 0-1l0 0l-12 0q0 0 0 0q-1 0-1-1l0 0l0-7q0-1 1-1q0 0 0 0l0 0l36 0m36 67q0 0 0 0q-1-1-1-1l0 0l0-65q0-1 1-1q0 0 0 0l0 0l9 0q1 0 1 0q0 0 0 1l0 0l0 65q0 0 0 1q0 0-1 0l0 0l-9 0m64 1q-8 0-13-5q-5-5-5-13l0 0l0-33q0-8 5-13q5-5 13-5l0 0q8 0 13 5q5 5 5 13l0 0l0 33q0 8-5 13q-5 5-13 5l0 0m0-10q3 0 5-2q2-2 2-6l0 0l0-33q0-4-2-6q-2-2-5-2l0 0q-3 0-5 2q-2 2-2 6l0 0l0 33q0 4 2 6q2 2 5 2l0 0m81-57q0-1 0-1q1 0 1 0l0 0l9 0q0 0 1 0q0 0 0 1l0 0l0 65q0 0 0 1q-1 0-1 0l0 0l-10 0q-1 0-1-1l0 0l-15-41q0 0 0 0q0 0 0 0l0 0l0 41q0 0-1 1q0 0 0 0l0 0l-9 0q-1 0-1 0q0-1 0-1l0 0l0-65q0-1 0-1q0 0 1 0l0 0l10 0q1 0 1 1l0 0l14 40q0 0 1 0q0 0 0 0l0 0l0-40m63 67q-8 0-13-5q-5-5-5-13l0 0l0-2q0-1 1-1q0 0 1 0l0 0l8 0q1 0 1 0q1 0 1 1l0 0l0 2q0 4 1 6q2 2 5 2l0 0q3 0 5-2q2-2 2-6l0 0q0-2-1-4q-1-2-3-3q-2-2-6-5l0 0q-5-4-8-6q-3-3-5-7q-2-4-2-9l0 0q0-8 5-12q5-5 13-5l0 0q8 0 13 5q5 5 5 13l0 0l0 2q0 1-1 1q0 1-1 1l0 0l-8 0q-1 0-1-1q0 0 0-1l0 0l0-2q0-4-2-6q-2-2-5-2l0 0q-3 0-5 2q-2 2-2 5l0 0q0 4 2 6q2 3 8 7l0 0q6 4 9 7q3 3 4 6q2 3 2 8l0 0q0 8-5 13q-5 5-13 5l0 0", emph: "m515-48q0 0 1-1q0 0 0 0l0 0l9 0q1 0 1 0q0 1 0 1l0 0l0 46q0 11-4 16q-5 6-17 6l0 0q-2 0-3 0l0 0q-1 0-1-2l0 0l0-7q0-1 1-1l0 0q5 0 8-1q3-2 4-5q1-2 1-7l0 0l0-1q0 0 0 0q0 0 0 0l0 0q-3 4-9 4l0 0q-7 0-10-4q-3-4-3-11l0 0l0-19q0-8 3-12q3-4 10-4l0 0q6 0 9 4l0 0q0 1 0 1q0 0 0-1l0 0l0-2m-5 39q2 0 4-2q1-2 1-5l0 0l0-17q0-3-1-5q-2-2-4-2l0 0q-3 0-5 2q-1 2-1 5l0 0l0 17q0 3 1 5q2 2 5 2l0 0m67 10q-8 0-12-4q-5-5-5-12l0 0l0-19q0-7 5-12q4-4 12-4l0 0q8 0 13 4q4 5 4 12l0 0l0 19q0 7-4 12q-5 4-13 4l0 0m0-10q3 0 4-2q2-2 2-5l0 0l0-17q0-3-2-5q-1-2-4-2l0 0q-3 0-4 2q-2 2-2 5l0 0l0 17q0 3 2 5q1 2 4 2l0 0m53 9q0 0-1 0q0-1 0-1l0 0l0-65q0-1 0-1q1 0 1 0l0 0l17 0q8 0 13 5q5 5 5 13l0 0l0 31q0 8-5 13q-5 5-13 5l0 0l-17 0m10-10q0 0 1 0l0 0l5 0q4 0 6-2q1-3 2-7l0 0l0-29q0-5-2-7q-2-3-6-3l0 0l-5 0q-1 0-1 1l0 0l0 47m74 11q-8 0-12-4q-5-4-5-10l0 0l0-1q0 0 1 0q0-1 0-1l0 0l9 0q0 0 0 1q1 0 1 0l0 0l0 1q0 2 2 4q1 1 4 1l0 0q2 0 4-1q1-2 1-4l0 0q0-2-1-3q-1-1-3-2q-1-1-5-2l0 0q-5-2-9-6q-3-3-3-9l0 0q0-7 4-11q4-4 12-4l0 0q7 0 11 4q5 4 5 11l0 0q0 1-1 1q0 0 0 0l0 0l-8 0q-1 0-1 0q-1 0-1-1l0 0l0-1q0-2-1-3q-2-2-4-2l0 0q-3 0-4 2q-2 1-2 3l0 0q0 2 1 4q2 1 3 2q2 0 5 2l0 0q4 1 7 3q2 1 4 4q2 3 2 8l0 0q0 6-4 10q-5 4-12 4l0 0" }

/** 0..1 coordinates are fractions of the Mark's box (square, hexagon point-to-point tall). */
export const MARK_GEOMETRY = {
  "box": {
    "x": 56,
    "y": 56,
    "w": 400,
    "h": 400
  },
  "kBox": {
    "x": 166,
    "y": 106.6,
    "w": 184.8,
    "h": 272.2
  },
  "flameTip": {
    "x": 0.675,
    "y": 0.1366
  },
  "stemTop": {
    "x": 0.3396,
    "y": 0.225
  },
  "hex": {
    "circumradius": 0.5,
    "innerRadius": 0.43937822173508934
  }
}

export const BRAND = {
  name: 'KIND',
  tagline: 'Raising goDs. Building nations.',
  taglineCaps: 'RAISING goDs · BUILDING NATIONS',
  colors: {"void":"#03040a","carbon0":"#06070d","carbon1":"#0b0d15","carbon2":"#11141f","carbon3":"#181c2a","carbon4":"#232839","ink":"#f4f6fb","ink2":"#aab2c6","ink3":"#7a8299","ignite1":"#ff4a0f","ignite2":"#ff8a1c","ignite3":"#ffc43d","ti1":"#eef1f8","ti2":"#aeb5c6","ti3":"#6a7186","ti4":"#343a4c"},
  metal: [[0,"#eef1f8"],[0.55,"#aeb5c6"],[1,"#8990a3"]],
}
/* @generated:end */

// the K-only mark is cut out of the badge markup (its defs and its group are fenced by markers) — one source, no duplicate bytes
const slice = (src, tag) => src.slice(src.indexOf(`<!--@${tag}-->`) + tag.length + 8, src.indexOf(`<!--@/${tag}-->`))
const K_ONLY = `<defs>${slice(MARK.badge, 'kd')}</defs><!--@glow-->${slice(MARK.badge, 'k')}`

const uidOf = (raw) => 'bm' + String(raw).replace(/[^a-zA-Z0-9]/g, '')
const a11y = (title) => (title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true, focusable: 'false' })
const cx = (base, extra) => (extra ? `${base} ${extra}` : base)
// the generated markup wraps its detail-only parts (ticks, bevels, flame core) in markers; "lite" strips them
const detailed = (src, lite) => (lite ? src.replace(/<!--@full-->[\s\S]*?<!--@\/full-->/g, '') : src.replace(/<!--@\/?full-->/g, ''))

/**
 * The KIND mark: a titanium hexagon holding a K whose upper arm rises into a flame.
 *   size     height of the hexagon box in px (the box is square; the hexagon is point-to-point tall)
 *   glow     false | true | 0..1  — ember glow behind the K (an SVG filter; only paid for when asked)
 *   variant  'badge' (default) | 'k' (the K alone, for use inside a Hex that already draws the bezel) | 'mono' (currentColor silhouette)
 *   detail   'full' | 'lite' — default: lite under 56 px (no ticks, bevels or flame core, so it stays crisp)
 * Parts carry stable class names for motion: .brand-mark__rim · __plate · __ticks · __k · __flame · __glow
 * Geometry for choreography is in MARK_GEOMETRY (e.g. where the ember pops: flameTip, as a 0..1 point in the box).
 */
export function Mark({ size = 64, glow = false, variant = 'badge', detail, title, className, style, ...rest }) {
  const id = uidOf(useId())
  const lite = detail ? detail === 'lite' : size < 56
  const html = useMemo(() => {
    const src = detailed(variant === 'mono' ? MARK.mono : variant === 'k' ? K_ONLY : MARK.badge, lite)
    const op = glow === true ? 0.85 : Math.max(0, Math.min(1, Number(glow) || 0)) * 0.85
    const g = glow && variant !== 'mono' ? MARK.glow.replace('__OP__', op.toFixed(2)) : ''
    return src.replace('<!--@glow-->', g).replaceAll('__ID__', id)
  }, [variant, lite, glow, id])
  const box = variant === 'k' ? MARK_GEOMETRY.kBox : MARK_GEOMETRY.box
  return (
    <svg
      className={cx('brand-mark', className)}
      viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
      width={(size * box.w) / box.h}
      height={size}
      style={{ overflow: 'visible', flex: 'none', ...style }}
      {...a11y(title)}
      {...rest}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

/**
 * KIND in Barlow Condensed 700, converted to outlines and optically spaced (no font loads).
 *   size  cap height in px — the SVG is exactly this tall
 *   tone  'ink' (currentColor, default) | 'metal' (titanium gradient)
 */
export function Wordmark({ size = 24, tone = 'ink', title, className, style, ...rest }) {
  const id = uidOf(useId())
  return (
    <svg
      className={cx('brand-wordmark', className)}
      viewBox={`0 0 ${WORDMARK.w} ${WORDMARK.h}`}
      width={(size * WORDMARK.w) / WORDMARK.h}
      height={size}
      style={{ flex: 'none', ...style }}
      {...a11y(title || 'KIND')}
      {...rest}
    >
      {tone === 'metal' && (
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            {BRAND.metal.map(([o, c]) => <stop key={o} offset={o} stopColor={c} />)}
          </linearGradient>
        </defs>
      )}
      <path d={WORDMARK.d} fill={tone === 'metal' ? `url(#${id})` : 'currentColor'} />
    </svg>
  )
}

/**
 * Mark + wordmark + tagline ("RAISING goDs · BUILDING NATIONS", justified to the wordmark; "goDs" a step brighter).
 *   size     height of the mark in px; the whole lockup scales with it
 *   layout   'stack' (mark over wordmark over tagline) | 'row' (mark, then wordmark over tagline)
 *   tagline  show the tagline (needs ~200 px of mark height to be legible — hide it below that)
 * Dark-surface lockup: the wordmark is titanium, the tagline ink-2.
 */
export function Lockup({ size = 120, layout = 'stack', tagline = true, glow = false, title, className, style, ...rest }) {
  const id = uidOf(useId())
  const row = layout === 'row'
  // units: the mark box is 1000 × 1000
  const cap = row ? 300 : 360
  const k = cap / WORDMARK.h
  const wmW = WORDMARK.w * k
  const tagCap = TAGLINE.cap * k
  const gap = row ? 100 : 130
  const W = row ? 1000 + 140 + wmW : 1000
  const blockH = cap + (tagline ? gap + tagCap : 0)
  const wmX = row ? 1140 : (1000 - wmW) / 2
  const wmY = row ? 500 - blockH / 2 : 1000 + 150
  const H = row ? 1000 : wmY + blockH + (tagline ? TAGLINE.desc * k : 0)
  const tagY = wmY + cap + gap + tagCap
  const markHtml = useMemo(() => {
    const op = glow === true ? 0.85 : Math.max(0, Math.min(1, Number(glow) || 0)) * 0.85
    const g = glow ? MARK.glow.replace('__OP__', op.toFixed(2)) : ''
    return detailed(MARK.badge, false).replace('<!--@glow-->', g).replaceAll('__ID__', id + 'm')
  }, [glow, id])
  const s = size / 1000
  return (
    <svg
      className={cx('brand-lockup', className)}
      viewBox={`0 0 ${f(W)} ${f(H)}`}
      width={W * s}
      height={H * s}
      style={{ overflow: 'visible', flex: 'none', ...style }}
      {...a11y(title || 'KIND — Raising goDs. Building nations.')}
      {...rest}
    >
      <defs>
        <linearGradient id={id + 'w'} x1="0" y1="0" x2="0" y2="1">
          {BRAND.metal.map(([o, c]) => <stop key={o} offset={o} stopColor={c} />)}
        </linearGradient>
      </defs>
      <svg x="0" y="0" width="1000" height="1000" viewBox={`${MARK_GEOMETRY.box.x} ${MARK_GEOMETRY.box.y} ${MARK_GEOMETRY.box.w} ${MARK_GEOMETRY.box.h}`} style={{ overflow: 'visible' }} dangerouslySetInnerHTML={{ __html: markHtml }} />
      <path transform={`translate(${f(wmX)} ${f(wmY)}) scale(${k.toFixed(5)})`} d={WORDMARK.d} fill={`url(#${id}w)`} />
      {tagline && (
        <g transform={`translate(${f(wmX)} ${f(tagY)}) scale(${k.toFixed(5)})`}>
          <path d={TAGLINE.main} fill={BRAND.colors.ink2} />
          <path d={TAGLINE.emph} fill={BRAND.colors.ink} />
        </g>
      )}
    </svg>
  )
}
const f = (n) => Math.round(n * 100) / 100
