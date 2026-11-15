// Testy zasad gry: ruchy bierek, szach, roszada, bicie w przelocie, promocja, mat i pat.

grupa('Ruchy bierek', () => {
  test('Pionek z pozycji startowej idzie o 1 lub 2 pola', () => {
    oczekuj(ruchyZ(stanPoczatkowy(), 'e2')).toEqual(['e3', 'e4']);
  });

  test('Pionek po pierwszym ruchu idzie tylko o 1 pole', () => {
    const st = zagrajRuchy(stanPoczatkowy(), 'd2d3 a7a6');
    oczekuj(ruchyZ(st, 'd3')).toEqual(['d4']);
  });

  test('Pionek bije po skosie, a do przodu nie może bić', () => {
    const st = zFEN('4k3/8/8/3pp3/4P3/8/8/4K3 w - -');
    oczekuj(ruchyZ(st, 'e4')).toEqual(['d5']);
  });

  test('Bicie w przelocie jest możliwe zaraz po podwójnym ruchu przeciwnika', () => {
    const st = zagrajRuchy(stanPoczatkowy(), 'e2e4 a7a6 e4e5 d7d5');
    oczekuj(ruchyZ(st, 'e5')).toEqual(['d6', 'e6']);
    const po = zagrajRuchy(st, 'e5d6');
    oczekuj(po.plansza[3][3]).toBe(null);   // zbity pionek z d5 znika
  });

  test('Bicie w przelocie przepada po innym ruchu', () => {
    const st = zagrajRuchy(stanPoczatkowy(), 'e2e4 a7a6 e4e5 d7d5 h2h3 h7h6');
    oczekuj(ruchyZ(st, 'e5')).toEqual(['e6']);
  });

  test('Promocja zamienia pionka w wybraną bierkę', () => {
    const st = zagrajRuchy(zFEN('8/4P3/8/8/8/8/k7/4K3 w - -'), 'e7e8n');
    oczekuj(st.plansza[0][4]).toEqual({ typ: 'n', kolor: 'w' });
  });

  test('Wieża na pustej planszy ma 14 ruchów', () => {
    oczekuj(ruchyZ(zFEN('k7/8/8/8/3R4/8/8/7K w - -'), 'd4').length).toBe(14);
  });

  test('Goniec na pustej planszy ma 13 ruchów', () => {
    oczekuj(ruchyZ(zFEN('k7/8/8/8/3B4/8/8/7K w - -'), 'd4').length).toBe(13);
  });

  test('Hetman na pustej planszy ma 27 ruchów', () => {
    oczekuj(ruchyZ(zFEN('k7/8/8/8/3Q4/8/8/7K w - -'), 'd4').length).toBe(27);
  });

  test('Skoczek w centrum ma 8 ruchów, w rogu 2', () => {
    oczekuj(ruchyZ(zFEN('k7/8/8/8/3N4/8/8/7K w - -'), 'd4').length).toBe(8);
    oczekuj(ruchyZ(zFEN('k7/8/8/8/8/8/8/N6K w - -'), 'a1')).toEqual(['b3', 'c2']);
  });

  test('Skoczek przeskakuje inne bierki', () => {
    oczekuj(ruchyZ(stanPoczatkowy(), 'g1')).toEqual(['f3', 'h3']);
  });

  test('Król w centrum ma 8 ruchów', () => {
    oczekuj(ruchyZ(zFEN('k7/8/8/8/4K3/8/8/8 w - -'), 'e4').length).toBe(8);
  });

  test('Bierki nie przechodzą przez inne i nie biją swoich', () => {
    oczekuj(ruchyZ(stanPoczatkowy(), 'a1')).toEqual([]);
    oczekuj(ruchyZ(stanPoczatkowy(), 'd1')).toEqual([]);
  });

  test('W pozycji startowej jest 20 ruchów', () => {
    oczekuj(wszystkieRuchy(stanPoczatkowy()).length).toBe(20);
  });
});

grupa('Szach i związanie', () => {
  test('Król nie może wejść na atakowane pole', () => {
    oczekuj(ruchyZ(zFEN('k7/8/8/8/8/8/r7/4K3 w - -'), 'e1')).toEqual(['d1', 'f1']);
  });

  test('Związana bierka nie może odsłonić króla', () => {
    oczekuj(ruchyZ(zFEN('k3r3/8/8/8/8/8/4N3/4K3 w - -'), 'e2')).toEqual([]);
  });

  test('Król nie ucieka wzdłuż linii szachu', () => {
    const st = zFEN('4k3/8/8/8/8/8/8/R3K2r w - -');
    oczekuj(czySzach(st, 'w')).toBeTruthy();
    oczekuj(wszystkieRuchy(st).map(r => NAZWA_POLA(r.na)).sort()).toEqual(['d2', 'e2', 'f2']);
  });

  test('Szach można zasłonić albo zbić atakującą bierkę', () => {
    const st = zFEN('4k3/8/8/8/8/8/3B4/r3K3 w - -');
    const cele = wszystkieRuchy(st).map(r => NAZWA_POLA(r.z) + NAZWA_POLA(r.na)).sort();
    oczekuj(cele).toContain('d2c1');   // zasłonięcie gońcem
    oczekuj(cele).toContain('e1e2');   // ucieczka królem
    oczekuj(cele.includes('d2e3')).toBeFalsy();
  });

  test('Żaden legalny ruch nie zostawia króla w szachu', () => {
    const st = zFEN('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq -');
    for (const r of wszystkieRuchy(st)) oczekuj(czySzach(wykonaj(st, r), 'w')).toBeFalsy();
  });
});

grupa('Roszada', () => {
  test('Krótka i długa roszada są możliwe przy wolnej drodze', () => {
    oczekuj(ruchyZ(zFEN('r3k2r/8/8/8/8/8/8/R3K2R w KQkq -'), 'e1')).toContain('g1');
    oczekuj(ruchyZ(zFEN('r3k2r/8/8/8/8/8/8/R3K2R w KQkq -'), 'e1')).toContain('c1');
  });

  test('Roszada przestawia też wieżę', () => {
    const st = zagrajRuchy(zFEN('r3k2r/8/8/8/8/8/8/R3K2R w KQkq -'), 'e1g1');
    oczekuj(st.plansza[7][5]).toEqual({ typ: 'r', kolor: 'w' });
    oczekuj(st.plansza[7][7]).toBe(null);
  });

  test('Nie można roszować przez atakowane pole', () => {
    const cele = ruchyZ(zFEN('r3k2r/8/8/8/8/8/5r2/R3K2R w KQ -'), 'e1');
    oczekuj(cele.includes('g1')).toBeFalsy();
    oczekuj(cele).toContain('c1');
  });

  test('Nie można roszować będąc w szachu', () => {
    const cele = ruchyZ(zFEN('r3k2r/8/8/8/8/8/4r3/R3K2R w KQ -'), 'e1');
    oczekuj(cele.includes('g1') || cele.includes('c1')).toBeFalsy();
  });

  test('Po ruchu króla prawo do roszady przepada', () => {
    const st = zagrajRuchy(zFEN('r3k2r/8/8/8/8/8/8/R3K2R w KQkq -'), 'e1f1 a8b8 f1e1 b8a8');
    oczekuj(st.roszady.w).toEqual({ krotka: false, dluga: false });
    oczekuj(ruchyZ(st, 'e1').includes('g1')).toBeFalsy();
  });
});

grupa('Koniec gry', () => {
  test('Mat głupca: czarne dają mata w 2 ruchach', () => {
    const st = zagrajRuchy(stanPoczatkowy(), 'f2f3 e7e5 g2g4 d8h4');
    oczekuj(czySzach(st, 'w')).toBeTruthy();
    oczekuj(czyJestJakisRuch(st, 'w')).toBeFalsy();
  });

  test('Szach, przed którym można się obronić, to nie mat', () => {
    const st = zagrajRuchy(stanPoczatkowy(), 'e2e4 d7d5 f1b5');
    oczekuj(czySzach(st, 'b')).toBeTruthy();
    oczekuj(czyJestJakisRuch(st, 'b')).toBeTruthy();
  });

  test('Pat: brak ruchów bez szachu', () => {
    const st = zFEN('k7/8/1Q6/8/8/8/8/7K b - -');
    oczekuj(czySzach(st, 'b')).toBeFalsy();
    oczekuj(czyJestJakisRuch(st, 'b')).toBeFalsy();
  });

  test('Perft z pozycji startowej (3 półruchy = 8902 pozycje)', () => {
    oczekuj(perftZasad(stanPoczatkowy(), 3)).toBe(8902);
  });

  test('Perft „Kiwipete” – roszady, przelot, promocje (2 półruchy = 2039)', () => {
    oczekuj(perftZasad(zFEN('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq -'), 2)).toBe(2039);
  });
});
