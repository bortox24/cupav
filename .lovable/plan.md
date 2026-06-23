## Obiettivo

Aggiungere una funzione "Giornata genitori" composta da:
1. Un **modulo pubblico** compilabile dai genitori tramite link.
2. Una **tab "Giornata genitori"** dentro i turni `/turno/4-elementare` e `/turno/5-elementare` (solo questi due) per copiare il link e consultare le risposte come card, con permessi differenziati per ruolo.

## 1. Database (nuova tabella `giornata_genitori`)

Campi principali:
- `genitore_nome`, `genitore_cognome`, `genitore_email`
- `figlio_nome`, `figlio_cognome`
- `turno` (testo: `4° Elementare` o `5° Elementare`)
- `partecipa` (booleano — risposta a "Verrò sabato?")
- `num_adulti` (intero, default 0)
- `num_minori` (intero, default 0)
- `contributo` (intero in euro — calcolato: adulti×10 + minori×5)
- `created_at`, `updated_at`

Sicurezza (coerente con gli altri moduli pubblici):
- `GRANT` corretti; policy di **solo inserimento per anon** (il modulo pubblico salva direttamente), e **lettura per utenti autenticati**. Nessuna lettura anon (così email/contributi non sono esposti pubblicamente).
- Trigger `updated_at`.

## 2. Modulo pubblico `/giornata-genitori`

Nuova pagina `src/pages/public/GiornataGenitori.tsx` + rotta pubblica in `App.tsx`, stesso layout degli altri moduli (logo in alto da `useCustomLogo`, card centrata, step con progress).

**Step 1 — Dati**
- Nome genitore + Cognome genitore (campi separati)
- Nome figlio + Cognome figlio in campeggio (campi separati)
- **Turno** (radio: 4^ Elementare / 5^ Elementare) — serve per smistare le card
- **Email del genitore** (una sola, con nota "una sola email per le comunicazioni della giornata")
- Selettore "Verrò sabato alla giornata genitori?" → Sì / No
  - Se **No** → compare subito il pulsante **Invia** (num_adulti=0, num_minori=0, contributo=0)
  - Se **Sì** → si passa allo Step 2
- Auto-capitalizzazione nomi/cognomi (come negli altri moduli).

**Step 2 — Partecipanti (solo se "Sì")**
- Stepper +/- per **Adulti (>18)** — contributo 10€ cad.
- Stepper +/- per **Minori di 18** — contributo 5€ cad.
- Nota: "Contributo da consegnare in contanti il giorno della giornata genitori (sabato)."

**Step finale — Riepilogo + Invia**
- Mostra: nome+cognome genitore, nome+cognome figlio, turno, quantità adulti, quantità minori, contributo totale.
- Invio → salva su `giornata_genitori` → schermata "Grazie, abbiamo ricevuto l'invio".

## 3. Tab "Giornata genitori" in TurnoPage

In `src/pages/TurnoPage.tsx`:
- Aggiungere `'giornata-genitori'` al tipo `TabType` e una tab pill **visibile solo se** `turnoSlug` è `4-elementare` o `5-elementare`.
- Caricare da `giornata_genitori` le risposte filtrate per `turno` del turno corrente.

**Contenuto della tab:**
- In alto: campo con il **link del modulo** (`.../giornata-genitori`) + pulsante **Copia link**.
- **KPI in alto** (riquadri): totale adulti, totale minori, totale persone, e — solo per ruoli abilitati — totale soldi raccolti.
- **Card genitori** (stesso stile di Dettagli ragazzi / Staff):
  - In alto: **Cognome e Nome del figlio**
  - Sotto: nome+cognome del genitore
  - Sotto: **email** (al posto del telefono che c'è nelle card ragazzi)
  - Due counter: numero adulti e numero minori (mostrati in base a cosa è presente)
- Click sulla card → drawer di dettaglio con tutte le info compilate e, in fondo, il **contributo** da versare.

**Permessi (ruoli account staff):**
- `animatore`: vede KPI (adulti, minori, persone totali) **senza** importo soldi; vede le card **ma non può aprirle** (niente drawer, niente costo).
- `cuoco`, `responsabile_campo`, `responsabile_animatori` e admin: vedono **tutte** le KPI (incluso totale soldi), possono aprire le card e vedere il contributo.
- Si riusa il pattern già presente (`isStaffAccount`, `staffRuolo`, `isAdmin`).

## Note tecniche

- Calcolo contributo centralizzato: `adulti*10 + minori*5`.
- Ordinamento card per `Cognome Nome` del figlio (coerente con la convenzione del progetto).
- Submit pubblico via insert diretto con chiave anon (stesso approccio di `IscrizioneFamiglie`), grazie alla policy anon-insert.

```text
Flusso modulo:
[Dati genitore/figlio/turno/email/partecipa?]
        | No -> [Invia]
        | Si -> [Adulti +/-  Minori +/-] -> [Riepilogo] -> [Invia]
-> "Grazie, ricevuto"
-> Card nel turno corrispondente (4^ o 5^ Elementare)
```