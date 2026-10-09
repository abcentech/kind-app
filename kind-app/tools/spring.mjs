// Samples a damped spring into a CSS linear() easing.  node tools/spring.mjs
// x(t) = 1 - e^(-zeta*w*t) * (cos(wd*t) + (zeta*w/wd) * sin(wd*t))
function spring({ zeta, freq, n = 36 }) {
  const w = 2 * Math.PI * freq, wd = w * Math.sqrt(1 - zeta * zeta)
  const f = (t) => 1 - Math.exp(-zeta * w * t) * (Math.cos(wd * t) + ((zeta * w) / wd) * Math.sin(wd * t))
  let T = 0.1; while (T < 3 && Math.abs(f(T) - 1) > 0.0015) T += 0.01   // settle time
  const pts = Array.from({ length: n + 1 }, (_, i) => +f((i / n) * T).toFixed(4))
  pts[n] = 1
  return { ms: Math.round(T * 1000), css: `linear(${pts.join(', ')})` }
}
const S = { snap: { zeta: 0.72, freq: 2.2 }, soft: { zeta: 0.86, freq: 1.5 }, bounce: { zeta: 0.46, freq: 1.7 }, slam: { zeta: 0.58, freq: 3.1 } }
for (const [k, v] of Object.entries(S)) { const r = spring(v); console.log(`/* ${k}: settles ~${r.ms}ms */\n--spring-${k}: ${r.css};\n--spring-${k}-ms: ${r.ms}ms;`) }
