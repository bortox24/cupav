# Festa Campeggio: info giornata + allergie

## 1. Box informazioni nel modulo pubblico

Nuova sezione in cima a `/festa-campeggio` (prima di "Anagrafica"), grafica coerente col modulo (card fucsia/viola, mobile first):

- Titolo grande: **FESTA DEL CAMPEGGIO** — Domenica 20 settembre
- Evidenza: prenotazione obbligatoria entro **martedì 15 settembre**
- Programma:
  - ore 10.00 Santa Messa
  - ore 12.30 Pranzo conviviale
  - ore 14.30 Intrattenimento
- Avviso: in caso di maltempo l'evento sarà annullato
- Menù:
  - Primo: trofie fredde con pesto, pancetta, pomodorini e noci
  - Secondo: arrosto di maiale, fagioli all'uccelletto con erbe di campo spadellate
  - Acqua, vino, bibite, caffè
  - In evidenza: **per i dolci pensateci voi !**

## 2. Allergie / intolleranze

Nuova sezione subito dopo "Partecipanti" (prima del riepilogo):

- Domanda "Allergie o intolleranze?" con Sì / No
- Se Sì: elenco di righe, ognuna con campo testo (es. celiaco, lattosio) + stepper +/- per il numero di persone
- Il numero massimo per riga e per somma totale è il totale dei partecipanti indicati sopra (adulti + ragazzi + staff); se i partecipanti diminuiscono i valori vengono ridotti automaticamente
- Pulsante "Aggiungi allergia" per righe multiple, con possibilità di rimuovere una riga
- Validazione: se "Sì", almeno una riga con testo compilato e numero ≥ 1
- Il riepilogo finale mostra l'elenco allergie con i relativi numeri

## 3. Gestionale `/festa-campeggio-iscrizioni`

- Nelle card/righe: badge con le allergie dichiarate (es. "Celiaco ×2"); niente badge se nessuna
- Nel dialog di modifica: stessa gestione righe allergia (testo + numero), con lo stesso limite sui partecipanti
- KPI aggiuntivo: totale persone con allergie/intolleranze
- PDF: colonna/riga con le allergie per ogni adesione e riepilogo allergie sotto i KPI

## Dettagli tecnici

- Migrazione additiva su `public.festa_campeggio`: colonna `allergie` JSONB nullable (`[{ nome, quantita }]`) + colonna booleana `ha_allergie` con default `false`. Nessuna modifica alle colonne esistenti; rigenerazione dei tipi.
- `src/pages/public/FestaCampeggio.tsx`: nuova card informativa, sezione allergie con stato locale e clamp sul totale partecipanti, invio del payload allergie.
- `src/pages/FestaCampeggioIscrizioni.tsx`: visualizzazione badge, editor allergie nel dialog, nuovo KPI.
- `src/lib/exportFestaCampeggioPdf.ts`: allergie in tabella + riepilogo aggregato.
- `src/hooks/useFestaCampeggio.ts`: tipi aggiornati con `ha_allergie` e `allergie`.