# PDF filtrati per categoria: solo la categoria scelta

Oggi i tre PDF filtrati (adulti / ragazzi / staff) mostrano le adesioni intere, con tutte le colonne e tutti i contributi. Cambiamo logica: il PDF di una categoria mostra **solo quella categoria**.

## Come sarà il PDF "Solo adulti"

- KPI in alto riferiti ai soli adulti: adulti previsti, adulti arrivati, importo previsto e incassato calcolati solo sulla quota adulti (15€ ciascuno).
- Distribuzione partecipanti: una sola riga, "Adulti — 126".
- Tabella con una riga per adesione che ha almeno un adulto, con solo i dati adulti:

```text
+----------------------------+---------+-----------+----------+-----------+
| Cognome Nome               | Adulti  | Arrivati  | Previsto | Incassato |
+----------------------------+---------+-----------+----------+-----------+
| Consolaro Anna             |    1    |    1/1    |   15€    |    15€    |
| Rizzo Marianna             |    2    |    0/2    |   30€    |     0€    |
| ...                                                                     |
+----------------------------+---------+-----------+----------+-----------+
| TOTALI                     |   126   |   98/126  |  1890€   |   1470€   |
+----------------------------+---------+-----------+----------+-----------+
```

- Stessa struttura per "Solo ragazzi" (10€ a testa) e "Solo staff" (10€ a testa).
- Le allergie restano nel PDF completo; nei PDF di categoria non compaiono, perché non sono attribuibili a una singola fascia.

## Come sarà il PDF "Tutte le adesioni"

Resta esattamente com'è oggi: KPI complessivi, distribuzione con le tre righe (adulti / ragazzi / staff), riepilogo allergie e tabella completa con adulti, ragazzi, staff, totale, allergie, previsto, incassato e stato.

## Nota sugli invitati

Gli invitati continuano a comparire con l'etichetta "(Invitato)" accanto al nome e contributo previsto 0€, anche nei PDF di categoria.

## Dettagli tecnici

- `src/lib/exportFestaCampeggioPdf.ts`: aggiungere una modalità `categoria?: 'adulti' | 'ragazzi' | 'staff'` alle options. Quando presente:
  - filtrare le adesioni con `num_<categoria> > 0`;
  - contributo previsto per riga = `invitato ? 0 : num_<categoria> * COSTO_FESTA_<CATEGORIA>`;
  - incassato per riga = quota proporzionale già incassata, limitata al previsto della categoria (`min(importo_incassato, previsto_categoria)`), così i totali restano coerenti;
  - arrivati per riga = `arrivati_<categoria>`;
  - una sola barra nella distribuzione, KPI e riga TOTALI ricalcolati sul sottoinsieme;
  - salto del blocco allergie.
- `src/pages/FestaCampeggioIscrizioni.tsx`: nella funzione `exportPdf` passare `categoria` invece del solo `label`, mantenendo filtro di ricerca e i nomi file attuali (`festa-campeggio-adulti-AAAA-MM-GG.pdf`).
