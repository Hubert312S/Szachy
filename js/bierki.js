// Własne grafiki bierek szachowych (SVG, viewBox 0 0 100 100).
// Każda bierka to zestaw kształtów; kolory nakłada funkcja rysujBierke().

const PODSTAWA = '<path d="M22 88 Q22 76 34 75 H66 Q78 76 78 88 Z"/>';

const KSZTALTY = {
  // Pionek
  p: `
    <circle cx="50" cy="28" r="11"/>
    <path d="M39 45 Q50 37 61 45 L58 50 H42 Z"/>
    <path d="M43 50 Q44 63 32 75 H68 Q56 63 57 50 Z"/>
    ${PODSTAWA}`,

  // Wieża
  r: `
    <path d="M29 14 H38 V22 H45.5 V14 H54.5 V22 H62 V14 H71 V32 H29 Z"/>
    <path d="M33 32 H67 L63 37 H37 Z"/>
    <path d="M38 37 H62 L64 69 H36 Z"/>
    <path d="M30 69 H70 V75 H30 Z"/>
    <path class="detal" d="M38 43 H62 M37 63 H63"/>
    ${PODSTAWA}`,

  // Skoczek
  n: `
    <path d="M66 75 H33 C33 62 41 55 47 48 C41 50 35 53 29 57 C22 55 18 49 20 43
             C26 37 31 31 35 25 L33 13 L42 19 L47 10 L53 19
             C68 21 76 36 74 52 C73 62 68 69 66 75 Z"/>
    <path class="detal" d="M53 21 C64 28 68 41 66 59"/>
    <circle class="oko" cx="40" cy="31" r="3"/>
    <circle class="oko" cx="24" cy="45" r="1.8"/>
    ${PODSTAWA}`,

  // Goniec
  b: `
    <circle cx="50" cy="13" r="5.5"/>
    <path d="M50 19 C37 29 33 42 38 53 H62 C67 42 63 29 50 19 Z"/>
    <path class="detal" d="M54 29 L46 42"/>
    <path d="M37 53 H63 L60 59 H40 Z"/>
    <path d="M41 59 Q42 68 32 75 H68 Q58 68 59 59 Z"/>
    ${PODSTAWA}`,

  // Hetman
  q: `
    <path d="M23 29 L33 58 H67 L77 29 L63 43 L65 21 L55 41 L50 16 L45 41 L35 21 L37 43 Z"/>
    <circle cx="22" cy="26" r="5"/>
    <circle cx="35" cy="17" r="5"/>
    <circle cx="50" cy="11" r="5.5"/>
    <circle cx="65" cy="17" r="5"/>
    <circle cx="78" cy="26" r="5"/>
    <path d="M33 58 H67 L65 64 H35 Z"/>
    <path d="M37 64 Q39 70 31 75 H69 Q61 70 63 64 Z"/>
    ${PODSTAWA}`,

  // Król
  k: `
    <path d="M46 4 H54 V10 H60 V17 H54 V25 H46 V17 H40 V10 H46 Z"/>
    <path d="M50 30 C31 21 19 40 34 57 H66 C81 40 69 21 50 30 Z"/>
    <path class="detal" d="M50 30 V57"/>
    <path d="M34 57 H66 L64 63 H36 Z"/>
    <path d="M37 63 Q39 70 31 75 H69 Q61 70 63 63 Z"/>
    ${PODSTAWA}`
};

const KOLORY = {
  w: { wypelnienie: '#f6f0e4', kontur: '#2a241d', detal: '#2a241d' },
  b: { wypelnienie: '#2c2620', kontur: '#0e0c0a', detal: '#c9b48e' }
};

// typ: 'p','r','n','b','q','k'; kolor: 'w' (białe) lub 'b' (czarne)
function rysujBierke(typ, kolor) {
  const k = KOLORY[kolor];
  const ksztalt = KSZTALTY[typ]
    .replaceAll('class="detal"', `fill="none" stroke="${k.detal}" stroke-width="2.5" stroke-linecap="round"`)
    .replaceAll('class="oko"', `fill="${k.detal}" stroke="none"`);
  return `
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="bierka-svg">
    <g fill="${k.wypelnienie}" stroke="${k.kontur}" stroke-width="3" stroke-linejoin="round">${ksztalt}</g>
  </svg>`;
}
