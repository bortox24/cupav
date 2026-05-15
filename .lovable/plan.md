## Obiettivo

Aggiungere un flusso completo "Montaggio Campeggio" sulla falsariga del Turno Famiglie, con tariffa calcolata sul numero di **notti** trascorse in campeggio (giorni selezionati − 1). Disponibili 4 giorni: sab 30/05, dom 31/05, lun 01/06, mar 02/06 → max 3 notti. Chi seleziona solo il sabato paga 0€ (0 notti).

## 1. Database

Nuova tabella `iscrizioni_montaggio` (sulla falsariga di `iscrizioni_famiglie`, semplificata):

- Anagrafica: `email`, `nome`, `cognome`, `residente_a`, `via`, `recapiti_telefonici` (jsonb)
- Partecipazione: `giorni_selezionati` (text[] tra `sab_30_05`, `dom_31_05`, `lun_01_06`, `mar_02_06`)
- Partecipanti (come famiglie): `num_adulti`, `num_figli_over10` (int illimitato), `num_4_10_anni`, `num_0_3_anni`
- Calcolo: `num_notti` (int), `importo_totale_calcolato` (numeric)
- Firma: `firma_nome_cognome`, `firma_data`, `tariffa_accettata` (bool)
- `archiviato` (bool), `created_at`, `turno` default `'Montaggio campeggio'`

Tariffe **fisse, non configurabili** (su richiesta utente, valori hard-coded nella logica):
- Adulto: 20€/notte
- 1° figlio >10: 15€/notte · 2°: 13€/notte · 3°+ : 10€/notte (sconto 3° figlio applicato a tutti dal 3° in su, come per le famiglie)
- 4–10 anni: 10€/notte
- 0–3 anni: gratis

`importo_totale = (somma_per_persona) × num_notti`, con `num_notti = max(0, giorni_selezionati.length − 1)`.

RLS:
- INSERT pubblico (`anon` + `authenticated`)
- SELECT/UPDATE/DELETE: `is_admin() OR has_page_access(auth.uid(), '/anagrafica-montaggio-campeggio')`

## 2. Form pubblico `/iscrizione-montaggio`

Multi-step come `IscrizioneFamiglie.tsx`, 3 tab:

**Tab 1 — Anagrafica:** email, nome, cognome, comune residenza, via e numero, recapiti telefonici (lista nome+numero, aggiungibili). Auto-capitalize "Cognome Nome".

**Tab 2 — Partecipazione:**
- 4 checkbox grandi (square, rounded-2xl) per i giorni: Sab 30/05, Dom 31/05, Lun 01/06, Mar 02/06. Mostra in tempo reale "X notti".
- Stessi campi numerici partecipanti del modulo famiglie (adulti, figli >10 senza limite, 4–10, 0–3).
- Riepilogo prezzo live per notte e totale.

**Tab 3 — Conferma:**
- Riepilogo tariffa giornaliera (per notte) e totale calcolato. Nessun regolamento, nessun acconto.
- Checkbox: "Ho letto e accetto la quota giornaliera per notte indicata sopra".
- Firma (nome cognome) + data odierna precompilata.
- Submit → insert in `iscrizioni_montaggio`, redirect a schermata di conferma (riusabile da famiglie).

## 3. Pagina interna `/turno/montaggio-campeggio` (TurnoMontaggioPage)

Clone visivo di `TurnoFamigliePage.tsx`:
- Hero arancione/ambra con icona Tent, titolo "Montaggio Campeggio".
- 3 contatori: Iscritti, Persone totali, Notti totali (oppure "Giorni-uomo").
- Card per iscritto: cognome+nome, residenza, giorni selezionati (badge), totale partecipanti, importo.
- Bottone "Apri anagrafica completa" → `/anagrafica-montaggio-campeggio`.

## 4. Pagina anagrafica `/anagrafica-montaggio-campeggio` (AnagraficaMontaggioCampeggio)

Clone funzionale di `AnagraficaTurnoFamiglie.tsx`:
- Lista filtrabile, ricerca per nome.
- Dialog di modifica con stessi campi del form pubblico (giorni, partecipanti, contatti).
- Export CSV con colonne: cognome, nome, email, telefoni, giorni, notti, partecipanti per fascia, importo.
- Archiviazione, eliminazione (admin / utenti con permesso).

Hook nuovo `useIscrizioniMontaggio` (CRUD + invalidazioni react-query) sul modello di `useFamiglie`.

## 5. Home — Sezione "Altre iscrizioni"

In `src/pages/Home.tsx`, sotto la sezione "Iscrizioni per turno", nuovo blocco con titolo **"Altre iscrizioni"** contenente una card grande "Montaggio Campeggio" che linka a `/turno/montaggio-campeggio`. Stile coerente con le altre card turno (icona, gradiente caldo, contatore live iscritti). Predisposta per future aggiunte (smontaggio, eventi).

## 6. Routing & permessi

- Nuove route in `src/App.tsx`: `/iscrizione-montaggio` (pubblica), `/turno/montaggio-campeggio` (protetta), `/anagrafica-montaggio-campeggio` (protetta).
- Aggiunta `/anagrafica-montaggio-campeggio` e `/turno/montaggio-campeggio` all'elenco pagine assegnabili in `AdminPermessi`.

## Dettagli tecnici

- Logica prezzo: nuovo file `src/lib/tariffeMontaggio.ts` con costanti hard-coded e funzione `calcolaTotaleMontaggio({ giorni, partecipanti })` che ritorna righe dettagliate (per il riepilogo) + totale.
- Salvataggio: il client invia `giorni_selezionati` + conteggi, ricalcola anche server-side al SELECT (memorizziamo `importo_totale_calcolato` snapshot al momento dell'invio per audit).
- Riusare componenti già presenti: stepper, input partecipanti numerici, gestione recapiti dal form famiglie (estrarre eventualmente in componenti condivisi se serve, altrimenti duplicare per non rompere l'esistente).
- Memory update: aggiungere `mem://features/montaggio-campeggio` con regole tariffa per notte e struttura form.

## Cosa NON viene incluso

- Nessuna integrazione webhook n8n / pagamenti / reminder (non richiesti).
- Nessun regolamento PDF, nessun acconto.
- Nessuna configurabilità tariffe da `/impostazioni` (valori fissi).
