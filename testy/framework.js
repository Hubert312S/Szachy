// Mały framework do testów – działa w przeglądarce (testy/index.html) i w Node (testy/uruchom.js).

const TESTY = [];
let aktualnaGrupa = '';

function grupa(nazwa, fn) {
  aktualnaGrupa = nazwa;
  fn();
  aktualnaGrupa = '';
}

// opcje.przegladarka = true – test potrzebuje strony (DOM), w Node jest pomijany
function test(nazwa, fn, opcje = {}) {
  TESTY.push({ grupa: aktualnaGrupa, nazwa, fn, ...opcje });
}

const pokaz = w => typeof w === 'string' ? `"${w}"` : JSON.stringify(w);

function oczekuj(wartosc) {
  return {
    toBe(o) { if (wartosc !== o) throw new Error(`oczekiwano ${pokaz(o)}, jest ${pokaz(wartosc)}`); },
    toEqual(o) { if (JSON.stringify(wartosc) !== JSON.stringify(o)) throw new Error(`oczekiwano ${pokaz(o)}, jest ${pokaz(wartosc)}`); },
    toBeTruthy() { if (!wartosc) throw new Error(`oczekiwano prawdy, jest ${pokaz(wartosc)}`); },
    toBeFalsy() { if (wartosc) throw new Error(`oczekiwano fałszu, jest ${pokaz(wartosc)}`); },
    toContain(x) { if (!wartosc.includes(x)) throw new Error(`${pokaz(wartosc)} nie zawiera ${pokaz(x)}`); },
    toBeGreaterThan(x) { if (!(wartosc > x)) throw new Error(`oczekiwano więcej niż ${x}, jest ${pokaz(wartosc)}`); },
    toBeLessThan(x) { if (!(wartosc < x)) throw new Error(`oczekiwano mniej niż ${x}, jest ${pokaz(wartosc)}`); }
  };
}

// ---------- Pomocnicze funkcje szachowe do testów ----------

const NAZWA_POLA = p => 'abcdefgh'[p.k] + (8 - p.w);
const POLE = n => ({ w: 8 - +n[1], k: 'abcdefgh'.indexOf(n[0]) });

// Pola, na które może pójść bierka z danego pola (posortowane), np. ruchyZ(st, 'e2') -> ['e3','e4']
function ruchyZ(st, pole) {
  const p = POLE(pole);
  return legalneRuchy(st, p.w, p.k).map(r => NAZWA_POLA(r.na)).sort();
}

// Wykonuje ruchy zapisane jako "e2e4 e7e5 e7e8q" i zwraca nowy stan.
function zagrajRuchy(st, ruchy) {
  for (const zapis of ruchy.split(' ').filter(Boolean)) {
    const z = POLE(zapis.slice(0, 2)), na = POLE(zapis.slice(2, 4));
    const ruch = legalneRuchy(st, z.w, z.k).find(r => r.na.w === na.w && r.na.k === na.k);
    if (!ruch) throw new Error(`ruch ${zapis} jest nielegalny`);
    st = wykonaj(st, ruch, zapis[4] || 'q');
  }
  return st;
}

function perftZasad(st, n) {
  if (n === 0) return 1;
  let suma = 0;
  for (const r of wszystkieRuchy(st)) {
    if (r.promocja) for (const t of 'qrbn') suma += perftZasad(wykonaj(st, r, t), n - 1);
    else suma += perftZasad(wykonaj(st, r), n - 1);
  }
  return suma;
}

// ---------- Uruchamianie ----------

async function uruchomTesty(raport, srodowisko) {
  const wynik = { ok: 0, bledy: 0, pominiete: 0 };
  for (const t of TESTY) {
    if (t.przegladarka && srodowisko !== 'przegladarka') {
      wynik.pominiete++;
      raport({ ...t, stan: 'pominiety' });
      continue;
    }
    const start = Date.now();
    try {
      await t.fn();
      wynik.ok++;
      raport({ ...t, stan: 'ok', czas: Date.now() - start });
    } catch (e) {
      wynik.bledy++;
      raport({ ...t, stan: 'blad', czas: Date.now() - start, blad: e.message });
    }
  }
  return wynik;
}
