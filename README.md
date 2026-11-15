# Szachy

Szachy w przeglądarce z własnymi grafikami bierek narysowanymi w SVG.

## Uruchomienie

Otwórz `index.html` w przeglądarce. Nie trzeba niczego instalować.

## Co już działa

- Szachownica 8×8 ze współrzędnymi (a–h, 1–8)
- Własne grafiki wszystkich bierek (`js/bierki.js`)
- Pełne zasady ruchów: pionek (ruch o 1 i 2 pola, bicie, bicie w przelocie, promocja z wyborem bierki), wieża, skoczek, goniec, hetman, król (z roszadą)
- Po kliknięciu bierki widać wszystkie jej możliwe ruchy
- Nie da się wykonać ruchu, po którym własny król byłby w szachu
- Wykrywanie szachu, mata i pata
- Podświetlenie ostatniego ruchu
- Obracanie planszy i ustawianie od nowa

Generator ruchów sprawdzony testem perft (pozycja startowa do 4 półruchów, Kiwipete, pozycja 3).

## Plany

- Różne tryby gry

## Struktura

```
index.html
css/styl.css
js/bierki.js   – grafiki bierek (SVG)
js/szachy.js   – plansza i logika
```
