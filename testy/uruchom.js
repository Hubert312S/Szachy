// Uruchamianie testów w Node:  node testy/uruchom.js
// (testy strony, które wymagają przeglądarki, są pomijane – otwórz testy/index.html)

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const katalog = path.join(__dirname, '..');
const pliki = [
  'js/zasady.js', 'js/silnik.js', 'testy/framework.js',
  'testy/zasady.test.js', 'testy/remisy.test.js', 'testy/silnik.test.js', 'testy/interfejs.test.js'
];

const kontekst = vm.createContext({ console, Math, Date, JSON, setTimeout, Promise });
for (const plik of pliki) {
  vm.runInContext(fs.readFileSync(path.join(katalog, plik), 'utf8'), kontekst, { filename: plik });
}

const ZIELONY = '\x1b[32m', CZERWONY = '\x1b[31m', SZARY = '\x1b[90m', RESET = '\x1b[0m';
let grupa = null;

vm.runInContext('uruchomTesty', kontekst)(t => {
  if (t.grupa !== grupa) { grupa = t.grupa; console.log(`\n${grupa}`); }
  if (t.stan === 'ok') console.log(`  ${ZIELONY}✓${RESET} ${t.nazwa} ${SZARY}(${t.czas} ms)${RESET}`);
  else if (t.stan === 'pominiety') console.log(`  ${SZARY}- ${t.nazwa} (tylko w przeglądarce)${RESET}`);
  else console.log(`  ${CZERWONY}✗ ${t.nazwa}\n      ${t.blad}${RESET}`);
}, 'node').then(w => {
  console.log(`\nZaliczone: ${w.ok}, nieudane: ${w.bledy}, pominięte: ${w.pominiete}`);
  process.exit(w.bledy ? 1 : 0);
});
