# Kalkulacije cen · Komba Cabana

Pri vsakem bungalovu so najprej fiksne cene WEB, pod njimi variabilne. Vrstni red je Bungalow I - Family, Bungalov II, Bungalov III, Beach Villa IV.

Fiksne cene WEB so iz spletne strani. Pri bungalovih I, II in III je ista cena tudi na Bookingu, Airbnbju in Agodi. Polni penzion ni vključen. Leto 2027 je v isti tabeli, desno od trenutnih cen. Pri vsakem bungalovu vpišeš odstotek in z gumbom Dvigni dvigneš vse njegove cene 2027 od trenutnega WEB, zaokroženo na evro. Pri Bungalow I - Family tabela WEB kaže ceno za 2 osebi in za 1 osebo, zraven pa 3. in 4. osebo, otroka v galeriji: odrasla oseba v galeriji plača polovico cene za 2 osebi (pozimi 420 € / 2 = 210 €), otrok od te cene pa 0–5 let brezplačno, 5–10 let −50 % in 10–15 let −20 %. V letu 2027 se vpisujeta samo ceni za 2 osebi in 1 osebo, Dvigni dvigne samo ti dve, otroška stolpca pa sledita ceni 2027 za 2 osebi, če je vpisana, sicer trenutnemu WEB. Beach Villa obdrži stolpce za 4, 3, 2 in 1 osebo. II in III za 2 in 1. Beach Villa je vpisana samo na spletni strani. Dokler dviga ni, ima v letu 2027 enake cene WEB kot Bungalow I - Family: če je pri I vpisana cena 2027, velja ta, sicer trenutni WEB pri I. Gumb Dvigni pri Beach Villi dvigne njene lastne trenutne cene WEB. Popust je 70 € na osebo, pri Beach Villi 90 €. Od 2 oseb navzdol je pri I in Beach Villi cena enaka.

Variabilne cene so razpon min in max iz predloga Optima Plus, izhodišče 2026 ob letu 2027. Beach Villa IV v letu 2026 ni bila v ceniku. Vpis se shrani na strežnik v data/cenik.json in v brskalniku.

Zavihek Zasedenost vzame potrjene, plačane in delno plačane rezervacije 2026. Preklicane niso vštete. Noč šteje enkrat na bungalov. Ocena 2027 prenese ta mesečni delež na web ceno za 2 osebi. Zavihek Zaslužek sešteje web cene po mesecih leta 2027. Zasedenost Lodge vpišeš v odstotkih: 100 % je polna zasedenost, lanski delež je na gumbu zraven. Januar in februar sta zaprta. Januar in februar sta zaprta zaradi obnove, odpremo marca. Pri vseh bungalovih velja cena za 2 osebi. 4 osebe so izjema in v zaslužek niso vštete. Agencija in Early booking se odštejeta od polne cene. Zraven sta minimalne cene in pravila gap filla iz pisma za 2026. Minimalna cena 2027 je 120 € na osebo, pri vseh bungalovih. Provizijo agencije in Early booking vpišeš v odstotkih pri vsakem bungalovu. Pod ceno na osebo je polna cena, minus agencija, minus Early booking, in koliko ostane. Oba odbitka sta od polne cene.

## Zagon

```bash
npm install
npm run dev
```

Aplikacija teče na [http://127.0.0.1:4471](http://127.0.0.1:4471).

```bash
npm test
npm run lint
```
