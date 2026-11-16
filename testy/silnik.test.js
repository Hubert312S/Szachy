// Testy bota: generator ruchów, taktyka, poziomy, książka debiutów, partie bot kontra bot.

let silnikTestowy = null;
const silnik = () => (silnikTestowy ||= stworzSilnik());
const szybki = (poziom, czas = 150) => poziom.czas ? { ...poziom, czas } : poziom;
const zapisRuchu = r => NAZWA_POLA(r.z) + NAZWA_POLA(r.na);

function czyLegalny(st, r) {
  return legalneRuchy(st, r.z.w, r.z.k).some(m => m.na.w === r.na.w && m.na.k === r.na.k);
}

grupa('Silnik – generator ruchów', () => {
  const pozycje = [
    ['startowa', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -', [20, 400, 8902, 197281]],
    ['Kiwipete', 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq -', [48, 2039, 97862]],
    ['końcówka z przelotem', '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - -', [14, 191, 2812, 43238]],
    ['promocje i szachy', 'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq -', [6, 264, 9467]],
    ['pozycja 5', 'rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ -', [44, 1486, 62379]]
  ];
  for (const [nazwa, fen, oczekiwane] of pozycje) {
    test(`Perft silnika – ${nazwa}`, () => {
      oczekiwane.forEach((liczba, i) => oczekuj(silnik().perft(zFEN(fen), i + 1)).toBe(liczba));
    });
  }

  test('Silnik i zasady gry liczą tak samo (perft 3 z pozycji startowej)', () => {
    oczekuj(silnik().perft(stanPoczatkowy(), 3)).toBe(perftZasad(stanPoczatkowy(), 3));
  });
});

grupa('Silnik – taktyka', () => {
  const zadania = [
    ['mat w 1 (wieża na ostatniej linii)', '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - -', 'a1a8'],
    ['mat w 3 (poświęcenie)', 'r5rk/5p1p/5R2/4B3/8/8/7P/7K w - -', 'f6a6'],
    ['zbija niebronionego hetmana', 'rnb1kbnr/pppp1ppp/8/4p3/4P2q/5N2/PPPP1PPP/RNBQKB1R w KQkq -', 'f3h4'],
    ['widełki skoczkiem (szach + hetman)', '4k3/8/8/8/3n4/8/2K1Q3/8 b - -', 'd4e2']
  ];
  for (const [nazwa, fen, oczekiwany] of zadania) {
    test(`Bot znajduje: ${nazwa}`, () => {
      const r = silnik().najlepszyRuch(zFEN(fen), { id: 99, czas: 1500 });
      oczekuj(zapisRuchu(r)).toBe(oczekiwany);
    });
  }

  test('Bot rozpoznaje mata w ocenie', () => {
    const r = silnik().najlepszyRuch(zFEN('6k1/5ppp/8/8/8/8/5PPP/R5K1 w - -'), { id: 99, czas: 500 });
    oczekuj(r.ocena).toBeGreaterThan(90000);
  });
});

grupa('Poziomy bota', () => {
  test('Poziomy są ułożone rosnąco według Elo', () => {
    for (let i = 1; i < POZIOMY_BOTA.length; i++) oczekuj(POZIOMY_BOTA[i].elo).toBeGreaterThan(POZIOMY_BOTA[i - 1].elo);
  });

  test('Tytuły zgadzają się z progami FIDE (CM 2200, FM 2300, IM 2400, GM 2500)', () => {
    const prog = { CM: 2200, FM: 2300, IM: 2400, GM: 2500 };
    for (const p of POZIOMY_BOTA) if (prog[p.skrot]) oczekuj(p.elo >= prog[p.skrot]).toBeTruthy();
  });

  test('Najwyższy „ludzki” poziom to Magnus Carlsen (2823 – ranking FIDE, listopad 2026)', () => {
    const naj = POZIOMY_BOTA.find(p => p.id === 12);
    oczekuj(naj.elo).toBe(2823);
    oczekuj(naj.opis).toContain('Carlsen');
  });

  test('Ostatni poziom to Hell bot oparty na Stockfishu', () => {
    const hell = POZIOMY_BOTA[POZIOMY_BOTA.length - 1];
    oczekuj(hell.nazwa).toBe('Hell bot');
    oczekuj(hell.silnik).toBe('stockfish');
  });

  const pozycjeTestowe = [
    stanPoczatkowy(),
    zFEN('r1bq1rk1/pp2bppp/2n1pn2/3p4/2PP4/2N1PN2/PP3PPP/R2QKB1R w KQ -'),
    zFEN('8/5k2/8/3K4/8/8/3P4/8 w - -'),
    zFEN('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R b KQkq -')
  ];
  for (const p of POZIOMY_BOTA.filter(p => !p.silnik)) {
    test(`Poziom „${p.nazwa}” (${p.elo}) zawsze gra legalne ruchy`, () => {
      for (const st of pozycjeTestowe) oczekuj(czyLegalny(st, silnik().najlepszyRuch(st, szybki(p, 80)))).toBeTruthy();
    });
  }

  test('Bot promuje pionka, gdy to najlepszy ruch', () => {
    const r = silnik().najlepszyRuch(zFEN('8/4P1k1/8/8/8/8/8/4K3 w - -'), { id: 99, czas: 500 });
    oczekuj(zapisRuchu(r)).toBe('e7e8');
    oczekuj(r.promocja).toBe('q');
  });
});

grupa('Książka debiutów', () => {
  test('Wszystkie linie książki są poprawnymi ruchami', () => {
    oczekuj(silnik().sprawdzKsiazke()).toBeGreaterThan(200);
  });

  test('Silny bot odpowiada z książki znanym debiutem', () => {
    const st = zagrajRuchy(stanPoczatkowy(), 'e2e4');
    const r = silnik().najlepszyRuch(st, POZIOMY_BOTA[9]);
    oczekuj(r.zKsiazki).toBeTruthy();
    oczekuj(['e7e5', 'c7c5', 'e7e6', 'c7c6', 'd7d5', 'g8f6', 'd7d6']).toContain(zapisRuchu(r));
  });

  test('Słabe poziomy nie korzystają z książki', () => {
    const r = silnik().najlepszyRuch(stanPoczatkowy(), POZIOMY_BOTA[0]);
    oczekuj(r.zKsiazki).toBeFalsy();
  });
});

grupa('Partie bot kontra bot', () => {
  // Losowość słabszych poziomów z ustalonym ziarnem – wynik testu zawsze ten sam.
  function generatorLosowy(ziarno) {
    return () => {
      ziarno = (ziarno + 0x6D2B79F5) | 0;
      let t = Math.imul(ziarno ^ (ziarno >>> 15), 1 | ziarno);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function rozegraj(bialy, czarny, limit = 200) {
    const losuj = generatorLosowy(2026);
    let st = stanPoczatkowy();
    const historia = { [kluczPozycji(st)]: 1 };
    const pozycje = [];
    for (let n = 0; n < limit; n++) {
      if (!czyJestJakisRuch(st, st.naRuchu)) return czySzach(st, st.naRuchu) ? (st.naRuchu === 'w' ? '0-1' : '1-0') : 'remis';
      if (brakMaterialu(st)) return 'remis';
      const r = silnik().najlepszyRuch(st, st.naRuchu === 'w' ? bialy : czarny, { losuj, historia: pozycje });
      if (!czyLegalny(st, r)) throw new Error(`nielegalny ruch bota: ${zapisRuchu(r)}`);
      const ruch = legalneRuchy(st, r.z.w, r.z.k).find(m => m.na.w === r.na.w && m.na.k === r.na.k);
      pozycje.push(st);
      st = wykonaj(st, ruch, r.promocja || 'q');
      const k = kluczPozycji(st);
      historia[k] = (historia[k] || 0) + 1;
      if (historia[k] >= 3 || st.polruchyBezBicia >= 100) return 'remis';
    }
    return 'limit';
  }

  test('Wygrywający bot nie wraca do pozycji, która już była', () => {
    // Białe mają hetmana więcej. Sprawdzamy, jaki ruch bot wybiera normalnie, potem odtwarzamy
    // historię: ten ruch był już zagrany, czarny król odszedł, hetman wrócił, król wrócił.
    // Powtórzenie ruchu oznaczałoby ryzyko remisu, więc wygrywający bot musi zagrać coś innego.
    const st = zFEN('8/8/3k4/8/8/2K5/8/7Q w - - 10');
    const pierwszy = silnik().najlepszyRuch(st, { id: 99, czas: 300 });
    const ruch = legalneRuchy(st, pierwszy.z.w, pierwszy.z.k).find(m => m.na.w === pierwszy.na.w && m.na.k === pierwszy.na.k);
    const poRuchu = wykonaj(st, ruch);
    const krol = znajdzKrola(poRuchu, 'b');
    let historia = null;
    for (const odejscie of legalneRuchy(poRuchu, krol.w, krol.k)) {
      const a = wykonaj(poRuchu, odejscie);
      const powrot = legalneRuchy(a, ruch.na.w, ruch.na.k).find(m => m.na.w === ruch.z.w && m.na.k === ruch.z.k);
      if (!powrot) continue;
      const b = wykonaj(a, powrot);
      const krolWraca = legalneRuchy(b, odejscie.na.w, odejscie.na.k).find(m => m.na.w === krol.w && m.na.k === krol.k);
      if (krolWraca && kluczPozycji(wykonaj(b, krolWraca)) === kluczPozycji(st)) { historia = [st, poRuchu, a, b]; break; }
    }
    oczekuj(!!historia).toBeTruthy();
    const drugi = silnik().najlepszyRuch(st, { id: 99, czas: 300 }, { historia });
    oczekuj(zapisRuchu(drugi) === zapisRuchu(pierwszy)).toBeFalsy();
    oczekuj(drugi.ocena).toBeGreaterThan(500);
  });

  test('Arcymistrz pokonuje początkującego (białymi)', () => {
    oczekuj(rozegraj(szybki(POZIOMY_BOTA[9], 100), POZIOMY_BOTA[0])).toBe('1-0');
  });

  test('Arcymistrz pokonuje początkującego (czarnymi)', () => {
    oczekuj(rozegraj(POZIOMY_BOTA[0], szybki(POZIOMY_BOTA[9], 100))).toBe('0-1');
  });

  test('Zaawansowany pokonuje nowicjusza', () => {
    oczekuj(rozegraj(POZIOMY_BOTA[4], POZIOMY_BOTA[1])).toBe('1-0');
  });
});
