## Piano: Iscrizione Turno Famiglie 2026

Trasforma il PDF allegato in un modulo digitale autonomo con anagrafica, vista turno e gestione pagamenti integrata.

---

### 1. Database — nuove tabelle

`**iscrizioni_famiglie**` (separata da `iscrizioni` perché ha struttura molto diversa):

- `id` uuid PK, `created_at` timestamptz
- **Sezione 1 – Dati personali**: `email`, `nome`, `cognome` (auto-capitalizzati), `residente_a`, `via`
- `recapiti_telefonici` jsonb (array di `{nome, telefono}`, min 1)
- **Sezione 2 – Iscrizione**: `tipo_periodo` text (`7_giorni` | `10_giorni` | `15_giorni` | `personalizzato`), `data_inizio` date, `data_fine` date (per "personalizzato", vincolato 08/08–22/08/2026)
- **Sezione 2 – Partecipanti**: `num_adulti` int, `num_figli_over10` int (0–4), `num_figli_4_10` int, `num_figli_0_3` int, `num_animali` int
- **Sezione 3 – Acconto/firma**: `acconto_versato` numeric, `regolamento_accettato` boolean, `firma_data` date, `firma_nome_cognome` text
- `turno` text default `'Turno famiglie'` (per uniformità nei filtri)

`**pagamenti_famiglie**`: stessa struttura di `pagamenti` ma con FK a `iscrizioni_famiglie`. `importo_dovuto` **NO default** (assegnato manualmente dallo staff).

**RLS**: 

- INSERT pubblico (form anonimo)
- SELECT/UPDATE/DELETE solo `auth.uid() IS NOT NULL` (come `iscrizioni`)
- `pagamenti_famiglie`: admin o `has_page_access('/gestione-pagamenti')`

**Realtime**: aggiungi entrambe a `supabase_realtime`.

---

### 2. Modulo pubblico `/iscrizione-famiglie`

Nuovo file `src/pages/public/IscrizioneFamiglie.tsx`, struttura simile a `IscrizioneCampeggio.tsx` ma con **3 tab/step**:

**Tab 1 — Informazioni personali**

- Email per comunicazioni *(obbligatorio)*
- Nome + Cognome separati *(obbligatori, auto-capitalizzati: ogni parola con prima lettera maiuscola, resto minuscolo, in tempo reale onChange)*
- Residente a *(obbligatorio)*, Via *(obbligatorio)*
- **Recapiti telefonici dinamici**: lista con bottone `+` che aggiunge righe `{nome, telefono}`. Placeholder esempio: "Michele Rossi" / "333 1234567". Primo obbligatorio, altri opzionali con bottone elimina (X). Almeno 1 sempre presente.

**Tab 2 — Chiede l'iscrizione + Persone partecipanti**

- RadioGroup *(obbligatorio)*:
  - 7 giorni intero periodo — dal 08/08 al 15/08
  - 10 giorni intero periodo — dal 08/08 al 19/08
  - 15 giorni intero periodo — dal 08/08 al 22/08
  - Personalizzato → mostra 2 DatePicker "dal/al" limitati a 08/08/2026–22/08/2026 (entrambi obbligatori se selezionato)
- Sezione **Persone partecipanti** (card raggruppata, layout a griglia):
  - Adulti (numero)
  - 1°/2°/3° figlio >10 anni (checkbox), + 4° figlio (numero, come da PDF)
  - 4–10 anni (numero), 0–3 anni (numero), Animali (numero)
  - Almeno 1 partecipante totale obbligatorio

**Tab 3 — Regolamento, quota e firma**

- Box scrollabile con il **regolamento completo** (6 punti) dal PDF
- Box con **quota giornaliera a persona** (4 fasce complete dal PDF: residente+collabora, residente, fuori comune+collabora, fuori comune)
- Checkbox *(obbligatorio)*: "Ho letto e accetto il regolamento e la quota giornaliera a persona"
- Campo numero "Versa come acconto € ___" *(obbligatorio, ≥ 0)*
- Campo data **preinserito** con data odierna (formato dd/MM/yyyy, modificabile)
- Riga firma read-only: "Firma per iscrizione e accettazione regolamento allegato: **{Nome Cognome}**" (auto-popolato da Tab 1)
- Footer testuale fisso (non editabile): "Ci impegniamo a vivere quest'esperienza nello spirito del Campeggio Parrocchiale: …" (5 righe dal PDF)

**Submit**: insert in `iscrizioni_famiglie` → invoke edge function (vedi sotto) → mostra **AlertDialog di conferma**:

> "Grazie per aver inviato la tua iscrizione al Turno Famiglie! Ti contatteremo noi dello staff. Per qualsiasi cosa: [cupavdirettivo@gmail.com](mailto:cupavdirettivo@gmail.com) — Facebook: CUPAV Campeggio Unità Pastorale Altavilla Valmarana"

(Nota: corretto da "cupofdirettivo" / "Fecebook" del PDF.)

**Validazioni**: Zod schema con messaggi italiani; navigazione tab bloccata se step corrente invalido.

**Routing**: aggiungi `<Route path="/iscrizione-famiglie" element={<IscrizioneFamiglie />} />` in `App.tsx`.

---

### 3. Edge function `notify-iscrizione-famiglia` (opzionale)

Identica a `notify-iscrizione` ma per il nuovo turno → invia notifica n8n (riusa webhook esistente).

---

### 4. Home — nuova card turno + countdown

In `src/pages/Home.tsx`, aggiungi nella sezione "Iscrizioni per Turno" una card **"Turno Famiglie"** (icona `Users` o `TreePine`, gradient distinto es. arancio/ambra) che linka a `/turno/turno-famiglie`. Visibile solo se utente ha permesso turno o admin.

Aggiungi `'Turno famiglie'` a `TURNI` in `src/hooks/useTurnoPermissions.ts` con slug `turno-famiglie`.

---

### 5. TurnoPage — supporto Turno Famiglie

`src/pages/TurnoPage.tsx` deve riconoscere lo slug `turno-famiglie` e leggere da `iscrizioni_famiglie` invece di `iscrizioni`. Strategia: branch condizionale sullo slug → query alternativa con mapping dei campi (nome+cognome al posto di ragazzo+genitore). Tab "Appello/Tende/Pagamenti" adattate (no allergie/farmaci, mostra invece num. partecipanti e periodo).

---

### 6. Anagrafica Turno Famiglie

Nuova pagina `src/pages/AnagraficaTurnoFamiglie.tsx` (modellata su `AnagraficaRagazzi.tsx`):

- Tabella con tutti i campi del modulo: nome, cognome, email, residenza, via, recapiti (tutti), tipo periodo + date, num partecipanti per categoria, acconto, data firma
- Ricerca, filtri, esportazione CSV/PDF
- Dettaglio cliccabile con drawer
- Card di Accesso Rapido in Home con icona `Users` → path `/anagrafica-turno-famiglie`
- Route protetta + permesso pagina configurabile in `/admin/permessi`

---

### 7. Gestione Pagamenti — integrazione

In `src/hooks/usePagamenti.ts` e `src/pages/GestionePagamenti.tsx`:

- Estendi `useIscrizioniConPagamenti` per **unire** (UNION) `iscrizioni` + `iscrizioni_famiglie`, ognuna con i propri pagamenti, normalizzando i campi (`ragazzo_nome` = `nome`, `ragazzo_cognome` = `cognome` per famiglie).
- Aggiungi flag `is_famiglia: boolean` nel tipo `IscrizioneConPagamento`.
- `'Turno famiglie'` già presente in `TURNI_FILTER` (riga 19) — verifica funzioni.

**Identificazione visiva**:

- Badge ben visibile **"🏕️ Turno Famiglie"** in alto a destra della card (colore distinto: viola/indaco con bordo) — sempre mostrato in lista, non solo nei filtri
- Bordo sinistro accentuato (es. `border-l-4 border-indigo-500`) sulle card famiglia

**Prezzo libero**:

- Per `is_famiglia=true`, `importo_dovuto` parte da `null/0` e mostra placeholder "Da definire" con icona warning
- Lo staff inserisce manualmente l'importo nel drawer dettaglio (campo numero libero, nessun default 250€)
- Stato pagamento (`da_pagare`/`parziale`/`pagato`) calcolato come per gli altri solo dopo che l'importo è stato impostato; finché è null mostra badge "Importo da assegnare"

---

### 8. Permessi pagine

Aggiungi a `/admin/permessi-pagine` due nuove pagine selezionabili:

- `/anagrafica-turno-famiglie`
- `/turno/turno-famiglie` (gestita via `turno_permessi` esistente)

---

### File modificati / creati

**Creati**:

- `supabase/migrations/<ts>_iscrizioni_famiglie.sql`
- `src/pages/public/IscrizioneFamiglie.tsx`
- `src/pages/AnagraficaTurnoFamiglie.tsx`
- `supabase/functions/notify-iscrizione-famiglia/index.ts` (opzionale)

**Modificati**:

- `src/App.tsx` (2 nuove route)
- `src/pages/Home.tsx` (card turno famiglie + accesso rapido anagrafica)
- `src/hooks/useTurnoPermissions.ts` (aggiunge turno)
- `src/pages/TurnoPage.tsx` (branch famiglie)
- `src/hooks/usePagamenti.ts` (union query + flag)
- `src/pages/GestionePagamenti.tsx` (badge + prezzo libero)
- `src/pages/AdminPermessiPagine.tsx` (nuove pagine)

### Memoria progetto da aggiornare

Nuovo file `mem://features/turno-famiglie` con caratteristiche di questo flusso e link nell'index.