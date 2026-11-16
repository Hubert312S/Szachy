// Testy strony gry (klikanie, okienka, panel, gra z botem). Działają tylko w przeglądarce:
// testy/index.html zawiera kopię strony gry, na której klikają te testy.

const P = { przegladarka: true };
let stronaZaladowana = null;

function zaladujStrone() {
  return stronaZaladowana ||= new Promise((ok, blad) => {
    const s = document.createElement('script');
    s.src = '../js/szachy.js';
    s.onload = ok;
    s.onerror = () => blad(new Error('nie udało się wczytać js/szachy.js'));
    document.body.appendChild(s);
  });
}

const strona = () => document.getElementById('gra-testowa');
const poczekaj = ms => new Promise(r => setTimeout(r, ms));

async function poczekajAz(warunek, limit = 15000) {
  const start = Date.now();
  while (!warunek()) {
    if (Date.now() - start > limit) throw new Error('przekroczono czas oczekiwania');
    await poczekaj(50);
  }
}

// Kliknięcie pola po nazwie, np. klik('e2') – uwzględnia obrócenie planszy.
function klik(nazwa) {
  const p = POLE(nazwa);
  const i = obrocona ? 7 - p.w : p.w, j = obrocona ? 7 - p.k : p.k;
  strona().querySelectorAll('.pole')[i * 8 + j].click();
}
function klikRuchy(ruchy) {
  for (const r of ruchy.split(' ')) { klik(r.slice(0, 2)); klik(r.slice(2, 4)); }
}

async function nowaGraDwochGraczy() {
  await zaladujStrone();
  strona().querySelector('#tryb [data-tryb="dwoch"]').click();
  strona().querySelector('#start').click();
}

grupa('Strona gry', () => {
  test('Plansza ma 64 pola i 32 bierki', async () => {
    await nowaGraDwochGraczy();
    oczekuj(strona().querySelectorAll('.pole').length).toBe(64);
    oczekuj(strona().querySelectorAll('.pole .bierka-svg').length).toBe(32);
  }, P);

  test('Kliknięcie pionka pokazuje jego 2 możliwe ruchy', async () => {
    await nowaGraDwochGraczy();
    klik('e2');
    oczekuj(strona().querySelectorAll('.cel-ruch').length).toBe(2);
    oczekuj(strona().querySelector('#status').textContent).toBe('Pionek: 2 możliwe ruchy');
  }, P);

  test('Po ruchu białych jest ruch czarnych', async () => {
    await nowaGraDwochGraczy();
    klikRuchy('e2e4');
    oczekuj(strona().querySelector('#status').textContent).toBe('Ruch czarnych');
  }, P);

  test('Nie da się ruszyć bierką przeciwnika', async () => {
    await nowaGraDwochGraczy();
    klik('e7');
    oczekuj(strona().querySelectorAll('.cel-ruch').length).toBe(0);
  }, P);

  test('Mat głupca pokazuje okienko „Wygrywają czarne”', async () => {
    await nowaGraDwochGraczy();
    klikRuchy('f2f3 e7e5 g2g4 d8h4');
    const okno = strona().querySelector('.koniec-gry');
    oczekuj(!!okno).toBeTruthy();
    oczekuj(okno.textContent).toContain('Wygrywają czarne');
  }, P);

  test('Remis za zgodą kończy grę', async () => {
    await nowaGraDwochGraczy();
    strona().querySelector('#remis').click();
    strona().querySelector('.przyjmij').click();
    oczekuj(strona().querySelector('.koniec-gry').textContent).toContain('zgodzili się na remis');
  }, P);

  test('Odrzucony remis – gra toczy się dalej', async () => {
    await nowaGraDwochGraczy();
    strona().querySelector('#remis').click();
    strona().querySelector('.odrzuc').click();
    oczekuj(strona().querySelector('.koniec-gry')).toBe(null);
    klikRuchy('e2e4');
    oczekuj(strona().querySelector('#status').textContent).toBe('Ruch czarnych');
  }, P);
});

grupa('Panel i gra z botem', () => {
  test('Panel pokazuje wszystkie poziomy z Elo', async () => {
    await zaladujStrone();
    const poziomy = strona().querySelectorAll('.poziom');
    oczekuj(poziomy.length).toBe(POZIOMY_BOTA.length);
    oczekuj(strona().querySelector('.poziom[data-id="12"]').textContent).toContain('2823');
    oczekuj(poziomy[poziomy.length - 1].textContent).toContain('Hell bot');
  }, P);

  test('Bot odpowiada na ruch gracza', async () => {
    await zaladujStrone();
    strona().querySelector('#tryb [data-tryb="bot"]').click();
    strona().querySelector('#kolor [data-kolor="w"]').click();
    strona().querySelector('.poziom[data-id="3"]').click();
    strona().querySelector('#start').click();
    oczekuj(strona().querySelector('#przeciwnik-info').textContent).toContain('Amator');
    klikRuchy('e2e4');
    await poczekajAz(() => polruchGry === 2);
    oczekuj(strona().querySelector('#status').textContent).toBe('Twój ruch');
  }, P);

  test('Podczas myślenia bota nie można ruszać bierkami', async () => {
    await zaladujStrone();
    strona().querySelector('.poziom[data-id="7"]').click();
    strona().querySelector('#start').click();
    klikRuchy('a2a3');           // poza książką – bot liczy
    klik('b2');
    oczekuj(strona().querySelectorAll('.cel-ruch').length).toBe(0);
    await poczekajAz(() => polruchGry === 2);
  }, P);

  test('Grając czarnymi plansza jest obrócona, a bot zaczyna', async () => {
    await zaladujStrone();
    strona().querySelector('#kolor [data-kolor="b"]').click();
    strona().querySelector('.poziom[data-id="1"]').click();
    strona().querySelector('#start').click();
    oczekuj(obrocona).toBeTruthy();
    await poczekajAz(() => polruchGry === 1);
    oczekuj(strona().querySelector('#status').textContent).toBe('Twój ruch');
    strona().querySelector('#kolor [data-kolor="w"]').click();
  }, P);

  test('Nowa gra w trakcie myślenia bota nie psuje partii', async () => {
    await zaladujStrone();
    strona().querySelector('.poziom[data-id="12"]').click();
    strona().querySelector('#start').click();
    klikRuchy('a2a3');
    await poczekaj(100);
    strona().querySelector('#nowa').click();
    await poczekaj(800);
    oczekuj(polruchGry).toBe(0);
    oczekuj(strona().querySelector('#status').textContent).toBe('Twój ruch');
  }, P);
});

grupa('Przegląd partii', () => {
  const liczbaBierek = () => strona().querySelectorAll('.pole .bierka-svg').length;
  const przycisk = id => strona().querySelector('#przeglad-' + id);

  async function partiaZBiciem() {
    await nowaGraDwochGraczy();
    // 1.e4 d5 2.exd5 (bicie), potem remis za zgodą kończy partię
    klikRuchy('e2e4 d7d5 e4d5');
    strona().querySelector('#remis').click();
    strona().querySelector('.przyjmij').click();
  }

  test('W trakcie gry przegląd jest ukryty', async () => {
    await nowaGraDwochGraczy();
    klikRuchy('e2e4');
    oczekuj(strona().querySelector('#przeglad').classList.contains('ukryte')).toBeTruthy();
  }, P);

  test('Po zakończeniu gry pojawia się przegląd na ostatniej pozycji', async () => {
    await partiaZBiciem();
    oczekuj(strona().querySelector('#przeglad').classList.contains('ukryte')).toBeFalsy();
    oczekuj(liczbaBierek()).toBe(31);
    oczekuj(przycisk('naprzod').disabled).toBeTruthy();
    oczekuj(przycisk('koniec').disabled).toBeTruthy();
  }, P);

  test('Przycisk „na początek” pokazuje pozycję startową', async () => {
    await partiaZBiciem();
    przycisk('poczatek').click();
    oczekuj(liczbaBierek()).toBe(32);
    oczekuj(strona().querySelector('#przeglad-info').textContent).toContain('Pozycja początkowa');
    oczekuj(przycisk('wstecz').disabled).toBeTruthy();
  }, P);

  test('Ruch wstecz i naprzód przechodzą o jeden półruch', async () => {
    await partiaZBiciem();
    przycisk('wstecz').click();                         // przed biciem exd5
    oczekuj(liczbaBierek()).toBe(32);
    oczekuj(strona().querySelector('#przeglad-info').textContent).toContain('Półruch 2 z 3');
    przycisk('naprzod').click();
    oczekuj(liczbaBierek()).toBe(31);
    oczekuj(strona().querySelector('#przeglad-info').textContent).toContain('Pionek e4×d5');
  }, P);

  test('Przycisk „na koniec” wraca do ostatniej pozycji', async () => {
    await partiaZBiciem();
    przycisk('poczatek').click();
    przycisk('koniec').click();
    oczekuj(liczbaBierek()).toBe(31);
    oczekuj(strona().querySelector('#przeglad-info').textContent).toContain('Półruch 3 z 3');
  }, P);

  test('Strzałki na klawiaturze przewijają partię', async () => {
    await partiaZBiciem();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home' }));
    oczekuj(liczbaBierek()).toBe(32);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    oczekuj(strona().querySelector('#przeglad-info').textContent).toContain('Półruch 1 z 3');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'End' }));
    oczekuj(liczbaBierek()).toBe(31);
  }, P);

  test('W przeglądzie nie da się ruszać bierkami', async () => {
    await partiaZBiciem();
    przycisk('poczatek').click();
    klik('e2');
    oczekuj(strona().querySelectorAll('.cel-ruch').length).toBe(0);
  }, P);

  test('Nowa gra chowa przegląd', async () => {
    await partiaZBiciem();
    await nowaGraDwochGraczy();
    oczekuj(strona().querySelector('#przeglad').classList.contains('ukryte')).toBeTruthy();
    oczekuj(liczbaBierek()).toBe(32);
  }, P);
});

grupa('Hell bot (Stockfish)', () => {
  test('Stockfish uruchamia się i znajduje mata w 1 (mat głupca)', async () => {
    const ruch = await HellBot.ruch(['f2f3', 'e7e5', 'g2g4'], 1000);
    oczekuj(ruch).toBe('d8h4');
  }, P);

  test('Stockfish wykorzystuje podstawiony materiał', async () => {
    // 1.e4 e5 2.Qh5 Nc6 3.Qxe5+?? – czarne zbijają hetmana skoczkiem
    const ruch = await HellBot.ruch(['e2e4', 'e7e5', 'd1h5', 'b8c6', 'h5e5'], 1000);
    oczekuj(ruch).toBe('c6e5');
  }, P);

  test('Hell bot odpowiada w grze legalnym ruchem', async () => {
    await zaladujStrone();
    strona().querySelector('#tryb [data-tryb="bot"]').click();
    strona().querySelector('#kolor [data-kolor="w"]').click();
    strona().querySelector('.poziom[data-id="13"]').click();
    strona().querySelector('#start').click();
    oczekuj(strona().querySelector('#przeciwnik-info').textContent).toContain('Hell bot');
    klikRuchy('d2d4');
    await poczekajAz(() => polruchGry === 2, 30000);
    oczekuj(strona().querySelector('#status').textContent).toBe('Twój ruch');
    oczekuj(historia[2].uci.length >= 4).toBeTruthy();
  }, P);
});
