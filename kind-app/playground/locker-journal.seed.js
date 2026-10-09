// Playground seed — runs BEFORE the store module reads localStorage (import it first).
//   ?seed=0   a signed-in pilot with no answers      ?seed=15 (default)  15 answers across both series, incl. very long + Yoruba/Igbo
const q = new URLSearchParams(location.search)
const n = q.get('seed')
if (n !== null || !localStorage.getItem('kind-app-v4')) {
  const long = Array.from({ length: 9 }, (_, i) => `Paragraph ${i + 1}. A steward does not own the field, he keeps it. I want to keep my time, my words and my money the way a good steward keeps another man's field, with open hands and a clean ledger.`).join('\n\n')
  const sc = {
    1: 'I will start by thanking God for what He has already put in my hands.',
    3: 'Everything I have is on loan. My phone, my time, my talent. A steward remembers whose it is.',
    4: 'Today I will give my first and best, not my leftovers.',
    5: 'Being faithful in small things is how God tests me for big things. I will tidy my room before I ask for a bigger one.',
    6: long,
    7: 'Ọlọ́run ni olùpèsè mi. Mo ṣe àkíyèsí pé ẹni tí ó jẹ́ olóòtọ́ ní ohun kékeré ni a óò fi ohun ńlá lé lọ́wọ́. Ẹ̀ṣẹ̀ kò ní jọba lórí mi, nítorí oore-ọ̀fẹ́ Ọlọ́run ni mo dúró lé.',
    8: 'Chineke bụ onye na-elekọta m. Aha m bụ Ụzọ, ọ bụkwa ya ka m ga-eji jee ozi. Ọ dị m mkpa ịmụta ịchekwa ihe e nyere m nke ọma.',
    10: 'Short one. Be faithful.',
    11: 'I wrote this on the bus. The steward in the story did not wait to be told, he saw the need and moved. I want to see needs at home first, then outside.',
    12: 'My answer today: I will count my blessings before my problems, and steward both with joy.',
    13: 'Honesty with a small amount of money is practice for honesty with a large amount.',
  }
  const lo = {
    2: 'Rest is not wasted time. It is how I take care of what God gave me.',
    3: 'My body is a gift. I will eat well, sleep early and walk daily.',
    4: 'Longevity starts with honour: obey my parents so my days will be long.',
    6: 'Ẹ̀mí gígùn wà nínú ọgbọ́n. I will ask for wisdom this week.',
  }
  const mk = (txt, mon) => ({ notes: txt, notesAt: Object.fromEntries(Object.keys(txt).map((d) => [d, `2026-${mon}-${String(d).padStart(2, '0')}`])), done: {} })
  const series = n === '0' ? {} : { 'stewardship-code': mk(sc, '08'), 'secrets-of-longevity': mk(lo, '07') }
  localStorage.setItem('kind-app-v4', JSON.stringify({ onboarded: true, name: 'Ada', role: 'teen', series }))
}
