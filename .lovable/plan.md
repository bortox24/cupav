
# Modifica sezione "Tariffa & totale" in Anagrafica Turno Famiglie

Nella card di modifica di ogni iscrizione famiglia sostituiamo il calcolo "categoria + tariffa unica" con un **esploso per singolo partecipante**, dove ogni persona ha il proprio prezzo al giorno personalizzabile.

## Cosa cambia nell'UI (Drawer di modifica)

1. **Nascondere** il campo "Categoria tariffaria" (Select) e l'attuale blocco "Anteprima totale" basato sulla categoria.
2. Nuova sezione **"Tariffa & totale (per persona)"** che si aggiorna in base ai numeri di partecipanti e alle date già presenti nel form. Elenca una riga per **ogni persona** presente:
   - Adulto 1, Adulto 2, …
   - 1° figlio >10, 2° figlio >10, 3° figlio >10, …
   - Bambino 4–10 #1, #2, …
   - Bambino 0–3 #1, #2, … (default 0 €)
3. Ogni riga mostra:
   - Etichetta partecipante
   - Input **Prezzo/giorno (€)**
   - Numero **giorni totali** (calcolato da data_inizio/data_fine, uguale per tutti, in sola lettura)
   - **Totale persona** = prezzo × giorni (in sola lettura)
4. Sotto l'elenco: **Totale generale** = somma dei totali persona.
5. Nella vista **read-only** della card, mostrare lo stesso esploso (etichetta → prezzo/gg × giorni = subtotale) e il totale finale, al posto dell'attuale "Categoria X — descrizione".

Preset iniziale dei prezzi quando l'iscrizione non ha ancora prezzi personalizzati: si prendono dalle tariffe globali attuali (adulto, figlio_1_over10, figlio_2_over10, figlio_3_over10 e successivi = figlio_3_over10, 4–10, 0–3) così l'utente parte da valori sensati e li può modificare uno per uno.

## Dati & backend

Nuova colonna su `iscrizioni_famiglie`:
- `prezzi_partecipanti jsonb` — array ordinato di oggetti `{ tipo: 'adulto'|'figlio_over10'|'eta_4_10'|'eta_0_3', indice: number, prezzo_giorno: number }`.

Il campo `categoria_tariffa` resta in tabella (per storico) ma non viene più mostrato né usato dal nuovo calcolo. `importo_totale_calcolato` continua ad essere valorizzato al salvataggio con la nuova somma, così Gestione Pagamenti e il resto dell'app continuano a funzionare senza modifiche.

Al salvataggio:
- Ricalcolo totale = Σ (prezzo_giorno × giorni) su tutte le righe.
- Aggiorno `importo_totale_calcolato` + `prezzi_partecipanti`.
- Propago `importo_dovuto` su `pagamenti_famiglie` come già avviene oggi.

Se il numero di partecipanti cambia (es. si aggiunge un adulto), le righe extra ricevono il prezzo di default preso dalle tariffe globali; le righe rimosse vengono eliminate.

## File toccati

- Migration: `ALTER TABLE public.iscrizioni_famiglie ADD COLUMN prezzi_partecipanti jsonb`.
- `src/hooks/useFamiglie.ts` — aggiungere il campo al tipo `IscrizioneFamiglia`.
- `src/lib/tariffeFamiglie.ts` — nuove utility: `buildRigheEsploso(form, tariffeDefault, prezziSalvati)` e `calcolaTotaleEsploso(righe, giorni)`.
- `src/pages/AnagraficaTurnoFamiglie.tsx` — sostituire Select categoria + anteprima con il nuovo elenco editabile; aggiornare la vista read-only e la logica di `handleSave`.

## Fuori scopo

- Non tocco il modulo pubblico di iscrizione famiglie né la card "Tariffe Turno Famiglie" in Impostazioni: restano come default globali.
- Non modifico Gestione Pagamenti: continua a leggere `importo_totale_calcolato`/`importo_dovuto`.
