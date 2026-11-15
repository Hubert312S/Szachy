// Szachy: plansza, ruchy wszystkich bierek i zasady gry.
// Plansza: stan.plansza[w][k], w = 0 to 8. rząd (czarne), w = 7 to 1. rząd (białe).

const USTAWIENIE_POCZATKOWE = [
  'rnbqkbnr',
  'pppppppp',
  '........',
  '........',
  '........',
  '........',
  'PPPPPPPP',
  'RNBQKBNR'
];
const LITERY = 'abcdefgh';
const NAZWY = { p: 'Pionek', r: 'Wieża', n: 'Skoczek', b: 'Goniec', q: 'Hetman', k: 'Król' };

const KIERUNKI = {
  r: [[1, 0], [-1, 0], [0, 1], [0, -1]],                          // wieża: proste
  b: [[1, 1], [1, -1], [-1, 1], [-1, -1]],                        // goniec: skosy
  q: [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]], // hetman: oba
  n: [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]], // skoczek: „L”
  k: [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]  // król: o 1 pole
};

let stan;
let wybrane = null;     // { w, k }
let mozliweRuchy = [];  // legalne ruchy zaznaczonej bierki
let ostatniRuch = [];
let obrocona = false;
let czekaNaPromocje = null;

const plansza = document.getElementById('plansza');
const status = document.getElementById('status');

const naPlanszy = (w, k) => w >= 0 && w < 8 && k >= 0 && k < 8;
const przeciwnik = kolor => kolor === 'w' ? 'b' : 'w';

function nowaGra() {
  stan = {
    plansza: USTAWIENIE_POCZATKOWE.map(rzad =>
      [...rzad].map(z => z === '.' ? null : {
        typ: z.toLowerCase(),
        kolor: z === z.toUpperCase() ? 'w' : 'b'
      })
    ),
    naRuchu: 'w',
    roszady: { w: { krotka: true, dluga: true }, b: { krotka: true, dluga: true } },
    enPassant: null,   // pole, na które można bić w przelocie
    koniec: null
  };
  wybrane = null;
  mozliweRuchy = [];
  ostatniRuch = [];
  czekaNaPromocje = null;
  rysuj();
}

// ---------- Generowanie ruchów ----------

// Wszystkie ruchy bierki zgodne z jej sposobem poruszania się (bez sprawdzania, czy król zostaje w szachu).
function ruchyBierki(st, w, k) {
  const b = st.plansza[w][k];
  if (!b) return [];
  const ruchy = [];

  if (b.typ === 'p') {
    const krok = b.kolor === 'w' ? -1 : 1;
    const startowy = b.kolor === 'w' ? 6 : 1;
    const ostatni = b.kolor === 'w' ? 0 : 7;
    const dodaj = (dw, dk, extra = {}) =>
      ruchy.push({ z: { w, k }, na: { w: dw, k: dk }, promocja: dw === ostatni, ...extra });

    // o jedno pole do przodu
    if (naPlanszy(w + krok, k) && !st.plansza[w + krok][k]) {
      dodaj(w + krok, k);
      // o dwa pola z pozycji startowej
      if (w === startowy && !st.plansza[w + 2 * krok][k]) dodaj(w + 2 * krok, k, { podwojny: true });
    }
    // bicie po skosie (także w przelocie)
    for (const dk of [-1, 1]) {
      const nw = w + krok, nk = k + dk;
      if (!naPlanszy(nw, nk)) continue;
      const cel = st.plansza[nw][nk];
      if (cel && cel.kolor !== b.kolor) dodaj(nw, nk);
      else if (st.enPassant && st.enPassant.w === nw && st.enPassant.k === nk) dodaj(nw, nk, { wPrzelocie: true });
    }
    return ruchy;
  }

  const dalekosiezna = b.typ === 'r' || b.typ === 'b' || b.typ === 'q';
  for (const [dw, dk] of KIERUNKI[b.typ]) {
    let nw = w + dw, nk = k + dk;
    while (naPlanszy(nw, nk)) {
      const cel = st.plansza[nw][nk];
      if (cel && cel.kolor === b.kolor) break;
      ruchy.push({ z: { w, k }, na: { w: nw, k: nk } });
      if (cel || !dalekosiezna) break;
      nw += dw; nk += dk;
    }
  }

  // roszada
  if (b.typ === 'k') {
    const r = st.roszady[b.kolor];
    const rzad = b.kolor === 'w' ? 7 : 0;
    const wrog = przeciwnik(b.kolor);
    if (w === rzad && k === 4 && !czyAtakowane(st, rzad, 4, wrog)) {
      const p = st.plansza[rzad];
      if (r.krotka && !p[5] && !p[6] && p[7]?.typ === 'r' && p[7].kolor === b.kolor &&
          !czyAtakowane(st, rzad, 5, wrog) && !czyAtakowane(st, rzad, 6, wrog)) {
        ruchy.push({ z: { w, k }, na: { w: rzad, k: 6 }, roszada: 'krotka' });
      }
      if (r.dluga && !p[3] && !p[2] && !p[1] && p[0]?.typ === 'r' && p[0].kolor === b.kolor &&
          !czyAtakowane(st, rzad, 3, wrog) && !czyAtakowane(st, rzad, 2, wrog)) {
        ruchy.push({ z: { w, k }, na: { w: rzad, k: 2 }, roszada: 'dluga' });
      }
    }
  }
  return ruchy;
}

// Czy pole (w, k) jest atakowane przez bierki koloru `kolor`.
function czyAtakowane(st, w, k, kolor) {
  const P = st.plansza;
  const jest = (r, c, typy) => naPlanszy(r, c) && P[r][c] && P[r][c].kolor === kolor && typy.includes(P[r][c].typ);

  // pionki (atakują po skosie do przodu)
  const odPionka = kolor === 'w' ? 1 : -1;
  if (jest(w + odPionka, k - 1, 'p') || jest(w + odPionka, k + 1, 'p')) return true;
  // skoczek i król
  if (KIERUNKI.n.some(([dw, dk]) => jest(w + dw, k + dk, 'n'))) return true;
  if (KIERUNKI.k.some(([dw, dk]) => jest(w + dw, k + dk, 'k'))) return true;
  // wieża/hetman po prostych, goniec/hetman po skosach
  const promienie = [[KIERUNKI.r, 'rq'], [KIERUNKI.b, 'bq']];
  for (const [kierunki, typy] of promienie) {
    for (const [dw, dk] of kierunki) {
      let r = w + dw, c = k + dk;
      while (naPlanszy(r, c)) {
        if (P[r][c]) {
          if (jest(r, c, typy)) return true;
          break;
        }
        r += dw; c += dk;
      }
    }
  }
  return false;
}

function znajdzKrola(st, kolor) {
  for (let w = 0; w < 8; w++)
    for (let k = 0; k < 8; k++) {
      const b = st.plansza[w][k];
      if (b && b.typ === 'k' && b.kolor === kolor) return { w, k };
    }
  return null;
}

function czySzach(st, kolor) {
  const krol = znajdzKrola(st, kolor);
  return krol && czyAtakowane(st, krol.w, krol.k, przeciwnik(kolor));
}

// Wykonuje ruch na kopii stanu i zwraca nowy stan.
function wykonaj(st, ruch, promujNa = 'q') {
  const nowy = {
    plansza: st.plansza.map(rzad => rzad.map(b => b && { ...b })),
    naRuchu: przeciwnik(st.naRuchu),
    roszady: { w: { ...st.roszady.w }, b: { ...st.roszady.b } },
    enPassant: null,
    koniec: null
  };
  const P = nowy.plansza;
  const { z, na } = ruch;
  const b = P[z.w][z.k];

  P[na.w][na.k] = b;
  P[z.w][z.k] = null;

  if (ruch.wPrzelocie) P[z.w][na.k] = null;          // zbity pionek stoi obok
  if (ruch.podwojny) nowy.enPassant = { w: (z.w + na.w) / 2, k: z.k };
  if (ruch.promocja) P[na.w][na.k] = { typ: promujNa, kolor: b.kolor };
  if (ruch.roszada === 'krotka') { P[z.w][5] = P[z.w][7]; P[z.w][7] = null; }
  if (ruch.roszada === 'dluga') { P[z.w][3] = P[z.w][0]; P[z.w][0] = null; }

  // utrata prawa do roszady
  if (b.typ === 'k') nowy.roszady[b.kolor] = { krotka: false, dluga: false };
  for (const pole of [z, na]) {
    if (pole.w === 7 && pole.k === 0) nowy.roszady.w.dluga = false;
    if (pole.w === 7 && pole.k === 7) nowy.roszady.w.krotka = false;
    if (pole.w === 0 && pole.k === 0) nowy.roszady.b.dluga = false;
    if (pole.w === 0 && pole.k === 7) nowy.roszady.b.krotka = false;
  }
  return nowy;
}

// Ruchy, po których własny król nie zostaje w szachu.
function legalneRuchy(st, w, k) {
  const b = st.plansza[w][k];
  return ruchyBierki(st, w, k).filter(r => !czySzach(wykonaj(st, r), b.kolor));
}

function czyJestJakisRuch(st, kolor) {
  for (let w = 0; w < 8; w++)
    for (let k = 0; k < 8; k++) {
      const b = st.plansza[w][k];
      if (b && b.kolor === kolor && legalneRuchy(st, w, k).length) return true;
    }
  return false;
}

// ---------- Rysowanie i obsługa kliknięć ----------

function rysuj() {
  plansza.innerHTML = '';
  const krolWSzachu = czySzach(stan, stan.naRuchu) ? znajdzKrola(stan, stan.naRuchu) : null;

  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const w = obrocona ? 7 - i : i;
      const k = obrocona ? 7 - j : j;
      const pole = document.createElement('div');
      pole.className = 'pole ' + ((w + k) % 2 === 0 ? 'jasne' : 'ciemne');
      if (wybrane && wybrane.w === w && wybrane.k === k) pole.classList.add('wybrane');
      if (ostatniRuch.some(p => p.w === w && p.k === k)) pole.classList.add('ostatni');
      if (krolWSzachu && krolWSzachu.w === w && krolWSzachu.k === k) pole.classList.add('szach');

      if (j === 0) pole.insertAdjacentHTML('beforeend', `<span class="wsp cyfra">${8 - w}</span>`);
      if (i === 7) pole.insertAdjacentHTML('beforeend', `<span class="wsp litera">${LITERY[k]}</span>`);

      const b = stan.plansza[w][k];
      if (b) pole.insertAdjacentHTML('beforeend', rysujBierke(b.typ, b.kolor));

      const ruch = mozliweRuchy.find(r => r.na.w === w && r.na.k === k);
      if (ruch) pole.insertAdjacentHTML('beforeend',
        `<span class="${b || ruch.wPrzelocie ? 'cel-bicie' : 'cel-ruch'}"></span>`);

      pole.addEventListener('click', () => kliknij(w, k));
      plansza.appendChild(pole);
    }
  }
  pokazStatus();
}

function pokazStatus() {
  const kto = stan.naRuchu === 'w' ? 'białych' : 'czarnych';
  if (stan.koniec === 'mat') {
    status.textContent = `Szach mat! Wygrywają ${stan.naRuchu === 'w' ? 'czarne' : 'białe'}.`;
  } else if (stan.koniec === 'pat') {
    status.textContent = 'Pat – remis.';
  } else if (czySzach(stan, stan.naRuchu)) {
    status.textContent = `Szach! Ruch ${kto}.`;
  } else if (wybrane) {
    const b = stan.plansza[wybrane.w][wybrane.k];
    const n = mozliweRuchy.length;
    const slowo = n === 1 ? 'możliwy ruch'
      : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)) ? 'możliwe ruchy' : 'możliwych ruchów';
    status.textContent = `${NAZWY[b.typ]}: ${n} ${slowo}`;
  } else {
    status.textContent = `Ruch ${kto}`;
  }
}

function kliknij(w, k) {
  if (stan.koniec || czekaNaPromocje) return;
  const b = stan.plansza[w][k];
  const ruch = mozliweRuchy.find(r => r.na.w === w && r.na.k === k);

  if (ruch) {
    if (ruch.promocja) return wybierzPromocje(ruch);
    return zagraj(ruch);
  }
  if (b && b.kolor === stan.naRuchu && !(wybrane && wybrane.w === w && wybrane.k === k)) {
    wybrane = { w, k };
    mozliweRuchy = legalneRuchy(stan, w, k);
  } else {
    wybrane = null;
    mozliweRuchy = [];
  }
  rysuj();
}

function zagraj(ruch, promujNa) {
  stan = wykonaj(stan, ruch, promujNa);
  ostatniRuch = [ruch.z, ruch.na];
  wybrane = null;
  mozliweRuchy = [];
  // Szach mat: król jest szachowany, a żadna bierka nie ma ruchu, który by go ratował
  // (ucieczka króla, zasłonięcie albo zbicie atakującej bierki). Bez szachu to pat.
  if (!czyJestJakisRuch(stan, stan.naRuchu)) {
    stan.koniec = czySzach(stan, stan.naRuchu) ? 'mat' : 'pat';
  }
  rysuj();
  if (stan.koniec) pokazKoniecGry();
}

// Okienko z wynikiem po zakończeniu partii.
function pokazKoniecGry() {
  const okno = document.createElement('div');
  okno.className = 'koniec-gry';
  if (stan.koniec === 'mat') {
    const wygrany = przeciwnik(stan.naRuchu);
    okno.innerHTML = `
      <div class="koniec-karta">
        <div class="koniec-krol">${rysujBierke('k', wygrany)}</div>
        <h2>Szach mat!</h2>
        <p>Wygrywają <strong>${wygrany === 'w' ? 'białe' : 'czarne'}</strong></p>
        <button class="koniec-nowa">Nowa gra</button>
        <button class="koniec-zamknij">Zobacz planszę</button>
      </div>`;
  } else {
    okno.innerHTML = `
      <div class="koniec-karta">
        <h2>Pat</h2>
        <p>Remis – ${stan.naRuchu === 'w' ? 'białe' : 'czarne'} nie mają żadnego ruchu, ale nie są szachowane.</p>
        <button class="koniec-nowa">Nowa gra</button>
        <button class="koniec-zamknij">Zobacz planszę</button>
      </div>`;
  }
  okno.querySelector('.koniec-nowa').addEventListener('click', () => { okno.remove(); nowaGra(); });
  okno.querySelector('.koniec-zamknij').addEventListener('click', () => okno.remove());
  document.querySelector('.plansza-ramka').appendChild(okno);
}

// Okienko wyboru bierki przy promocji pionka.
function wybierzPromocje(ruch) {
  czekaNaPromocje = ruch;
  const kolor = stan.plansza[ruch.z.w][ruch.z.k].kolor;
  const okno = document.createElement('div');
  okno.className = 'promocja';
  okno.innerHTML = '<p>Promuj pionka na:</p><div class="promocja-wybor"></div>';
  for (const typ of ['q', 'r', 'b', 'n']) {
    const przycisk = document.createElement('button');
    przycisk.title = NAZWY[typ];
    przycisk.innerHTML = rysujBierke(typ, kolor);
    przycisk.addEventListener('click', () => {
      okno.remove();
      czekaNaPromocje = null;
      zagraj(ruch, typ);
    });
    okno.querySelector('.promocja-wybor').appendChild(przycisk);
  }
  document.querySelector('.plansza-ramka').appendChild(okno);
}

document.getElementById('nowa').addEventListener('click', () => {
  document.querySelector('.promocja')?.remove();
  document.querySelector('.koniec-gry')?.remove();
  nowaGra();
});
document.getElementById('obroc').addEventListener('click', () => { obrocona = !obrocona; rysuj(); });

nowaGra();
