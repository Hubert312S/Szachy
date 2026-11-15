// Testy remisów: powtórzenie pozycji, zasada 50 ruchów, brak materiału.

grupa('Remisy', () => {
  test('Ta sama pozycja ma ten sam klucz (powtórzenie)', () => {
    const start = stanPoczatkowy();
    const po = zagrajRuchy(start, 'g1f3 g8f6 f3g1 f6g8');
    oczekuj(kluczPozycji(po)).toBe(kluczPozycji(start));
  });

  test('Klucz rozróżnia stronę na ruchu', () => {
    oczekuj(kluczPozycji(zFEN('4k3/8/8/8/8/8/8/4K2R w - -')) === kluczPozycji(zFEN('4k3/8/8/8/8/8/8/4K2R b - -'))).toBeFalsy();
  });

  test('Klucz rozróżnia prawa do roszady', () => {
    oczekuj(kluczPozycji(zFEN('4k3/8/8/8/8/8/8/4K2R w K -')) === kluczPozycji(zFEN('4k3/8/8/8/8/8/8/4K2R w - -'))).toBeFalsy();
  });

  test('Pole przelotu liczy się tylko, gdy bicie jest możliwe', () => {
    const bezBicia = zagrajRuchy(stanPoczatkowy(), 'e2e4');
    oczekuj(kluczPozycji(bezBicia).endsWith(' -')).toBeTruthy();
    const zBiciem = zagrajRuchy(stanPoczatkowy(), 'e2e4 a7a6 e4e5 d7d5');
    oczekuj(kluczPozycji(zBiciem).endsWith(' -')).toBeFalsy();
  });

  test('Licznik 50 ruchów rośnie przy cichych ruchach', () => {
    oczekuj(zagrajRuchy(stanPoczatkowy(), 'g1f3 g8f6 b1c3').polruchyBezBicia).toBe(3);
  });

  test('Ruch pionkiem zeruje licznik 50 ruchów', () => {
    oczekuj(zagrajRuchy(stanPoczatkowy(), 'g1f3 g8f6 e2e4').polruchyBezBicia).toBe(0);
  });

  test('Bicie zeruje licznik 50 ruchów', () => {
    oczekuj(zagrajRuchy(stanPoczatkowy(), 'e2e4 d7d5 g1f3 b8c6 e4d5').polruchyBezBicia).toBe(0);
    oczekuj(zagrajRuchy(stanPoczatkowy(), 'e2e4 d7d5 b1c3 g8f6 c3d5').polruchyBezBicia).toBe(0);
  });

  const material = [
    ['król na króla', '4k3/8/8/8/8/8/8/4K3 w - -', true],
    ['król i goniec na króla', '4k3/8/8/8/8/8/8/2B1K3 w - -', true],
    ['król i skoczek na króla', '4k3/8/8/8/8/8/8/2N1K3 w - -', true],
    ['gońce na polach tego samego koloru', '3bk3/8/8/8/8/8/8/2B1K3 w - -', true],
    ['dwa skoczki (da się dać mata przy błędzie)', '4k3/8/8/8/8/8/8/1NN1K3 w - -', false],
    ['gońce na polach różnych kolorów', '2b1k3/8/8/8/8/8/8/2B1K3 w - -', false],
    ['jest pionek', '4k3/8/8/8/8/8/4P3/4K3 w - -', false],
    ['jest wieża', '4k3/8/8/8/8/8/8/R3K3 w - -', false]
  ];
  for (const [opis, fen, remis] of material) {
    test(`Brak materiału: ${opis} → ${remis ? 'remis' : 'gra trwa'}`, () => {
      oczekuj(brakMaterialu(zFEN(fen))).toBe(remis);
    });
  }
});
