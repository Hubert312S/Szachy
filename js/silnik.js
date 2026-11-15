// Silnik bota szachowego.
// Przeszukiwanie alfa-beta z pogłębianiem iteracyjnym, przeszukiwaniem spoczynkowym (bicia),
// tablicą transpozycji, ruchem zerowym i redukcją późnych ruchów.
// Cały silnik siedzi w jednej funkcji, żeby dało się go uruchomić w Web Workerze
// (osobny wątek – strona nie zamarza, gdy bot liczy) oraz w testach w Node.

// Poziomy bota. Elo jest orientacyjne – to etykieta siły, nie oficjalny ranking.
const POZIOMY_BOTA = [
  { id: 1,  nazwa: 'Początkujący',          skrot: '',   elo: 400,  opis: 'Bije, co wisi, ale nie widzi odpowiedzi rywala.', glebokosc: 1, szum: 120, blad: 0.10, bezBic: true },
  { id: 2,  nazwa: 'Nowicjusz',             skrot: '',   elo: 700,  opis: 'Zna zasady, ale gra bez planu.',                    glebokosc: 1, szum: 70,  blad: 0.05, bezBic: true },
  { id: 3,  nazwa: 'Amator',                skrot: '',   elo: 1000, opis: 'Widzi proste bicia, popełnia błędy.',               glebokosc: 2, szum: 80,  blad: 0.07 },
  { id: 4,  nazwa: 'Klubowicz',             skrot: '',   elo: 1300, opis: 'Regularny gracz klubowy.',                          glebokosc: 2, szum: 40,  blad: 0.03 },
  { id: 5,  nazwa: 'Zaawansowany',          skrot: '',   elo: 1600, opis: 'Liczy proste kombinacje.',                          glebokosc: 3, szum: 20,  blad: 0.01 },
  { id: 6,  nazwa: 'Ekspert',               skrot: '',   elo: 1900, opis: 'Silny amator, rzadko się myli.',                    glebokosc: 4, szum: 10,  blad: 0 },
  { id: 7,  nazwa: 'Kandydat na mistrza',   skrot: 'CM', elo: 2200, opis: 'Najniższy tytuł FIDE (od 2200).',                   czas: 700 },
  { id: 8,  nazwa: 'Mistrz FIDE',           skrot: 'FM', elo: 2300, opis: 'Tytuł FIDE od 2300.',                               czas: 1200 },
  { id: 9,  nazwa: 'Mistrz międzynarodowy', skrot: 'IM', elo: 2400, opis: 'Tytuł FIDE od 2400 i normy turniejowe.',            czas: 1800 },
  { id: 10, nazwa: 'Arcymistrz',            skrot: 'GM', elo: 2500, opis: 'Najwyższy tytuł FIDE (od 2500 i normy).',           czas: 2500 },
  { id: 11, nazwa: 'Super-arcymistrz',      skrot: 'GM', elo: 2700, opis: 'Ścisła światowa czołówka (2700+).',                 czas: 4000 },
  { id: 12, nazwa: 'Mistrz świata',         skrot: 'GM', elo: 2823, opis: 'Poziom Magnusa Carlsena – nr 1 na świecie.',        czas: 6000 }
];

// Książka debiutów: popularne otwarcia w zapisie algebraicznym (S = skoczek po angielsku N itd.).
// Bot gra z niej na poziomach od „Zaawansowanego”, wybierając losowo spośród znanych kontynuacji.
const KSIAZKA_DEBIUTOW = [
  'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6',        // hiszpańska
  'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nf5',   // hiszpańska, berlińska
  'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O',                // włoska
  'e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Be7 O-O O-O',                      // dwóch skoczków
  'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nxc6 bxc6 e5 Qe7',           // szkocka
  'e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 d4 d5 Bd3 Nc6',              // rosyjska (Petrowa)
  'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5',               // sycylijska Najdorfa
  'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Ndb5 d6',             // sycylijska Swiesznikowa
  'e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nc6 Nc3 Qc7 Be3 a6',              // sycylijska Taimanowa
  'e4 c5 Nc3 Nc6 g3 g6 Bg2 Bg7 d3 d6',                         // sycylijska zamknięta
  'e4 e6 d4 d5 Nc3 Nf6 Bg5 Be7 e5 Nfd7',                       // francuska
  'e4 e6 d4 d5 Nd2 c5 exd5 exd5 Ngf3 Nc6',                     // francuska Tarrascha
  'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6',               // Caro-Kann
  'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5',                          // Caro-Kann, wariant zaawansowany
  'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 c6',                     // skandynawska
  'e4 Nf6 e5 Nd5 d4 d6 Nf3 Bg4 Be2 e6',                        // obrona Alechina
  'e4 d6 d4 Nf6 Nc3 g6 Nf3 Bg7 Be2 O-O',                       // obrona Pirca
  'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6',                 // gambit hetmański odrzucony
  'd4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5 e3 e6',                 // obrona słowiańska
  'd4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5 O-O a6',                // gambit hetmański przyjęty
  'd4 Nf6 c4 e6 Nc3 Bb4 e3 O-O Bd3 d5',                        // obrona nimzoindyjska
  'd4 Nf6 c4 e6 Nf3 b6 g3 Bb7 Bg2 Be7 O-O O-O',                // obrona hetmańsko-indyjska
  'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5',                 // obrona królewsko-indyjska
  'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7',            // obrona Grünfelda
  'd4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 e4 g6',                 // obrona Benoni
  'd4 d5 Bf4 Nf6 e3 c5 c3 Nc6 Nd2 e6',                         // system londyński
  'd4 f5 g3 Nf6 Bg2 g6 Nf3 Bg7 O-O O-O',                       // obrona holenderska
  'c4 e5 Nc3 Nf6 Nf3 Nc6 g3 d5 cxd5 Nxd5',                     // angielska
  'c4 c5 Nf3 Nc6 Nc3 g6 g3 Bg7 Bg2 Nf6',                       // angielska symetryczna
  'Nf3 d5 g3 Nf6 Bg2 c6 O-O Bg4 d3 Nbd7',                      // Réti
  'Nf3 Nf6 c4 g6 Nc3 Bg7 e4 d6 d4 O-O'                         // przejście do królewsko-indyjskiej
];

function stworzSilnik() {
  // ---------- Plansza 10x12 ----------
  // Pole (w, k) z gry (w = 0 to 8. rząd) ma indeks 21 + w*10 + k. Ramka = 99.
  // Bierki: białe dodatnie, czarne ujemne: 1 pionek, 2 skoczek, 3 goniec, 4 wieża, 5 hetman, 6 król.
  const RAMKA = 99;
  const B = new Int8Array(120);
  const POLA = [];
  for (let w = 0; w < 8; w++) for (let k = 0; k < 8; k++) POLA.push(21 + w * 10 + k);
  const DO64 = new Int8Array(120).fill(-1);
  POLA.forEach((s, i) => { DO64[s] = i; });

  const SKOCZEK = [-21, -19, -12, -8, 8, 12, 19, 21];
  const SKOS = [-11, -9, 9, 11];
  const PROSTO = [-10, -1, 1, 10];
  const WSZYSTKIE = [-11, -10, -9, -1, 1, 9, 10, 11];
  const TYPY = { p: 1, n: 2, b: 3, r: 4, q: 5, k: 6 };
  const LITERY_TYPOW = ['', 'p', 'n', 'b', 'r', 'q', 'k'];
  const WARTOSC = [0, 100, 320, 330, 500, 900, 0];

  // ---------- Tabele pozycyjne (z perspektywy białych, 8. rząd u góry) ----------
  const PST = [null,
    [0,0,0,0,0,0,0,0, 50,50,50,50,50,50,50,50, 10,10,20,30,30,20,10,10, 5,5,10,25,25,10,5,5,
     0,0,0,20,20,0,0,0, 5,-5,-10,0,0,-10,-5,5, 5,10,10,-20,-20,10,10,5, 0,0,0,0,0,0,0,0],
    [-50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,0,0,0,-20,-40, -30,0,10,15,15,10,0,-30, -30,5,15,20,20,15,5,-30,
     -30,0,15,20,20,15,0,-30, -30,5,10,15,15,10,5,-30, -40,-20,0,5,5,0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50],
    [-20,-10,-10,-10,-10,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,10,10,5,0,-10, -10,5,5,10,10,5,5,-10,
     -10,0,10,10,10,10,0,-10, -10,10,10,10,10,10,10,-10, -10,5,0,0,0,0,5,-10, -20,-10,-10,-10,-10,-10,-10,-20],
    [0,0,0,0,0,0,0,0, 5,10,10,10,10,10,10,5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5,
     -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, 0,0,0,5,5,0,0,0],
    [-20,-10,-10,-5,-5,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,5,5,5,0,-10, -5,0,5,5,5,5,0,-5,
     0,0,5,5,5,5,0,-5, -10,5,5,5,5,5,0,-10, -10,0,5,0,0,0,0,-10, -20,-10,-10,-5,-5,-10,-10,-20],
    [-30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30,
     -20,-30,-30,-40,-40,-30,-30,-20, -10,-20,-20,-20,-20,-20,-20,-10, 20,20,0,0,0,0,20,20, 20,30,10,0,0,10,30,20]
  ];
  const KROL_KONCOWKA = [-50,-40,-30,-20,-20,-30,-40,-50, -30,-20,-10,0,0,-10,-20,-30, -30,-10,20,30,30,20,-10,-30, -30,-10,30,40,40,30,-10,-30,
    -30,-10,30,40,40,30,-10,-30, -30,-10,20,30,30,20,-10,-30, -30,-30,0,0,0,0,-30,-30, -50,-30,-30,-30,-30,-30,-30,-50];
  const FAZA = [0, 0, 1, 1, 2, 4, 0];

  // ---------- Zobrist (skróty pozycji do tablicy transpozycji i powtórzeń) ----------
  let ziarno = 0x9e3779b9;
  const losowa = () => { ziarno ^= ziarno << 13; ziarno ^= ziarno >>> 17; ziarno ^= ziarno << 5; return ziarno | 0; };
  const Z1 = [], Z2 = [];
  for (let p = 0; p < 13; p++) { Z1.push(new Int32Array(120)); Z2.push(new Int32Array(120)); for (const s of POLA) { Z1[p][s] = losowa(); Z2[p][s] = losowa(); } }
  const ZR1 = new Int32Array(16), ZR2 = new Int32Array(16), ZE1 = new Int32Array(120), ZE2 = new Int32Array(120);
  for (let i = 0; i < 16; i++) { ZR1[i] = losowa(); ZR2[i] = losowa(); }
  for (const s of POLA) { ZE1[s] = losowa(); ZE2[s] = losowa(); }
  const ZS1 = losowa(), ZS2 = losowa();

  // Maski praw do roszady: 1 białe krótka, 2 białe długa, 4 czarne krótka, 8 czarne długa.
  const MASKA_ROSZAD = new Int8Array(120).fill(15);
  MASKA_ROSZAD[95] = 12; MASKA_ROSZAD[98] = 14; MASKA_ROSZAD[91] = 13;
  MASKA_ROSZAD[25] = 3;  MASKA_ROSZAD[28] = 11; MASKA_ROSZAD[21] = 7;

  // ---------- Stan ----------
  let strona = 1, roszady = 0, ep = 0, polruchy = 0, h1 = 0, h2 = 0;
  const krol = { 1: 0, '-1': 0 };
  const historia1 = [];         // skróty poprzednich pozycji (wykrywanie powtórzeń)
  let historiaGry = [];         // skróty pozycji z dotychczasowej partii (przed bieżącą)
  // stos cofania ruchów
  const cofRuch = [], cofBita = [], cofRoszady = [], cofEp = [], cofPolruchy = [], cofH1 = [], cofH2 = [];

  function ustawPozycje(poz) {
    B.fill(RAMKA);
    for (const s of POLA) B[s] = 0;
    for (let w = 0; w < 8; w++)
      for (let k = 0; k < 8; k++) {
        const b = poz.plansza[w][k];
        if (!b) continue;
        const s = 21 + w * 10 + k;
        B[s] = TYPY[b.typ] * (b.kolor === 'w' ? 1 : -1);
        if (b.typ === 'k') krol[b.kolor === 'w' ? 1 : -1] = s;
      }
    strona = poz.naRuchu === 'w' ? 1 : -1;
    const r = poz.roszady;
    roszady = (r.w.krotka ? 1 : 0) | (r.w.dluga ? 2 : 0) | (r.b.krotka ? 4 : 0) | (r.b.dluga ? 8 : 0);
    ep = poz.enPassant ? 21 + poz.enPassant.w * 10 + poz.enPassant.k : 0;
    polruchy = poz.polruchyBezBicia || 0;
    przeliczSkrot();
    historia1.length = 0;
    historia1.push(...historiaGry);
    cofRuch.length = 0;
  }

  // Zapamiętuje pozycje z partii, żeby bot wiedział, które ruchy prowadzą do powtórzenia.
  function ustawHistorie(pozycje) {
    historiaGry = [];
    for (const p of pozycje || []) { ustawPozycje(p); historiaGry.push(h1); }
  }

  function przeliczSkrot() {
    h1 = 0; h2 = 0;
    for (const s of POLA) if (B[s]) { h1 ^= Z1[B[s] + 6][s]; h2 ^= Z2[B[s] + 6][s]; }
    h1 ^= ZR1[roszady]; h2 ^= ZR2[roszady];
    if (ep) { h1 ^= ZE1[ep]; h2 ^= ZE2[ep]; }
    if (strona === -1) { h1 ^= ZS1; h2 ^= ZS2; }
  }

  // ---------- Ataki ----------
  function atakowane(s, przez) {
    if (przez === 1) { if (B[s + 9] === 1 || B[s + 11] === 1) return true; }
    else if (B[s - 9] === -1 || B[s - 11] === -1) return true;
    const sk = 2 * przez, kr = 6 * przez, go = 3 * przez, wi = 4 * przez, he = 5 * przez;
    for (let i = 0; i < 8; i++) { if (B[s + SKOCZEK[i]] === sk) return true; if (B[s + WSZYSTKIE[i]] === kr) return true; }
    for (let i = 0; i < 4; i++) {
      let d = SKOS[i], t = s + d;
      while (B[t] === 0) t += d;
      if (B[t] === go || B[t] === he) return true;
      d = PROSTO[i]; t = s + d;
      while (B[t] === 0) t += d;
      if (B[t] === wi || B[t] === he) return true;
    }
    return false;
  }

  // Ruch zakodowany w liczbie: z | na<<7 | promocja<<14 | flagi<<17 (1 w przelocie, 2 roszada, 4 podwójny)
  const ruch = (z, na, promo, flaga) => z | (na << 7) | (promo << 14) | (flaga << 17);
  const odkad = m => m & 127, dokad = m => (m >> 7) & 127, promocja = m => (m >> 14) & 7, flagi = m => m >> 17;

  function generuj(lista, tylkoBicia) {
    const st = strona;
    for (let i = 0; i < 64; i++) {
      const s = POLA[i], p = B[s];
      if (p * st <= 0) continue;
      const typ = p * st;
      if (typ === 1) {
        const d = st === 1 ? -10 : 10;
        const naPromocje = st === 1 ? s < 41 : s > 80;
        const start = st === 1 ? s > 80 : s < 41;
        const t = s + d;
        if (B[t] === 0) {
          if (naPromocje) { for (let pr = 5; pr >= 2; pr--) if (!tylkoBicia || pr === 5) lista.push(ruch(s, t, pr, 0)); }
          else if (!tylkoBicia) {
            lista.push(ruch(s, t, 0, 0));
            if (start && B[t + d] === 0) lista.push(ruch(s, t + d, 0, 4));
          }
        }
        for (const t2 of [t - 1, t + 1]) {
          const q = B[t2];
          if (q !== RAMKA && q * st < 0) {
            if (naPromocje) { for (let pr = 5; pr >= 2; pr--) lista.push(ruch(s, t2, pr, 0)); }
            else lista.push(ruch(s, t2, 0, 0));
          } else if (t2 === ep && ep) lista.push(ruch(s, t2, 0, 1));
        }
      } else if (typ === 2 || typ === 6) {
        const kier = typ === 2 ? SKOCZEK : WSZYSTKIE;
        for (let j = 0; j < 8; j++) {
          const t = s + kier[j], q = B[t];
          if (q === RAMKA) continue;
          if (q === 0) { if (!tylkoBicia) lista.push(ruch(s, t, 0, 0)); }
          else if (q * st < 0) lista.push(ruch(s, t, 0, 0));
        }
        if (typ === 6 && !tylkoBicia) generujRoszady(lista, s);
      } else {
        const kier = typ === 3 ? SKOS : typ === 4 ? PROSTO : WSZYSTKIE;
        for (let j = 0; j < kier.length; j++) {
          const d = kier[j];
          let t = s + d;
          while (B[t] === 0) { if (!tylkoBicia) lista.push(ruch(s, t, 0, 0)); t += d; }
          if (B[t] !== RAMKA && B[t] * st < 0) lista.push(ruch(s, t, 0, 0));
        }
      }
    }
  }

  function generujRoszady(lista, s) {
    if (strona === 1 && s === 95) {
      if ((roszady & 1) && !B[96] && !B[97] && B[98] === 4 && !atakowane(95, -1) && !atakowane(96, -1) && !atakowane(97, -1)) lista.push(ruch(95, 97, 0, 2));
      if ((roszady & 2) && !B[94] && !B[93] && !B[92] && B[91] === 4 && !atakowane(95, -1) && !atakowane(94, -1) && !atakowane(93, -1)) lista.push(ruch(95, 93, 0, 2));
    } else if (strona === -1 && s === 25) {
      if ((roszady & 4) && !B[26] && !B[27] && B[28] === -4 && !atakowane(25, 1) && !atakowane(26, 1) && !atakowane(27, 1)) lista.push(ruch(25, 27, 0, 2));
      if ((roszady & 8) && !B[24] && !B[23] && !B[22] && B[21] === -4 && !atakowane(25, 1) && !atakowane(24, 1) && !atakowane(23, 1)) lista.push(ruch(25, 23, 0, 2));
    }
  }

  const zdejmij = (p, s) => { h1 ^= Z1[p + 6][s]; h2 ^= Z2[p + 6][s]; };

  // Wykonuje ruch. Zwraca false (i cofa go), jeśli zostawia własnego króla w szachu.
  function wykonajRuch(m) {
    const z = odkad(m), na = dokad(m), pr = promocja(m), fl = flagi(m);
    const p = B[z], bita = B[na];
    cofRuch.push(m); cofBita.push(bita); cofRoszady.push(roszady); cofEp.push(ep); cofPolruchy.push(polruchy);
    cofH1.push(h1); cofH2.push(h2);
    historia1.push(h1);

    zdejmij(p, z);
    if (bita) zdejmij(bita, na);
    const nowa = pr ? pr * strona : p;
    zdejmij(nowa, na);
    B[na] = nowa; B[z] = 0;

    if (fl & 1) { const s = na + (strona === 1 ? 10 : -10); zdejmij(B[s], s); B[s] = 0; }
    if (fl & 2) {
      let wz, wn;
      if (na === 97) { wz = 98; wn = 96; } else if (na === 93) { wz = 91; wn = 94; }
      else if (na === 27) { wz = 28; wn = 26; } else { wz = 21; wn = 24; }
      zdejmij(B[wz], wz); zdejmij(B[wz], wn); B[wn] = B[wz]; B[wz] = 0;
    }
    if (ep) { h1 ^= ZE1[ep]; h2 ^= ZE2[ep]; }
    ep = (fl & 4) ? (z + na) >> 1 : 0;
    if (ep) { h1 ^= ZE1[ep]; h2 ^= ZE2[ep]; }
    h1 ^= ZR1[roszady]; h2 ^= ZR2[roszady];
    roszady &= MASKA_ROSZAD[z] & MASKA_ROSZAD[na];
    h1 ^= ZR1[roszady]; h2 ^= ZR2[roszady];
    polruchy = (p * strona === 1 || bita || (fl & 1)) ? 0 : polruchy + 1;
    if (p * strona === 6) krol[strona] = na;
    strona = -strona; h1 ^= ZS1; h2 ^= ZS2;

    if (atakowane(krol[-strona], strona)) { cofnijRuch(); return false; }
    return true;
  }

  function cofnijRuch() {
    const m = cofRuch.pop(), bita = cofBita.pop();
    roszady = cofRoszady.pop(); ep = cofEp.pop(); polruchy = cofPolruchy.pop();
    h1 = cofH1.pop(); h2 = cofH2.pop(); historia1.pop();
    strona = -strona;
    const z = odkad(m), na = dokad(m), pr = promocja(m), fl = flagi(m);
    const p = pr ? strona : B[na];
    B[z] = p; B[na] = bita;
    if (p * strona === 6) krol[strona] = z;
    if (fl & 1) B[na + (strona === 1 ? 10 : -10)] = -strona;
    if (fl & 2) {
      if (na === 97) { B[98] = B[96]; B[96] = 0; } else if (na === 93) { B[91] = B[94]; B[94] = 0; }
      else if (na === 27) { B[28] = B[26]; B[26] = 0; } else { B[21] = B[24]; B[24] = 0; }
    }
  }

  function ruchZerowy() {
    cofH1.push(h1); cofH2.push(h2); cofEp.push(ep);
    historia1.push(h1);
    if (ep) { h1 ^= ZE1[ep]; h2 ^= ZE2[ep]; }
    ep = 0; strona = -strona; h1 ^= ZS1; h2 ^= ZS2;
  }
  function cofnijZerowy() {
    strona = -strona; ep = cofEp.pop(); h1 = cofH1.pop(); h2 = cofH2.pop(); historia1.pop();
  }

  // ---------- Ocena pozycji (z punktu widzenia strony na ruchu, w setnych pionka) ----------
  function ocena() {
    let wynik = 0, krolMid = 0, krolKon = 0, faza = 0, materialB = 0, materialC = 0, goncyB = 0, goncyC = 0;
    for (let i = 0; i < 64; i++) {
      const p = B[POLA[i]];
      if (!p) continue;
      const typ = p > 0 ? p : -p;
      const idx = p > 0 ? i : (7 - (i >> 3)) * 8 + (i & 7);
      faza += FAZA[typ];
      if (typ === 6) {
        const z = p > 0 ? 1 : -1;
        krolMid += z * PST[6][idx]; krolKon += z * KROL_KONCOWKA[idx];
        continue;
      }
      const v = WARTOSC[typ] + PST[typ][idx];
      if (p > 0) { wynik += v; if (typ > 1) materialB += WARTOSC[typ]; if (typ === 3) goncyB++; }
      else { wynik -= v; if (typ > 1) materialC += WARTOSC[typ]; if (typ === 3) goncyC++; }
    }
    if (faza > 24) faza = 24;
    // król: w środkowej grze schowany za pionkami, w końcówce aktywny w centrum
    wynik += Math.round((krolMid * faza + krolKon * (24 - faza)) / 24);
    if (goncyB >= 2) wynik += 30;
    if (goncyC >= 2) wynik -= 30;
    // dobijanie w końcówkach: przewaga spycha króla przeciwnika do krawędzi i zbliża własnego
    const roznica = materialB - materialC;
    if (faza <= 6 && Math.abs(roznica) >= 300) {
      const silny = roznica > 0 ? 1 : -1;
      const sK = DO64[krol[silny]], sl = DO64[krol[-silny]];
      const wr = sl >> 3, kr = sl & 7;
      const odSrodka = Math.max(3 - wr, wr - 4) + Math.max(3 - kr, kr - 4);
      const odleglosc = Math.abs((sK >> 3) - wr) + Math.abs((sK & 7) - kr);
      wynik += silny * (10 * odSrodka + 4 * (14 - odleglosc));
    }
    return wynik * strona;
  }

  // ---------- Przeszukiwanie ----------
  const MAT = 100000, NIESK = 1000000;
  const ROZMIAR_TT = 1 << 20;
  const ttK1 = new Int32Array(ROZMIAR_TT), ttK2 = new Int32Array(ROZMIAR_TT), ttRuch = new Int32Array(ROZMIAR_TT);
  const ttWynik = new Int32Array(ROZMIAR_TT), ttGlebokosc = new Int8Array(ROZMIAR_TT), ttTyp = new Int8Array(ROZMIAR_TT);
  const killery = [], historiaRuchow = new Int32Array(120 * 120);
  let wezly = 0, koniecCzasu = 0, bezBic = false;
  const PRZERWIJ = { przerwij: true };

  function maBierki(st) {
    for (let i = 0; i < 64; i++) { const p = B[POLA[i]] * st; if (p > 1 && p < 6) return true; }
    return false;
  }

  function czyPowtorzenie() {
    // szukamy tej samej pozycji wstecz (co 2 półruchy), tylko od ostatniego bicia/ruchu pionkiem
    const n = historia1.length;
    for (let i = n - 2; i >= 0 && i >= n - polruchy; i -= 2) if (historia1[i] === h1) return true;
    return false;
  }

  function ocenRuchy(lista, oceny, ttM, ply) {
    const k = killery[ply] || [0, 0];
    for (let i = 0; i < lista.length; i++) {
      const m = lista[i];
      if (m === ttM) { oceny[i] = 2000000; continue; }
      const bita = B[dokad(m)];
      if (bita || (flagi(m) & 1)) {
        const ofiara = bita ? Math.abs(bita) : 1;
        oceny[i] = 1000000 + ofiara * 10 - Math.abs(B[odkad(m)]);
      } else if (promocja(m)) oceny[i] = 950000 + promocja(m);
      else if (m === k[0]) oceny[i] = 900000;
      else if (m === k[1]) oceny[i] = 800000;
      else oceny[i] = historiaRuchow[odkad(m) * 120 + dokad(m)];
    }
  }

  function wybierz(lista, oceny, od) {
    let naj = od;
    for (let j = od + 1; j < lista.length; j++) if (oceny[j] > oceny[naj]) naj = j;
    if (naj !== od) {
      const t = lista[od]; lista[od] = lista[naj]; lista[naj] = t;
      const o = oceny[od]; oceny[od] = oceny[naj]; oceny[naj] = o;
    }
    return lista[od];
  }

  function spoczynkowe(alfa, beta, ply) {
    if ((++wezly & 2047) === 0 && Date.now() > koniecCzasu) throw PRZERWIJ;
    const teraz = ocena();
    if (bezBic) return teraz;
    if (teraz >= beta) return beta;
    if (teraz > alfa) alfa = teraz;
    const lista = [];
    generuj(lista, true);
    const oceny = new Array(lista.length);
    ocenRuchy(lista, oceny, 0, ply);
    for (let i = 0; i < lista.length; i++) {
      const m = wybierz(lista, oceny, i);
      if (!wykonajRuch(m)) continue;
      const w = -spoczynkowe(-beta, -alfa, ply + 1);
      cofnijRuch();
      if (w >= beta) return beta;
      if (w > alfa) alfa = w;
    }
    return alfa;
  }

  function szukaj(gl, alfa, beta, ply, zerowyDozwolony) {
    if ((++wezly & 2047) === 0 && Date.now() > koniecCzasu) throw PRZERWIJ;
    if (ply > 0 && (polruchy >= 100 || czyPowtorzenie())) return 0;
    const wSzachu = atakowane(krol[strona], -strona);
    if (wSzachu) gl++;
    if (gl <= 0) return spoczynkowe(alfa, beta, ply);

    const idx = h1 & (ROZMIAR_TT - 1);
    let ttM = 0;
    if (ttK1[idx] === h1 && ttK2[idx] === h2) {
      ttM = ttRuch[idx];
      if (ply > 0 && ttGlebokosc[idx] >= gl) {
        let w = ttWynik[idx];
        if (w > MAT - 1000) w -= ply; else if (w < -MAT + 1000) w += ply;
        const t = ttTyp[idx];
        if (t === 0) return w;
        if (t === 1 && w >= beta) return w;
        if (t === 2 && w <= alfa) return w;
      }
    }

    // ruch zerowy: jeśli nawet po oddaniu ruchu jest dobrze, ta gałąź nie jest potrzebna
    if (zerowyDozwolony && !wSzachu && gl >= 3 && ply > 0 && beta < MAT - 1000 && maBierki(strona) && ocena() >= beta) {
      ruchZerowy();
      const w = -szukaj(gl - 3, -beta, -beta + 1, ply + 1, false);
      cofnijZerowy();
      if (w >= beta) return beta;
    }

    const lista = [];
    generuj(lista, false);
    const oceny = new Array(lista.length);
    ocenRuchy(lista, oceny, ttM, ply);
    let legalne = 0, najRuch = 0, najWynik = -NIESK;
    const startAlfa = alfa;
    for (let i = 0; i < lista.length; i++) {
      const m = wybierz(lista, oceny, i);
      const cichy = !B[dokad(m)] && !promocja(m) && !(flagi(m) & 1);
      if (!wykonajRuch(m)) continue;
      legalne++;
      let w;
      if (legalne === 1) w = -szukaj(gl - 1, -beta, -alfa, ply + 1, true);
      else {
        // późne ciche ruchy liczymy płycej; jeśli wyglądają dobrze – pełne przeliczenie
        let red = (gl >= 3 && legalne > 4 && cichy && !wSzachu && oceny[i] < 800000) ? 1 : 0;
        w = -szukaj(gl - 1 - red, -alfa - 1, -alfa, ply + 1, true);
        if (w > alfa && (red || w < beta)) w = -szukaj(gl - 1, -beta, -alfa, ply + 1, true);
      }
      cofnijRuch();
      if (w > najWynik) { najWynik = w; najRuch = m; }
      if (w > alfa) {
        alfa = w;
        if (w >= beta) {
          if (cichy) {
            const k = killery[ply] || (killery[ply] = [0, 0]);
            if (k[0] !== m) { k[1] = k[0]; k[0] = m; }
            historiaRuchow[odkad(m) * 120 + dokad(m)] += gl * gl;
          }
          break;
        }
      }
    }
    if (legalne === 0) return wSzachu ? -MAT + ply : 0;

    let zapis = najWynik;
    if (zapis > MAT - 1000) zapis += ply; else if (zapis < -MAT + 1000) zapis -= ply;
    ttK1[idx] = h1; ttK2[idx] = h2; ttRuch[idx] = najRuch; ttWynik[idx] = zapis; ttGlebokosc[idx] = gl;
    ttTyp[idx] = najWynik >= beta ? 1 : najWynik <= startAlfa ? 2 : 0;
    return najWynik;
  }

  function legalneKorzenia() {
    const lista = [], wynik = [];
    generuj(lista, false);
    for (const m of lista) if (wykonajRuch(m)) { cofnijRuch(); wynik.push(m); }
    return wynik;
  }

  function naRuchGry(m) {
    const z = odkad(m), na = dokad(m), pr = promocja(m);
    return {
      z: { w: Math.floor((z - 21) / 10), k: (z - 21) % 10 },
      na: { w: Math.floor((na - 21) / 10), k: (na - 21) % 10 },
      promocja: pr ? LITERY_TYPOW[pr] : null
    };
  }

  // ---------- Książka debiutów ----------
  // Zamienia zapis algebraiczny (np. "Nxe4", "O-O", "exd5") na ruch w bieżącej pozycji.
  function ruchZZapisu(zapis) {
    const z = zapis.replace(/[+#!?]/g, '');
    const ruchy = legalneKorzenia();
    if (z === 'O-O' || z === 'O-O-O') {
      return ruchy.find(m => (flagi(m) & 2) && (dokad(m) % 10 === (z === 'O-O' ? 7 : 3))) || 0;
    }
    const figura = 'NBRQK'.includes(z[0]) ? ' PNBRQK'.indexOf(z[0]) : 1;
    const bez = z.replace(/=?[NBRQ]$/, m => (figura === 1 ? '' : m));
    const pole = bez.slice(-2);
    const na = 21 + (8 - +pole[1]) * 10 + 'abcdefgh'.indexOf(pole[0]);
    const wskazowka = bez.slice(figura === 1 ? 0 : 1, -2).replace('x', '');
    return ruchy.find(m => {
      if (dokad(m) !== na || Math.abs(B[odkad(m)]) !== figura) return false;
      const sk = odkad(m), kol = 'abcdefgh'[(sk - 21) % 10], rz = String(8 - Math.floor((sk - 21) / 10));
      return [...wskazowka].every(c => c === kol || c === rz);
    }) || 0;
  }

  let ksiazka = null;   // skrót pozycji -> lista ruchów z książki
  function zbudujKsiazke() {
    const zapamietana = historiaGry;
    historiaGry = [];
    ksiazka = new Map();
    const start = { plansza: [
      'rnbqkbnr', 'pppppppp', '........', '........', '........', '........', 'PPPPPPPP', 'RNBQKBNR'
    ].map(r => [...r].map(c => c === '.' ? null : { typ: c.toLowerCase(), kolor: c === c.toUpperCase() ? 'w' : 'b' })),
      naRuchu: 'w', roszady: { w: { krotka: true, dluga: true }, b: { krotka: true, dluga: true } }, enPassant: null };
    for (const linia of KSIAZKA_DEBIUTOW) {
      ustawPozycje(start);
      for (const zapis of linia.split(' ')) {
        const m = ruchZZapisu(zapis);
        if (!m) throw new Error(`Błąd w książce debiutów: ${zapis} w linii „${linia}”`);
        const klucz = h1 + ':' + h2;
        if (!ksiazka.has(klucz)) ksiazka.set(klucz, []);
        ksiazka.get(klucz).push(m);
        wykonajRuch(m);
      }
    }
    historiaGry = zapamietana;
  }

  function ruchZKsiazki(poz, losuj) {
    if (!ksiazka) zbudujKsiazke();
    ustawPozycje(poz);
    const kandydaci = ksiazka.get(h1 + ':' + h2);
    if (!kandydaci) return 0;
    return kandydaci[Math.floor(losuj() * kandydaci.length)];
  }

  // Ocena każdego ruchu osobno (do słabszych poziomów).
  function ocenKazdyRuch(ruchy, gl) {
    return ruchy.map(m => {
      wykonajRuch(m);
      const w = -szukaj(gl - 1, -NIESK, NIESK, 1, true);
      cofnijRuch();
      return w;
    });
  }

  // Główna funkcja: zwraca ruch bota dla pozycji z gry i poziomu.
  function najlepszyRuch(poz, poziom, opcje = {}) {
    ustawHistorie(opcje.historia);
    ustawPozycje(poz);
    wezly = 0;
    killery.length = 0;
    historiaRuchow.fill(0);
    bezBic = !!poziom.bezBic;
    const losuj = opcje.losuj || Math.random;
    const ruchy = legalneKorzenia();
    if (ruchy.length === 0) return null;
    const start = Date.now();

    // Debiut z książki (od poziomu „Zaawansowany”).
    if (poziom.id >= 5 && opcje.ksiazka !== false) {
      const m = ruchZKsiazki(poz, losuj);
      if (m) return { ...naRuchGry(m), ocena: 0, glebokosc: 0, wezly: 0, zKsiazki: true };
      ustawPozycje(poz);
    }

    // Słabsze poziomy: ocena każdego ruchu + szum + czasem zupełnie przypadkowy ruch.
    if (poziom.glebokosc) {
      koniecCzasu = Infinity;
      if (losuj() < (poziom.blad || 0)) {
        const m = ruchy[Math.floor(losuj() * ruchy.length)];
        return { ...naRuchGry(m), ocena: null, glebokosc: 0, wezly };
      }
      const oceny = ocenKazdyRuch(ruchy, poziom.glebokosc);
      let naj = 0, najW = -Infinity;
      oceny.forEach((w, i) => {
        const zSzumem = w + (losuj() + losuj() + losuj() - 1.5) * 2 * (poziom.szum || 0);
        if (zSzumem > najW) { najW = zSzumem; naj = i; }
      });
      return { ...naRuchGry(ruchy[naj]), ocena: oceny[naj], glebokosc: poziom.glebokosc, wezly };
    }


    // Pogłębianie iteracyjne w limicie czasu.
    koniecCzasu = start + poziom.czas;
    let najRuch = ruchy[0], najOcena = 0, glebokosc = 0;
    for (let gl = 1; gl <= 64; gl++) {
      try {
        const w = szukaj(gl, -NIESK, NIESK, 0, false);
        const idx = h1 & (ROZMIAR_TT - 1);
        if (ttK1[idx] === h1 && ttK2[idx] === h2 && ttRuch[idx] && ruchy.includes(ttRuch[idx])) najRuch = ttRuch[idx];
        najOcena = w; glebokosc = gl;
        if (Math.abs(w) > MAT - 1000) break;                       // znaleziony mat
        if (Date.now() - start > poziom.czas * 0.55) break;         // następna głębokość i tak się nie zmieści
      } catch (e) {
        if (e !== PRZERWIJ) throw e;
        // przerwane w trakcie – zostajemy przy ostatnim pełnym wyniku
        ustawPozycje(poz);
        break;
      }
    }
    return { ...naRuchGry(najRuch), ocena: najOcena, glebokosc, wezly };
  }

  // Ocena pozycji przez krótkie przeszukanie (do decyzji o przyjęciu remisu).
  function ocenPozycje(poz, czas = 300) {
    ustawHistorie(null);
    ustawPozycje(poz);
    bezBic = false;
    koniecCzasu = Date.now() + czas;
    let wynik = ocena();
    for (let gl = 1; gl <= 6; gl++) {
      try { wynik = szukaj(gl, -NIESK, NIESK, 0, false); } catch (e) { if (e !== PRZERWIJ) throw e; break; }
    }
    return wynik; // z punktu widzenia strony na ruchu
  }

  // Liczba wszystkich pozycji po n półruchach – do testów generatora ruchów.
  function perft(poz, n) {
    ustawHistorie(null);
    ustawPozycje(poz);
    const licz = g => {
      if (g === 0) return 1;
      const lista = [];
      generuj(lista, false);
      let suma = 0;
      for (const m of lista) if (wykonajRuch(m)) { suma += licz(g - 1); cofnijRuch(); }
      return suma;
    };
    return licz(n);
  }

  // Sprawdza, czy wszystkie linie książki debiutów są poprawne (do testów).
  function sprawdzKsiazke() { zbudujKsiazke(); return ksiazka.size; }

  return { najlepszyRuch, ocenPozycje, perft, sprawdzKsiazke };
}

// Uruchomienie w Web Workerze (osobnym wątku).
if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) {
  const silnik = stworzSilnik();
  self.onmessage = e => {
    const { id, typ, pozycja, poziom, opcje } = e.data;
    if (typ === 'ruch') self.postMessage({ id, wynik: silnik.najlepszyRuch(pozycja, poziom, opcje) });
    if (typ === 'ocena') self.postMessage({ id, wynik: silnik.ocenPozycje(pozycja) });
  };
}

if (typeof module !== 'undefined') module.exports = { stworzSilnik, POZIOMY_BOTA };
