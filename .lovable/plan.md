
## Obiettivo

Sostituire il loop client-side dell'invio massivo con una **coda persistente server-side**, così l'utente può chiudere il dialog (e anche il browser) senza interrompere nulla. Aggiungere un **widget persistente sotto l'header** che mostra in tempo reale lo stato di un eventuale job in corso, con barra di progresso. Includere modalità **dry-run** per testare tutto end-to-end senza chiamare davvero il webhook.

---

## Architettura

```text
User (dialog)
   │  POST start-invio-massivo  →  crea job + items in DB, EdgeRuntime.waitUntil(process)
   │  ← 202 { job_id }
   │
   ├─ chiude dialog / browser? OK
   │
Edge Function "invio-massivo-runner"
   │  loop interno: prendi N pending → chiama webhook n8n → aggiorna item → log
   │  pausa 30s tra un invio e l'altro
   │  se job grande, prima del timeout si auto-richiama (chain) per riprendere
   │  job.stato: queued → running → completed / aborted / failed
   │
Client (qualsiasi pagina)
   │  hook globale useInvioMassivoJob() con realtime sul job attivo dell'utente
   │  → mostra widget sotto header + barra progresso
```

---

## 1. Database — nuova migrazione

Due tabelle nuove, RLS admin-only (più chi ha accesso a `/anagrafica-ragazzi`, allineato alle policy esistenti).

**`invio_massivo_jobs`**
- `id uuid pk`
- `created_by uuid` (auth.uid())
- `created_by_nome text`
- `titolo text`, `testo text`, `cta_label text`, `cta_url text`
- `webhook_id uuid`, `webhook_url text`, `webhook_descrizione text`
- `filtri jsonb` (turni, filtroNumero — solo per audit)
- `dry_run boolean default false` ← chiave per test senza invii reali
- `send_interval_seconds int default 30`
- `stato text default 'queued'` (`queued` | `running` | `completed` | `aborted` | `failed`)
- `totale int`, `inviati int default 0`, `falliti int default 0`
- `current_index int default 0`
- `abort_requested boolean default false`
- `started_at`, `finished_at`, `last_heartbeat_at`, `created_at`, `updated_at`
- `error_message text`

**`invio_massivo_job_items`**
- `id uuid pk`
- `job_id uuid` → jobs (on delete cascade)
- `position int` (ordine)
- `ragazzo_id uuid`
- `ragazzo_full_name text`
- `genitore_nome text`
- `payload jsonb` (snapshot dati al momento del kickoff)
- `stato text default 'pending'` (`pending` | `sending` | `sent` | `error` | `skipped`)
- `error_message text`
- `sent_at`, `created_at`
- index su `(job_id, position)` e `(job_id, stato)`

**RLS**: stessa logica delle altre tabelle sensibili — solo admin o chi ha `has_page_access(auth.uid(), '/anagrafica-ragazzi')` può SELECT/INSERT/UPDATE. Niente DELETE per non admin. Niente policy `anon`.

**Realtime**: `ALTER PUBLICATION supabase_realtime ADD TABLE invio_massivo_jobs, invio_massivo_job_items;` + `REPLICA IDENTITY FULL` su entrambe.

**Trigger `updated_at`** su `invio_massivo_jobs` con la funzione esistente.

---

## 2. Edge Function `invio-massivo-runner`

File: `supabase/functions/invio-massivo-runner/index.ts`. Usa `service_role` per scrivere stato e log (così non dipende dai claim utente per gli update durante il processing).

### Endpoint unico, due azioni via query/body

- `action: "start"` — invocato dal client con JWT utente.
  1. Auth: `getClaims(jwt)`, ricava `userId` e verifica `is_admin` o `has_page_access('/anagrafica-ragazzi')` via RPC.
  2. Verifica che NON ci sia già un job dell'utente in stato `queued` o `running` (mutex per utente).
  3. Validazione payload (zod) — titolo, testo, ctaLabel/Url coerenti, lista `ragazzi_ids`, `webhook_id`, `dry_run`.
  4. Carica webhook da `webhook_config`. Carica ragazzi + genitori + iscrizioni dai DB (NON fidarsi di payload client per email).
  5. Crea `jobs` (stato `queued`, totale = N) + `items` in bulk.
  6. `EdgeRuntime.waitUntil(runJob(jobId))` e restituisce **`202 { job_id }`**.

- `action: "resume"` — invocato dalla function stessa quando si auto-chaina (sempre con `service_role`, body firmato con `x-runner-secret` confrontato con secret `INVIO_MASSIVO_RUNNER_SECRET`).

- `action: "abort"` — invocato dal client. Mette `abort_requested = true` sul job. Il loop interno controlla questo flag a ogni iterazione e termina cleanly con stato `aborted`.

### `runJob(jobId)`
- Set `stato='running'`, `started_at=now()`, `last_heartbeat_at=now()`.
- Carica items con stato `pending` in ordine `position`.
- Calcola un **deadline**: `Date.now() + MAX_RUN_MS` con `MAX_RUN_MS = 20 * 60 * 1000` (margine sotto i ~25 min di limite Edge Function).
- Per ogni item:
  - re-check `abort_requested` (refetch job ogni iterazione).
  - aggiorna item → `sending`.
  - costruisci HTML con `buildEmailHtml` (codice condiviso copiato in funzione) — il file `comunicazioneEmailTemplate.ts` viene **duplicato** dentro la function come `_email_template.ts` per evitare import cross-progetto.
  - se `dry_run === true`: **non chiama il webhook**, simula un esito `sent` con `error_message: 'DRY RUN — nessun invio reale'`. Aggiunge anche un log in `anagrafica_invio_logs` con `tipo: 'invio_massivo_dryrun'`.
  - altrimenti `fetch(webhook_url, ...)` con stesso payload attuale + `dry_run: false`. Timeout 25s.
  - aggiorna item → `sent` / `error`, incrementa `inviati`/`falliti` sul job, set `current_index`, `last_heartbeat_at`.
  - INSERT in `anagrafica_invio_logs` (stesso formato attuale, tipo `'invio_massivo'`).
  - se non è l'ultimo item: `await sleep(send_interval_seconds * 1000)`.
  - **Auto-chaining**: prima di ogni sleep, se `Date.now() + intervalMs + 5000 > deadline`, esci dal loop e fai `fetch(SELF_URL, { action: 'resume', job_id })` con header `x-runner-secret`. Restituisci. La nuova invocation riprende dagli `pending`.
- Quando non ci sono più `pending`: set `stato='completed'`, `finished_at=now()`.
- Su errore non gestito: `stato='failed'`, `error_message`.

### Watchdog
Cron pg_cron ogni 2 minuti che riprende job `running` con `last_heartbeat_at` più vecchio di 3 minuti (sintomo di crash/timeout della function senza chain riuscita). Chiama `action: "resume"`. Setup via `supabase--insert` (non migration).

### Config function
Aggiungere a `supabase/config.toml`:
```toml
[functions.invio-massivo-runner]
verify_jwt = false
```
(verify_jwt false perché la function gestisce sia chiamate user che self/cron; auth gestita in codice.)

### Secret
`INVIO_MASSIVO_RUNNER_SECRET` — random string per validare le chiamate self/cron.

---

## 3. Frontend

### 3a. Hook globale `useInvioMassivoJob()`
File nuovo: `src/hooks/useInvioMassivoJob.ts`.

- Query iniziale: cerca il job dell'utente corrente in stato `queued` o `running` (singleton per utente).
- Subscribe realtime su `invio_massivo_jobs` (filter `created_by=eq.<uid>`) e su `invio_massivo_job_items` (filter `job_id=eq.<currentJobId>`, abilitato solo se serve il dettaglio).
- Espone: `{ job, items, progress: { sent, error, total, percent }, abort(), refresh() }`.

### 3b. Widget persistente sotto l'header
Nuovo componente: `src/components/InvioMassivoBanner.tsx`. Montato in `MainLayout.tsx` **subito sotto** `<Header>` e sopra `<main>`.

- Se non c'è job attivo → renderizza `null`.
- Se job `running` o `queued`:
  - Barra orizzontale full-width sticky `top-0 z-40` sotto header.
  - Mostra: icona Send pulsante, titolo job, `X/N inviati • Y errori`, ETA stimata (`(N - X) × 30s`), badge `DRY RUN` se attivo.
  - `<Progress value={percent} />` a piena larghezza.
  - Pulsante "Dettagli" → apre lo stesso `InvioMassivoDialog` in **modalità monitor** (vedi 3c).
  - Pulsante "Interrompi" con conferma → chiama action `abort`.
- Se job appena `completed` o `aborted` o `failed`:
  - Banner di summary per ~10 secondi con toast, poi auto-hide. Stato locale di "dismissed job ids" in `sessionStorage`.

Stile coerente con design system (token semantici, `rounded-none` per la barra, accent verde CUPAV).

### 3c. Refactor `InvioMassivoDialog.tsx`
Il dialog diventa orchestratore in 2 modalità:

**Modalità "wizard" (nessun job attivo)** — come oggi: Messaggio → Anteprima → Filtri → Avvio.
- Step Filtri: aggiungere checkbox **"Modalità test (dry-run): non invia email reali, solo simulazione"**.
- Al click "Avvia invio": chiama `supabase.functions.invoke('invio-massivo-runner', { body: { action: 'start', ... }})`.
- Se 202 con `job_id`: passa a step "monitor".
- Se 409 "job already in progress": toast con bottone "Vedi job in corso" che apre il monitor del job esistente.

**Modalità "monitor"** — quando esiste un job attivo dell'utente (anche entrando nel dialog dal banner):
- Mostra header riepilogo (titolo, totale, inviati, errori, ETA, dry-run badge).
- Tabella scrollabile con tutti gli items: position, full_name, stato (badge colorato), eventuale errore.
- Aggiornamento live via realtime (no polling).
- Pulsanti: "Chiudi" (chiude solo il dialog, il job continua), "Interrompi" (con conferma).
- Il loop client-side e tutta la logica `startSending/abortRef/countdownRef/queue` vengono **rimossi**.

Comportamenti rimossi/modificati:
- `useEffect` su `!open` non abortisce più nulla (il job vive sul server).
- `onOpenChange` non chiama più `stopSending`.

### 3d. Integrazione globale
- `MainLayout.tsx`: import e render `<InvioMassivoBanner />` subito sotto `<Header />`.
- Il banner usa l'hook globale, quindi è visibile in qualsiasi pagina autenticata (Home, Pagamenti, Spese, ecc.).

---

## 4. Verifica e test prima di consegnare

### 4a. Test automatici Edge Function (Deno)
File `supabase/functions/invio-massivo-runner/index.test.ts`:
1. **Auth**: chiamata senza JWT → 401.
2. **Auth utente non admin/non permesso**: → 403.
3. **Start in dry-run con 3 ragazzi finti**: verifica creazione job (`queued`/`running`), creazione 3 items, ritorno 202 con job_id.
4. **Mutex**: secondo start con job in corso → 409.
5. **Abort**: action abort setta `abort_requested=true`, dopo qualche secondo il job risulta `aborted`.
6. **Validation**: payload senza titolo → 400; ctaUrl invalido → 400.

Per il test E2E del loop interno: dato che 30s × N è lungo, **per i test** la function accetta `send_interval_seconds` override (solo in dry-run) per girare a 1s e completare in pochi secondi.

### 4b. Dry-run end-to-end manuale (eseguito da me, non dall'utente)
Eseguo dalla console di test:
- Avvio job dry-run su 3 ragazzi reali a `send_interval_seconds: 2`.
- Verifico via SQL che: job → `running` → `completed`, items tutti `sent`, 0 chiamate al webhook (controllo logs della function: nessun `fetch webhook`), log in `anagrafica_invio_logs` con tipo `invio_massivo_dryrun`.
- Verifico realtime guardando i logs della function + query periodiche.

### 4c. Verifica UI (manuale)
- Avviare job dry-run dall'UI → banner appare sotto header con barra.
- Cambiare pagina (es. da `/anagrafica-ragazzi` a `/home`) → banner resta visibile, progress continua ad avanzare.
- Cliccare "Dettagli" → dialog si apre in modalità monitor con tabella items live.
- Chiudere dialog → banner resta, job continua.
- Cliccare "Interrompi" → conferma → job va in `aborted`, banner mostra riepilogo 10s, poi sparisce.

### 4d. Linter & types
- Eseguo `supabase--linter` dopo la migration.
- Verifico tipizzazione client su nuove tabelle (autogenerate via Supabase types).

---

## 5. Cosa NON cambia
- Template HTML, header/footer email, CTA opzionale.
- Webhook n8n configurati e payload spedito (stessi campi).
- Tabella `anagrafica_invio_logs` (solo si aggiunge il tipo `invio_massivo_dryrun`).
- Intervallo standard 30s.
- Wizard step 1–2–3 (Messaggio / Anteprima / Filtri), inclusa CTA opzionale.
- `InviaComunicazioneWizard.tsx` (invio singolo) resta com'è.

---

## 6. File toccati / creati

**Creati**
- migration SQL (2 tabelle + RLS + realtime + trigger)
- `supabase/functions/invio-massivo-runner/index.ts`
- `supabase/functions/invio-massivo-runner/_email_template.ts` (copia di `comunicazioneEmailTemplate.ts`)
- `supabase/functions/invio-massivo-runner/index.test.ts`
- `src/hooks/useInvioMassivoJob.ts`
- `src/components/InvioMassivoBanner.tsx`

**Modificati**
- `supabase/config.toml` (blocco function)
- `src/components/InvioMassivoDialog.tsx` (riscritto: wizard + monitor, rimosso loop client)
- `src/components/layout/MainLayout.tsx` (monta banner)
- secret `INVIO_MASSIVO_RUNNER_SECRET` da aggiungere
- cron pg_cron via `supabase--insert` per watchdog

---

## 7. Cosa serve da te ora

Per partire mi serve solo il via libera al piano. Poi procedo in quest'ordine:
1. Migration DB (ti chiedo conferma).
2. Aggiunta secret `INVIO_MASSIVO_RUNNER_SECRET`.
3. Edge function + test Deno (li eseguo io).
4. Setup cron watchdog.
5. Hook + banner + refactor dialog.
6. Dry-run end-to-end con 3 ragazzi reali (intervallo 2s) e ti mostro i risultati.
7. Solo se tutto è verde, ti dico "puoi fare il primo vero invio".

Confermi e parto?
