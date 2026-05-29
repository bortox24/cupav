## Obiettivo

Portare lo stesso pulsante **"Invio Massivo"** (wizard a 3 step → invio in background con banner di avanzamento, monitor, interruzione e log) — oggi presente solo in **Anagrafica Ragazzi** — anche in **Anagrafica Staff** e nella pagina **Montaggio Campeggio**, usando sempre lo stesso webhook `Invio comunicazione custom`.

## Comportamento confermato

- **Webhook**: sempre `Invio comunicazione custom` per tutti e tre i tipi.
- **Filtri Staff**: per ruolo (Animatore / Cuoco / Resp. Campo / Resp. Animatori) **e** per turno assegnato.
- **Filtri Montaggio**: per giorno selezionato (Sab 30/05, Dom 31/05, Lun 01/06, Mar 02/06) con anche la voce **"Tutti"**.

## Come funziona oggi

Il sistema è interamente legato ai ragazzi:
- `InvioMassivoDialog` (filtri turni/numero, destinatari = ragazzi).
- Edge function `invio-massivo-runner` carica da `ragazzi`/`ragazzi_genitori`, manda al webhook fisso e logga su `anagrafica_invio_logs` (con `ragazzo_id`).
- Tabelle `invio_massivo_jobs` / `invio_massivo_job_items` + hook `useInvioMassivoJob` + `InvioMassivoBanner` + `InvioMassivoMonitorDialog` (già globali).

Staff (`animatori`) e Montaggio (`iscrizioni_montaggio`) hanno l'**email direttamente sul record**, quindi sono più semplici dei ragazzi.

## Modifiche previste

### 1. Database (migration)
- Aggiungere colonna `entity_type text NOT NULL DEFAULT 'ragazzi'` a `invio_massivo_jobs` (valori: `ragazzi` | `animatori` | `montaggio`).
- Allargare le RLS di `invio_massivo_jobs` e `invio_massivo_job_items` perché oggi consentono accesso solo a chi ha `/anagrafica-ragazzi`. Aggiungere `OR has_page_access(..., '/anagrafica-animatori')` e `OR has_page_access(..., '/anagrafica-montaggio-campeggio')` su SELECT/INSERT/UPDATE.
- Nessuna nuova tabella: gli `job_items` riutilizzano `ragazzo_full_name` come nome destinatario, `genitore_nome` come nome di personalizzazione email, e `payload` (jsonb) per email + id origine.

### 2. Edge function `invio-massivo-runner`
- Accettare `entity_type` e una lista generica di id (`recipient_ids`), mantenendo `ragazzi_ids` per retrocompatibilità.
- `verifyUser`: autorizzare in base alla pagina coerente con `entity_type`.
- Caricamento destinatari per tipo:
  - `ragazzi`: logica attuale.
  - `animatori`: da `animatori` (non archiviati, con email), filtrati per `ruolo` e per turno via `animatori_turni`. Nome personalizzazione = `full_name`.
  - `montaggio`: da `iscrizioni_montaggio` (non archiviati, con email), filtrati per giorni selezionati.
- Webhook sempre `Invio comunicazione custom`. Nel body, oltre ai campi attuali, includere `email` e un array compatibile `genitori: [{ nome_cognome, email }]` così l'attuale flusso n8n (che itera i destinatari) funziona anche per staff/montaggio, più `entity_type`.
- Logging per tipo: `ragazzi` → `anagrafica_invio_logs.ragazzo_id`; `montaggio` → `anagrafica_invio_logs.iscrizione_montaggio_id`; `animatori` → `staff_activity_logs.animatore_id` (azione `invio_massivo`).

### 3. Frontend
- Refactor di `InvioMassivoDialog` per accettare una **configurazione** (`entity_type`, lista destinatari, UI filtri, come mostrare nome/badge destinatario), mantenendo identico il flusso a 3 step e l'anteprima email.
- **Anagrafica Staff** (`AnagraficaAnimatori.tsx`): pulsante "Invio Massivo" (icona Megaphone) con filtri ruolo + turno.
- **Montaggio Campeggio** (`TurnoMontaggioPage.tsx`): pulsante "Invio Massivo" accanto a Esporta PDF/Calendario, con filtro giorni + "Tutti".
- Banner e monitor restano globali e già compatibili (lavorano su `invio_massivo_jobs` a prescindere dal tipo); funzionano grazie all'allargamento RLS.

## Cosa NON cambia
- Il webhook resta unico (`Invio comunicazione custom`).
- I wizard di invio singolo esistenti restano invariati.
- Nessuna modifica all'invio massivo ragazzi (resta retrocompatibile).
