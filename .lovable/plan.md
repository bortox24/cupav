
# Calcolo automatico prezzo iscrizione famiglie + UI tariffe

## Obiettivo
Calcolare in automatico il totale dovuto da ogni famiglia in base a:
- **Categoria tariffaria** (1–4)
- **Composizione famiglia** (adulti, figli >10 ordinati, 4–10 anni, 0–3 gratis)
- **Giorni di permanenza** (`data_fine − data_inizio + 1`)

Visibile **solo in**:
1. Anagrafica Turno Famiglie (card + dialog modifica + export CSV)
2. Gestione Pagamenti (popola `importo_dovuto` automaticamente)

Le tariffe sono **modificabili da UI** in Impostazioni, da chiunque abbia il permesso pagina `/impostazioni` (non solo admin).
Il modulo pubblico **non viene toccato**.

## Tariffe di default (giornaliere a persona)

| Cat | Descrizione | Adulto | 1° figlio >10 | 2° figlio >10 | 3° figlio >10 | 4–10 anni | 0–3 anni |
|---|---|---|---|---|---|---|---|
| 1 | Altavilla + collabora CUPAV | 20 | 15 | 13 | 10 | 10 | 0 |
| 2 | Altavilla | 25 | 20 | 15 | 12 | 12 | 0 |
| 3 | Fuori Comune + collabora | 30 | 23 | 18 | 15 | 15 | 0 |
| 4 | Fuori Comune | 35 | 25 | 20 | 17 | 17 | 0 |

Formula: `totale = giorni × Σ(persone × tariffa_categoria)`

## Modifiche

### 1. Database (migrazione)

**a)** Aggiungere a `iscrizioni_famiglie`:
- `categoria_tariffa` smallint nullable (1–4)
- `importo_totale_calcolato` numeric nullable

**b)** Nuova tabella `tariffe_famiglie`:
```
categoria        smallint PK (1..4)
descrizione      text
adulto           numeric
figlio_1_over10  numeric
figlio_2_over10  numeric
figlio_3_over10  numeric
eta_4_10         numeric
eta_0_3          numeric default 0
updated_at       timestamptz
updated_by       uuid
```
Seed con i 4 valori di default sopra.

**c)** RLS `tariffe_famiglie`:
- SELECT: chiunque autenticato (serve a Anagrafica/Pagamenti per calcolare)
- UPDATE: `is_admin() OR has_page_access(auth.uid(), '/impostazioni')`
- INSERT/DELETE: solo admin (categorie fisse)

### 2. Hook + helper
- `src/hooks/useTariffeFamiglie.ts`: query + mutation per leggere/aggiornare le 4 righe.
- `src/lib/tariffeFamiglie.ts`: `calcolaGiorni()` e `calcolaTotaleFamiglia(iscrizione, tariffe)` → `{ totale, dettaglio[] }`.

### 3. UI Impostazioni (`src/pages/Impostazioni.tsx`)
Nuova card **"Tariffe Turno Famiglie"** visibile a chi ha accesso a `/impostazioni`:
- Tabella con 4 righe (una per categoria) e 6 colonne di prezzo editabili (input numerici €).
- Pulsante "Salva" per riga (o salvataggio inline al blur) con toast di conferma.
- Nota: "I prezzi vengono usati per calcolare automaticamente il totale dovuto delle iscrizioni famiglie."

### 4. Anagrafica Turno Famiglie (`src/pages/AnagraficaTurnoFamiglie.tsx`)
- **Card**: badge `Totale €XXX • Acconto €YY • Residuo €ZZ` (verde/ambra/rosso a seconda dello stato pagamento).
- **Dialog modifica**: nuovo Select "Categoria tariffaria" (1–4 con descrizione presa da DB). Riquadro con totale ricalcolato live al cambio di date/persone/categoria/tariffe, con dettaglio voce per voce.
- **Iscrizioni vecchie senza categoria**: badge "Categoria non impostata" + apertura rapida del dialog.
- **Export CSV**: aggiungere `Categoria`, `Totale dovuto`, `Residuo`.
- Al salvataggio: aggiorna `categoria_tariffa` e `importo_totale_calcolato` in `iscrizioni_famiglie`, e propaga a `pagamenti_famiglie.importo_dovuto`.
- Logga il cambio categoria/totale in `anagrafica_invio_logs` (tipo `modifica_categoria`) coerente con i log già attivi.

### 5. Gestione Pagamenti (`src/hooks/usePagamenti.ts` + `src/pages/GestionePagamenti.tsx`)
- Quando si crea un record `pagamenti_famiglie`, default `importo_dovuto = iscrizioni_famiglie.importo_totale_calcolato`.
- Mostra il totale calcolato come suggerimento; l'admin può sempre fare override manuale.

## Non incluso
- Modifica del modulo pubblico di iscrizione famiglie (esplicitamente escluso).
- Sconti per famiglia (basta override manuale di `importo_dovuto` in Gestione Pagamenti).
