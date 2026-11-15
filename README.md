# Szachy

Szachy w przeglądarce z własnymi grafikami bierek narysowanymi w SVG, z botem na 12 poziomach trudności.

## Uruchomienie

Otwórz `index.html` w przeglądarce. Nie trzeba niczego instalować.

## Co już działa

- Szachownica 8×8 ze współrzędnymi (a–h, 1–8)
- Własne grafiki wszystkich bierek (`js/bierki.js`)
- Pełne zasady ruchów: pionek (ruch o 1 i 2 pola, bicie, bicie w przelocie, promocja z wyborem bierki), wieża, skoczek, goniec, hetman, król (z roszadą)
- Po kliknięciu bierki widać wszystkie jej możliwe ruchy
- Nie da się wykonać ruchu, po którym własny król byłby w szachu
- Wykrywanie szachu i mata – po macie okienko ogłasza, czy wygrały białe, czy czarne
- Remisy: pat, trzykrotne powtórzenie pozycji, zasada 50 ruchów, brak materiału do mata oraz remis za zgodą (przycisk „Zaproponuj remis”)
- Gra z botem: wybór koloru (białe, czarne, losowo) i poziomu w panelu po lewej
- Gra dla dwóch graczy przy jednym komputerze
- Przegląd partii po jej zakończeniu: na początek, ruch wstecz, ruch naprzód, na koniec (także strzałkami ←/→ oraz Home/End)
- Podświetlenie ostatniego ruchu, obracanie planszy, ustawianie od nowa

## Poziomy bota

| Poziom | Elo | Tytuł |
|---|---|---|
| Początkujący | 400 | |
| Nowicjusz | 700 | |
| Amator | 1000 | |
| Klubowicz | 1300 | |
| Zaawansowany | 1600 | |
| Ekspert | 1900 | |
| Kandydat na mistrza | 2200 | CM |
| Mistrz FIDE | 2300 | FM |
| Mistrz międzynarodowy | 2400 | IM |
| Arcymistrz | 2500 | GM |
| Super-arcymistrz | 2700 | GM |
| Mistrz świata (poziom Magnusa Carlsena) | 2823 | GM |

Progi tytułów według FIDE: CM od 2200, FM od 2300, IM od 2400, GM od 2500 Elo. Elo bota jest orientacyjne.

Bot (`js/silnik.js`) przeszukuje ruchy algorytmem alfa-beta (pogłębianie iteracyjne, przeszukiwanie bić, tablica transpozycji, ruch zerowy, redukcja późnych ruchów), ma książkę ponad 30 popularnych debiutów i liczy w osobnym wątku (Web Worker), więc strona nie zamarza. Słabsze poziomy liczą płycej i celowo popełniają błędy.

## Testy

- W przeglądarce: otwórz `testy/index.html` – uruchamia wszystkie testy, także klikanie po planszy i grę z botem.
- W Node: `node testy/uruchom.js` – testy logiki (bez testów strony).

Testują m.in. przegląd partii, ruchy każdej bierki, szach i związanie, roszadę, przelot, promocję, mat, pat, wszystkie remisy, generator ruchów bota (perft na 5 pozycjach wzorcowych), taktykę bota (maty, widełki), legalność ruchów na każdym poziomie, książkę debiutów i partie bot kontra bot.

## Plany

- Różne tryby gry

## Struktura

```
index.html
css/styl.css
js/bierki.js    – grafiki bierek (SVG)
js/zasady.js    – zasady gry (ruchy, szach, mat, remisy)
js/silnik.js    – silnik bota i poziomy
js/szachy.js    – strona gry, panel, gra z botem
testy/          – testy (index.html w przeglądarce, uruchom.js w Node)
```
