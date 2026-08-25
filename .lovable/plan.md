# Acconto e stato pagamento nelle card Famiglie

## Il problema

Nella pagina /anagrafica-turno-famiglie il footer di ogni card mostra "Tot. / Acc. / Res.".
L'importo "Acc." viene letto da una tabella pagamenti separata (`pagamenti_famiglie.importo_pagato`), che è a zero per **tutte** le famiglie. L'acconto reale che si vede aprendo la scheda è invece il campo "Acconto versato" del modulo di iscrizione.

Verifica sui dati: Gaianigo Alberto ha acconto versato 770 e totale 770, ma l'importo pagato registrato è 0 — perciò la card mostra Acc. 0 e Res. 770. Lo stesso vale per tutte le altre famiglie.

## Cosa cambio

- L'acconto mostrato nella card diventa quello effettivo: si usa l'importo pagato registrato se maggiore di zero, altrimenti l'acconto versato dichiarato nell'iscrizione (si prende il maggiore dei due, così eventuali pagamenti successivi registrati non vengono persi).
- Il restante diventa "totale − acconto", mai negativo.
- Il colore della riga segue il calcolo corretto:
  - verde quando il restante è zero (tutto pagato),
  - ambra quando c'è un acconto parziale,
  - rosso quando non è stato versato nulla.
- Lo stato memorizzato nel database (spesso "pagato" anche con 0 versato) non viene più usato per decidere il colore: conta solo il confronto tra totale e versato.
- Stessa correzione nell'export CSV, così le colonne Acconto/Pagato/Residuo sono coerenti con quello che si vede a schermo.

Nessuna modifica ai dati esistenti e nessuna modifica al calcolo del totale (che resta a notti, come già impostato).

## Dettagli tecnici

- File: `src/pages/AnagraficaTurnoFamiglie.tsx`
  - In `FamigliaCard`: `pagato = Math.max(Number(item.acconto_versato) || 0, pagamento?.importo_pagato ?? 0)`; `residuo = Math.max(0, dovuto - pagato)`; `stato` derivato da `pagato`/`residuo` (già così, ma ora con il valore giusto).
  - In `exportCSV`: stessa formula per le colonne Pagato/Residuo.
