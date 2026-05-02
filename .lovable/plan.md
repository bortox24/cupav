
# Figli >10 anni: campo numerico libero + sconto 3° figlio per tutti gli extra

## Obiettivo
Sostituire le 3 checkbox (1°/2°/3° figlio >10 anni) nel modulo pubblico con **un singolo campo numerico** "Figli oltre i 10 anni" **senza limite massimo**. Dal 3° figlio in poi (4°, 5°, ecc.) si applica sempre la tariffa "3° figlio" (massimo sconto).

## Logica tariffaria
Per N figli >10 anni:
- Se N = 0 → nessun addebito
- Se N = 1 → tariffa `figlio_1_over10`
- Se N = 2 → `figlio_1_over10` + `figlio_2_over10`
- Se N = 3 → `figlio_1_over10` + `figlio_2_over10` + `figlio_3_over10`
- Se N ≥ 4 → `figlio_1_over10` + `figlio_2_over10` + `figlio_3_over10 × (N − 2)`
  
  Cioè: 1° figlio tariffa piena, 2° tariffa 2°, **tutti i restanti (3°, 4°, 5°, …) tariffa 3°**.

## Problema con lo schema attuale
Il DB ha solo 3 boolean (`figlio_1/2/3_over10`) — non basta per rappresentare 4+ figli. Serve un nuovo campo intero che conti tutti i figli >10 anni.

## Modifiche

### 1. Database (migration)
Aggiungo colonna a `iscrizioni_famiglie`:
```sql
ALTER TABLE public.iscrizioni_famiglie
  ADD COLUMN num_figli_over10 integer NOT NULL DEFAULT 0;

-- Backfill dai 3 boolean esistenti per non perdere i dati già inseriti
UPDATE public.iscrizioni_famiglie
SET num_figli_over10 =
  (CASE WHEN figlio_1_over10 THEN 1 ELSE 0 END) +
  (CASE WHEN figlio_2_over10 THEN 1 ELSE 0 END) +
  (CASE WHEN figlio_3_over10 THEN 1 ELSE 0 END);
```
I 3 boolean restano (così non rompo nulla nelle pagine interne) ma diventano legacy: l'UI nuova usa `num_figli_over10` come fonte di verità.

### 2. Funzione di calcolo (`src/lib/tariffeFamiglie.ts`)
- Estendo `IscrizioneCalc` con `num_figli_over10`.
- Logica: se `num_figli_over10 > 0` la uso (nuova fonte di verità), altrimenti fallback ai 3 boolean (per record vecchi non backfillati / sicurezza).
- Genero le righe dinamicamente:
  - 1 riga "1° figlio >10" → 1 persona × `figlio_1_over10`
  - se N ≥ 2: 1 riga "2° figlio >10" → 1 persona × `figlio_2_over10`
  - se N ≥ 3: 1 riga "Figli >10 dal 3° in poi" → `(N − 2)` persone × `figlio_3_over10`

### 3. Modulo pubblico (`src/pages/public/IscrizioneFamiglie.tsx`)
- Stato: rimuovo `figlio1/2/3`, aggiungo `figliOver10: number` (min 0, **nessun max**).
- UI: campo number identico agli altri (👶 0–3, 🧒 4–10, **🧑 Figli >10 anni**, 🧑‍🦱 Adulti, 🐾 Animali), con sottotitolo:
  > *Numero di figli sopra i 10 anni. La tariffa è scontata progressivamente: dal 3° figlio in poi si applica lo stesso sconto massimo.*
- Validazione: usa `figliOver10` invece dei 3 boolean.
- Submit: salva `num_figli_over10: figliOver10` e per compatibilità imposta anche `figlio_1_over10: figliOver10 >= 1`, `figlio_2_over10: figliOver10 >= 2`, `figlio_3_over10: figliOver10 >= 3`.

### 4. Pagine interne (Anagrafica turno famiglie, dialog di edit)
- `src/pages/AnagraficaTurnoFamiglie.tsx`: nel dialog di modifica sostituisco le 3 checkbox con un input number "Figli oltre i 10 anni". Salvo `num_figli_over10` + i 3 boolean derivati come sopra.
- L'anteprima totale e il calcolo prezzo prendono automaticamente il nuovo valore via `tariffeFamiglie.ts`.
- CSV export: aggiungo colonna `Figli >10` (numero).

### 5. Hook tipi (`src/hooks/useFamiglie.ts`)
Aggiungo `num_figli_over10: number` al tipo `IscrizioneFamiglia`.

## Cosa NON cambia
- Tabella `tariffe_famiglie` e UI di gestione tariffe in Impostazioni: nessuna modifica (i 3 livelli di tariffa restano e bastano: il 3° si applica anche dal 4° figlio in poi).
- Pagamenti: continuano a leggere `importo_totale_calcolato` aggiornato.
