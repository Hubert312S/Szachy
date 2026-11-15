// Strona gry: rysowanie planszy, kliknięcia, okienka, gra z botem.
// Zasady są w zasady.js, silnik bota w silnik.js.

let stan;
let wybrane = null;     // { w, k }
let mozliweRuchy = [];  // legalne ruchy zaznaczonej bierki
let ostatniRuch = [];
let obrocona = false;
let czekaNaPromocje = null;
let historiaPozycji = {};  // ile razy wystąpiła dana pozycja (do remisu przez powtórzenie)

// Ustawienia wybrane w panelu oraz ustawienia trwającej partii.
const ustawienia = { tryb: 'bot', kolor: 'w', poziomId: 6 };
let gra = { tryb: 'dwoch', kolorGracza: 'w', poziom: null };
let botMysli = false;
let generacja = 0;      // zmienia się przy nowej grze – stare odpowiedzi bota są ignorowane
let polruchGry = 0;
let historia = [];          // wszystkie pozycje partii (do przeglądu po jej zakończeniu)
let przegladIndeks = null;  // którą pozycję z historii pokazujemy; null = zwykła gra

const plansza = document.getElementById('plansza');
const status = document.getElementById('status');
const infoPrzeciwnik = document.getElementById('przeciwnik-info');

function nowaGra() {
  generacja++;
  if (botMysli) restartujSilnik();
  botMysli = false;
  polruchGry = 0;
  document.querySelector('.promocja')?.remove();
  document.querySelector('.koniec-gry')?.remove();
  if (gra.tryb === 'bot') obrocona = gra.kolorGracza === 'b';
  stan = stanPoczatkowy();
  wybrane = null;
  mozliweRuchy = [];
  ostatniRuch = [];
  czekaNaPromocje = null;
  historiaPozycji = { [kluczPozycji(stan)]: 1 };
  historia = [{ stan, ostatniRuch: [], opis: 'Pozycja początkowa' }];
  przegladIndeks = null;
  document.getElementById('przeglad').classList.add('ukryte');
  document.querySelector('.propozycja-remisu')?.remove();
  pokazPrzeciwnika();
  rysuj();
  ruchBota();
}

// ---------- Rysowanie i obsługa kliknięć ----------

function rysuj() {
  plansza.innerHTML = '';
  // w przeglądzie pokazujemy wybraną pozycję z historii, w grze – bieżącą
  const widok = przegladIndeks !== null ? historia[przegladIndeks] : { stan, ostatniRuch };
  const st = widok.stan;
  const krolWSzachu = czySzach(st, st.naRuchu) ? znajdzKrola(st, st.naRuchu) : null;

  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const w = obrocona ? 7 - i : i;
      const k = obrocona ? 7 - j : j;
      const pole = document.createElement('div');
      pole.className = 'pole ' + ((w + k) % 2 === 0 ? 'jasne' : 'ciemne');
      if (wybrane && wybrane.w === w && wybrane.k === k) pole.classList.add('wybrane');
      if (widok.ostatniRuch.some(p => p.w === w && p.k === k)) pole.classList.add('ostatni');
      if (krolWSzachu && krolWSzachu.w === w && krolWSzachu.k === k) pole.classList.add('szach');

      if (j === 0) pole.insertAdjacentHTML('beforeend', `<span class="wsp cyfra">${8 - w}</span>`);
      if (i === 7) pole.insertAdjacentHTML('beforeend', `<span class="wsp litera">${LITERY[k]}</span>`);

      const b = st.plansza[w][k];
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
  plansza.classList.toggle('czeka', botMysli);
  if (przegladIndeks !== null) {
    pokazPrzeglad();
  }
  if (botMysli && !stan.koniec) {
    status.textContent = `${gra.poziom.nazwa} myśli…`;
  } else if (stan.koniec === 'mat') {
    status.textContent = `Szach mat! Wygrywają ${stan.naRuchu === 'w' ? 'czarne' : 'białe'}.`;
  } else if (stan.koniec) {
    status.textContent = stan.koniec === 'pat' ? 'Pat – remis.' : `Remis – ${OPISY_KONCA[stan.koniec][1]().toLowerCase()}`;
  } else if (czySzach(stan, stan.naRuchu)) {
    status.textContent = `Szach! Ruch ${kto}.`;
  } else if (wybrane) {
    const b = stan.plansza[wybrane.w][wybrane.k];
    const n = mozliweRuchy.length;
    const slowo = n === 1 ? 'możliwy ruch'
      : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)) ? 'możliwe ruchy' : 'możliwych ruchów';
    status.textContent = `${NAZWY[b.typ]}: ${n} ${slowo}`;
  } else if (gra.tryb === 'bot') {
    status.textContent = 'Twój ruch';
  } else {
    status.textContent = `Ruch ${kto}`;
  }
}

function kliknij(w, k) {
  if (stan.koniec || czekaNaPromocje || botMysli) return;
  if (gra.tryb === 'bot' && stan.naRuchu !== gra.kolorGracza) return;
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
  const opis = opisRuchu(stan, ruch, promujNa);
  stan = wykonaj(stan, ruch, promujNa);
  polruchGry++;
  ostatniRuch = [ruch.z, ruch.na];
  wybrane = null;
  mozliweRuchy = [];
  document.querySelector('.propozycja-remisu')?.remove();
  const klucz = kluczPozycji(stan);
  historiaPozycji[klucz] = (historiaPozycji[klucz] || 0) + 1;

  // Szach mat: król jest szachowany, a żadna bierka nie ma ruchu, który by go ratował
  // (ucieczka króla, zasłonięcie albo zbicie atakującej bierki). Bez szachu to pat.
  if (!czyJestJakisRuch(stan, stan.naRuchu)) {
    stan.koniec = czySzach(stan, stan.naRuchu) ? 'mat' : 'pat';
  } else if (brakMaterialu(stan)) {
    stan.koniec = 'material';
  } else if (historiaPozycji[klucz] >= 3) {
    stan.koniec = 'powtorzenie';
  } else if (stan.polruchyBezBicia >= 100) {
    stan.koniec = 'ruchy50';
  }
  historia.push({ stan, ostatniRuch, opis });
  rysuj();
  if (stan.koniec) pokazKoniecGry();
  else ruchBota();
}

// Opis ruchu do przeglądu, np. „Skoczek g1–f3”, „Pionek e5×d6”, „Król: roszada krótka”.
function opisRuchu(st, ruch, promujNa) {
  const b = st.plansza[ruch.z.w][ruch.z.k];
  const pole = p => LITERY[p.k] + (8 - p.w);
  if (ruch.roszada) return `${NAZWY.k}: roszada ${ruch.roszada === 'krotka' ? 'krótka' : 'długa'}`;
  const bicie = st.plansza[ruch.na.w][ruch.na.k] || ruch.wPrzelocie;
  let tekst = `${NAZWY[b.typ]} ${pole(ruch.z)}${bicie ? '×' : '–'}${pole(ruch.na)}`;
  if (ruch.promocja) tekst += ` = ${NAZWY[promujNa || 'q'].toLowerCase()}`;
  return tekst;
}

// ---------- Przegląd partii ----------

function wlaczPrzeglad() {
  przegladIndeks = historia.length - 1;
  document.getElementById('przeglad').classList.remove('ukryte');
  rysuj();
}

function przejdzDo(indeks) {
  if (przegladIndeks === null) return;
  przegladIndeks = Math.max(0, Math.min(historia.length - 1, indeks));
  document.querySelector('.koniec-gry')?.remove();
  rysuj();
}

function pokazPrzeglad() {
  const n = historia.length - 1;
  const i = przegladIndeks;
  const info = document.getElementById('przeglad-info');
  if (i === 0) info.textContent = `Pozycja początkowa (0 z ${n})`;
  else {
    const numer = Math.ceil(i / 2);
    const kto = i % 2 === 1 ? 'białe' : 'czarne';
    const ktoPierwszy = historia[0].stan.naRuchu;
    const strona = ktoPierwszy === 'w' ? kto : (kto === 'białe' ? 'czarne' : 'białe');
    info.textContent = `Półruch ${i} z ${n} · ${numer}. ${strona}: ${historia[i].opis}`;
  }
  const [poczatek, wstecz, naprzod, koniec] = document.querySelectorAll('#przeglad button');
  poczatek.disabled = wstecz.disabled = i === 0;
  naprzod.disabled = koniec.disabled = i === n;
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
        ${gra.tryb === 'bot' ? `<p class="koniec-bot">${wygrany === gra.kolorGracza
          ? `Pokonałeś bota: ${gra.poziom.nazwa} (${gra.poziom.elo})!` : `Wygrał bot: ${gra.poziom.nazwa} (${gra.poziom.elo}).`}</p>` : ''}
        <button class="koniec-nowa">Nowa gra</button>
        <button class="koniec-zamknij">Zobacz planszę</button>
      </div>`;
  } else {
    const [tytul, opis] = OPISY_KONCA[stan.koniec];
    okno.innerHTML = `
      <div class="koniec-karta">
        <div class="koniec-krol remis-krole">${rysujBierke('k', 'w')}${rysujBierke('k', 'b')}</div>
        <h2>${tytul}</h2>
        <p>${tytul === 'Pat' ? 'Remis – ' : ''}${opis(stan.naRuchu === 'w' ? 'Białe' : 'Czarne')}</p>
        <button class="koniec-nowa">Nowa gra</button>
        <button class="koniec-zamknij">Zobacz planszę</button>
      </div>`;
  }
  okno.querySelector('.koniec-nowa').addEventListener('click', () => { okno.remove(); nowaGra(); });
  okno.querySelector('.koniec-zamknij').addEventListener('click', () => okno.remove());
  document.querySelector('.plansza-ramka').appendChild(okno);
  wlaczPrzeglad();
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

document.getElementById('nowa').addEventListener('click', nowaGra);
// Remis za zgodą: gracz na ruchu proponuje, przeciwnik przyjmuje albo odrzuca.
document.getElementById('remis').addEventListener('click', () => {
  if (stan.koniec || czekaNaPromocje || botMysli || document.querySelector('.propozycja-remisu')) return;
  if (gra.tryb === 'bot') return zaproponujRemisBotowi();
  const proponuje = stan.naRuchu === 'w' ? 'Białe' : 'Czarne';
  const odpowiada = stan.naRuchu === 'w' ? 'Czarne' : 'Białe';
  const okno = document.createElement('div');
  okno.className = 'propozycja-remisu';
  okno.innerHTML = `
    <span>${proponuje} proponują remis. ${odpowiada}, przyjmujecie?</span>
    <button class="przyjmij">Przyjmij</button>
    <button class="odrzuc">Odrzuć</button>`;
  okno.querySelector('.przyjmij').addEventListener('click', () => {
    okno.remove();
    stan.koniec = 'zgoda';
    wybrane = null;
    mozliweRuchy = [];
    rysuj();
    pokazKoniecGry();
  });
  okno.querySelector('.odrzuc').addEventListener('click', () => okno.remove());
  document.querySelector('.przyciski').after(okno);
});

document.getElementById('obroc').addEventListener('click', () => { obrocona = !obrocona; rysuj(); });

// Przyciski przeglądu partii i strzałki na klawiaturze.
document.getElementById('przeglad-poczatek').addEventListener('click', () => przejdzDo(0));
document.getElementById('przeglad-wstecz').addEventListener('click', () => przejdzDo(przegladIndeks - 1));
document.getElementById('przeglad-naprzod').addEventListener('click', () => przejdzDo(przegladIndeks + 1));
document.getElementById('przeglad-koniec').addEventListener('click', () => przejdzDo(historia.length - 1));
document.addEventListener('keydown', e => {
  if (przegladIndeks === null) return;
  const cel = { ArrowLeft: przegladIndeks - 1, ArrowRight: przegladIndeks + 1, Home: 0, End: historia.length - 1 }[e.key];
  if (cel !== undefined) { e.preventDefault(); przejdzDo(cel); }
});

// ---------- Bot ----------

// Silnik liczy w osobnym wątku (Web Worker), żeby strona nie zamarzała.
// Worker tworzymy z kodu funkcji stworzSilnik – działa też przy otwarciu pliku z dysku.
let silnikWorker = null;
let silnikLokalny = null;
const oczekujace = new Map();
let numerZapytania = 0;

function uruchomSilnik() {
  try {
    const kod = `const KSIAZKA_DEBIUTOW = ${JSON.stringify(KSIAZKA_DEBIUTOW)};
${stworzSilnik.toString()}
const silnik = stworzSilnik();
self.onmessage = e => {
  const { id, typ, pozycja, poziom, opcje } = e.data;
  const wynik = typ === 'ruch' ? silnik.najlepszyRuch(pozycja, poziom, opcje) : silnik.ocenPozycje(pozycja);
  self.postMessage({ id, wynik });
};`;
    silnikWorker = new Worker(URL.createObjectURL(new Blob([kod], { type: 'text/javascript' })));
    silnikWorker.onmessage = e => {
      const zadanie = oczekujace.get(e.data.id);
      oczekujace.delete(e.data.id);
      zadanie?.resolve(e.data.wynik);
    };
    silnikWorker.onerror = () => {
      // przeglądarka nie pozwala na wątek – liczymy w głównym wątku
      silnikWorker = null;
      for (const [, z] of oczekujace) policzLokalnie(z);
      oczekujace.clear();
    };
  } catch (e) {
    silnikWorker = null;
  }
}

function policzLokalnie(z) {
  setTimeout(() => {
    silnikLokalny ||= stworzSilnik();
    const { typ, pozycja, poziom, opcje } = z.dane;
    z.resolve(typ === 'ruch' ? silnikLokalny.najlepszyRuch(pozycja, poziom, opcje) : silnikLokalny.ocenPozycje(pozycja));
  }, 30);
}

function zapytajSilnik(dane) {
  return new Promise(resolve => {
    const id = ++numerZapytania;
    const zadanie = { dane, resolve };
    if (silnikWorker) {
      oczekujace.set(id, zadanie);
      silnikWorker.postMessage({ id, ...dane });
    } else policzLokalnie(zadanie);
  });
}

function restartujSilnik() {
  silnikWorker?.terminate();
  oczekujace.clear();
  uruchomSilnik();
}

const czekaj = ms => new Promise(r => setTimeout(r, ms));

async function ruchBota() {
  if (gra.tryb !== 'bot' || stan.koniec || stan.naRuchu === gra.kolorGracza || botMysli) return;
  const moja = generacja;
  botMysli = true;
  rysuj();
  const start = Date.now();
  const wynik = await zapytajSilnik({ typ: 'ruch', pozycja: stan, poziom: gra.poziom, opcje: { numerPolruchu: polruchGry, historia: historia.slice(0, -1).map(h => h.stan) } });
  await czekaj(Math.max(0, 450 - (Date.now() - start)));   // żeby ruch nie pojawiał się „znikąd”
  if (moja !== generacja || !wynik) return;
  botMysli = false;
  const ruch = legalneRuchy(stan, wynik.z.w, wynik.z.k).find(r => r.na.w === wynik.na.w && r.na.k === wynik.na.k);
  if (!ruch) { rysuj(); return; }
  zagraj(ruch, wynik.promocja || 'q');
}

// Bot przyjmuje remis, gdy uważa, że stoi gorzej.
async function zaproponujRemisBotowi() {
  const okno = document.createElement('div');
  okno.className = 'propozycja-remisu';
  okno.innerHTML = '<span>Bot zastanawia się nad remisem…</span>';
  document.querySelector('.przyciski').after(okno);
  const moja = generacja;
  const ocenaGracza = await zapytajSilnik({ typ: 'ocena', pozycja: stan });
  await czekaj(500);
  if (moja !== generacja || stan.koniec) { okno.remove(); return; }
  if (-ocenaGracza < -80) {
    okno.remove();
    stan.koniec = 'zgoda';
    rysuj();
    pokazKoniecGry();
  } else {
    okno.querySelector('span').textContent = 'Bot odrzuca remis – uważa, że ma jeszcze szanse.';
    setTimeout(() => okno.remove(), 3000);
  }
}

// ---------- Panel wyboru przeciwnika ----------

function pokazPrzeciwnika() {
  if (gra.tryb === 'bot') {
    const p = gra.poziom;
    infoPrzeciwnik.innerHTML = `Grasz ${gra.kolorGracza === 'w' ? 'białymi' : 'czarnymi'} przeciwko: <strong>${p.nazwa}</strong>${p.skrot ? ` <span class="tytul">${p.skrot}</span>` : ''} · Elo ${p.elo}`;
  } else {
    infoPrzeciwnik.textContent = 'Dwóch graczy przy jednym komputerze';
  }
}

function zbudujPanel() {
  const lista = document.getElementById('poziomy');
  for (const p of POZIOMY_BOTA) {
    const el = document.createElement('button');
    el.className = 'poziom';
    el.dataset.id = p.id;
    el.innerHTML = `
      <span class="poziom-gora">
        <span class="poziom-nazwa">${p.nazwa}${p.skrot ? ` <span class="tytul">${p.skrot}</span>` : ''}</span>
        <span class="poziom-elo">${p.elo}</span>
      </span>
      <span class="poziom-opis">${p.opis}</span>`;
    el.addEventListener('click', () => { ustawienia.poziomId = p.id; odswiezPanel(); });
    lista.appendChild(el);
  }
  for (const b of document.querySelectorAll('#tryb button'))
    b.addEventListener('click', () => { ustawienia.tryb = b.dataset.tryb; odswiezPanel(); });
  for (const b of document.querySelectorAll('#kolor button'))
    b.addEventListener('click', () => { ustawienia.kolor = b.dataset.kolor; odswiezPanel(); });
  document.getElementById('start').addEventListener('click', () => {
    const kolor = ustawienia.kolor === 'losowo' ? (Math.random() < 0.5 ? 'w' : 'b') : ustawienia.kolor;
    gra = {
      tryb: ustawienia.tryb,
      kolorGracza: kolor,
      poziom: POZIOMY_BOTA.find(p => p.id === ustawienia.poziomId)
    };
    if (gra.tryb === 'dwoch') obrocona = false;
    nowaGra();
  });
  odswiezPanel();
}

function odswiezPanel() {
  for (const b of document.querySelectorAll('#tryb button')) b.classList.toggle('aktywny', b.dataset.tryb === ustawienia.tryb);
  for (const b of document.querySelectorAll('#kolor button')) b.classList.toggle('aktywny', b.dataset.kolor === ustawienia.kolor);
  for (const b of document.querySelectorAll('.poziom')) b.classList.toggle('aktywny', +b.dataset.id === ustawienia.poziomId);
  document.getElementById('opcje-bota').classList.toggle('ukryte', ustawienia.tryb !== 'bot');
  document.getElementById('start').textContent = ustawienia.tryb === 'bot' ? 'Zagraj z botem' : 'Nowa gra dla dwóch graczy';
}

uruchomSilnik();
zbudujPanel();
nowaGra();
