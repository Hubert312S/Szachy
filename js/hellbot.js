// Hell bot – Stockfish 16.1 liczący w osobnym wątku (Web Worker).
// Kod Stockfisha (js/stockfish.js, ok. 10 MB) wczytujemy dopiero przy pierwszej grze z Hell botem.
// Rozmowa z silnikiem odbywa się protokołem UCI: wysyłamy pozycję i czas, dostajemy „bestmove e2e4”.

const HellBot = (() => {
  // ścieżka do stockfish.js obok tego pliku – działa i w grze, i na stronie testów
  const sciezka = (document.currentScript?.src || 'js/hellbot.js').replace(/hellbot\.js(\?.*)?$/, 'stockfish.js');
  let wczytywanie = null;
  let watek = null;
  let gotowy = null;
  let oczekujacy = null;       // funkcja czekająca na „bestmove”
  let doPominiecia = 0;        // odpowiedzi na przerwane zapytania, które trzeba zignorować

  function wczytajKod() {
    return wczytywanie ||= new Promise((ok, blad) => {
      if (typeof kodStockfisha === 'function') return ok();
      const s = document.createElement('script');
      s.src = sciezka;
      s.onload = ok;
      s.onerror = () => blad(new Error('Nie udało się wczytać js/stockfish.js'));
      document.head.appendChild(s);
    });
  }

  async function uruchom() {
    await wczytajKod();
    if (gotowy) return gotowy;
    watek = new Worker(URL.createObjectURL(new Blob(['(' + kodStockfisha.toString() + ')()'], { type: 'text/javascript' })));
    gotowy = new Promise(ok => {
      watek.addEventListener('message', function czekaj(e) {
        if (e.data === 'readyok') { watek.removeEventListener('message', czekaj); ok(); }
      });
    });
    watek.addEventListener('message', e => {
      const linia = String(e.data);
      if (!linia.startsWith('bestmove')) return;
      if (doPominiecia > 0) { doPominiecia--; return; }
      const odbiorca = oczekujacy;
      oczekujacy = null;
      odbiorca?.(linia.split(' ')[1]);
    });
    watek.postMessage('uci');
    watek.postMessage('setoption name Hash value 32');
    watek.postMessage('isready');
    return gotowy;
  }

  // ruchyUci: ruchy partii od pozycji startowej, np. ['e2e4', 'e7e5']; zwraca np. 'g1f3' albo 'e7e8q'
  async function ruch(ruchyUci, czasMs) {
    await uruchom();
    return new Promise(ok => {
      oczekujacy = ok;
      watek.postMessage('position startpos' + (ruchyUci.length ? ' moves ' + ruchyUci.join(' ') : ''));
      watek.postMessage('go movetime ' + czasMs);
    });
  }

  // Przerywa liczenie (np. przy nowej grze); spóźnioną odpowiedź zignorujemy.
  function przerwij() {
    if (!watek || !oczekujacy) return;
    oczekujacy = null;
    doPominiecia++;
    watek.postMessage('stop');
  }

  const czyWczytany = () => !!gotowy;

  return { ruch, uruchom, przerwij, czyWczytany };
})();
