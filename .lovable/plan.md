
# Nuova Pagina Iscrizione Campeggio CUPAV

## Panoramica

Creazione di una nuova pagina pubblica `/iscrizione` con form multi-step completo per l'iscrizione al campeggio, due nuove tabelle nel database, una edge function per notifiche webhook, e un link dalla Home.

---

## 1. Database - Nuove tabelle

### Tabella `iscrizioni`
Tutti i dati del form in un'unica riga: email, dati ragazzo (cognome, nome, data nascita, luogo nascita, residenza, indirizzo, recapiti), dati genitore (qualita, cognome, nome), turno, secondo figlio, allergie (flag + dettagli + patologie + 3 farmaci), liberatoria foto, firma.

RLS:
- INSERT: aperto a tutti (anon)
- SELECT/UPDATE/DELETE: solo utenti autenticati

### Tabella `webhook_config`
Un singolo record con `webhook_url` e `descrizione`. Record di default inserito con URL vuoto.

RLS: solo utenti autenticati per tutte le operazioni.

---

## 2. Edge Function `notify-iscrizione`

- Riceve il payload dell'iscrizione via POST dal frontend
- Legge `webhook_url` dalla tabella `webhook_config`
- Se URL presente, fa POST al webhook con i dati
- Se URL vuoto o errore, logga e termina senza errori
- Non blocca mai la conferma all'utente

Configurazione in `supabase/config.toml`: `verify_jwt = false` (chiamata pubblica post-iscrizione).

---

## 3. Nuova pagina `/iscrizione`

File: `src/pages/public/IscrizioneCampeggio.tsx`

Form multi-step con 4 step e progress bar dinamica:

### Step 1 - Richiesta Iscrizione
Tutti i campi specificati: email, dati ragazzo (7 campi), dati genitore (3 campi), turno (radio con date), quota (box info + campo facoltativo secondo figlio), allergie (radio si/no), 4 checkbox obbligatorie, firma (data + nome).

### Step 2 - Allergie, Farmaci e Patologie
Mostrato SOLO se "presenta allergie" selezionato nello Step 1. Banner arancione di attenzione, campi pre-compilati read-only, textarea allergie (obbligatoria), textarea patologie (facoltativa), 3 gruppi farmaci, 3 checkbox obbligatorie, firma.

### Step 3 - Liberatoria Foto e Video
Cognome e nome genitore, box informativo, radio consenso/negazione, checkbox privacy, firma.

### Step 4 - Regolamento e Invio
Box scrollabile con 10 punti del regolamento, checkbox accettazione, riepilogo completo read-only di tutti i dati, bottone "INVIA ISCRIZIONE" grande e verde.

### Post-invio
Pagina di conferma con messaggio di successo e contatto email.

### Progress bar
Calcolo dinamico: se Step 2 viene saltato, la barra mostra 3 step totali invece di 4, con etichette e numerazione adattate.

---

## 4. Routing e Link dalla Home

### App.tsx
Aggiunta route pubblica: `<Route path="/iscrizione" element={<IscrizioneCampeggio />} />`

### Home.tsx (sezione Welcome)
Aggiunta di un bottone/link "Iscriviti al Campeggio" ben visibile nel banner in cima, che punta a `/iscrizione`. Verra' aggiunto nella sezione welcome esistente, sotto il countdown, senza modificare la struttura attuale.

---

## Dettaglio tecnico

### File da creare
1. `src/pages/public/IscrizioneCampeggio.tsx` - Pagina multi-step completa
2. `supabase/functions/notify-iscrizione/index.ts` - Edge function webhook

### File da modificare (solo aggiunte minimali)
1. `src/App.tsx` - Aggiunta import + route `/iscrizione`
2. `src/pages/Home.tsx` - Aggiunta bottone "Iscriviti al Campeggio" nel banner welcome
3. `supabase/config.toml` - Aggiunta sezione `[functions.notify-iscrizione]`

### Migrazione database
- CREATE TABLE `iscrizioni` con tutte le colonne specificate + RLS policies
- CREATE TABLE `webhook_config` con colonne + RLS policies + record default

### Struttura componente IscrizioneCampeggio
- State React per tutti i campi del form
- `currentStep` per navigazione tra step
- Calcolo dinamico `totalSteps` (3 o 4 in base a `haAllergie`)
- Validazione per-step prima di procedere
- Submit finale: INSERT in tabella `iscrizioni`, poi invoke `notify-iscrizione` (fire-and-forget)
- Pagina conferma post-invio con stato `submitted`
