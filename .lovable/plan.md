

## Nuove funzionalita Gestione Pagamenti

### Panoramica
Aggiungere alla pagina Gestione Pagamenti:
1. Card cliccabili che aprono un Drawer (stile iOS come in /turni) con dettagli pagamento, pulsante webhook reminder, e log invii
2. Menu a tendina importo dovuto (250/230 EUR) su ogni card
3. Note strutturate per stato "Parziale" (importo gia pagato + importo dovuto automatico)
4. Nuova riga in `webhook_config` per URL webhook dedicato ai reminder
5. Nuova tabella `pagamento_reminder_logs` per tracciare gli invii webhook
6. Edge function per chiamare il webhook

---

### 1. Database - Modifiche

**Colonna `importo_dovuto` nella tabella `pagamenti`**
- Tipo: `integer`, default `250`, NOT NULL
- Rappresenta l'importo che il ragazzo deve pagare (250 o 230)

**Colonna `importo_pagato` nella tabella `pagamenti`**
- Tipo: `integer`, default `0`, NOT NULL  
- Usato quando lo stato e "parziale" per indicare quanto gia pagato

**Nuova tabella `pagamento_reminder_logs`**

| Colonna | Tipo | Note |
|---------|------|------|
| id | uuid | PK |
| iscrizione_id | uuid | FK verso iscrizioni |
| inviato_da | uuid | ID utente |
| inviato_da_nome | text | Nome profilo |
| stato_al_momento | text | Stato pagamento al momento dell'invio |
| note_al_momento | text | Note allegate (se parziale) |
| created_at | timestamptz | Data/ora invio |

RLS: utenti autenticati possono SELECT e INSERT. Nessun UPDATE/DELETE (log immutabili).

**Nuova riga nella tabella `webhook_config`**: inserire un record con descrizione "Webhook reminder pagamento" e URL vuoto (da configurare dall'utente).

---

### 2. Edge Function - `notify-pagamento-reminder`

Una nuova edge function che:
- Riceve i dati del pagamento (nome ragazzo, genitore, qualita genitore, turno, stato, note)
- Legge l'URL webhook dalla tabella `webhook_config` filtrando per descrizione "Webhook reminder pagamento"
- Chiama il webhook con i dati via POST
- Restituisce successo/errore

---

### 3. UI - Card nella pagina principale

**Importo dovuto**: aggiungere nella header di ogni card, a destra del nome, un piccolo Select con "250 EUR" e "230 EUR" (default 250). Al cambio, salva il valore nel record `pagamenti`.

**Note strutturate per "Parziale"**: sostituire il campo testo libero con:
- "Gia pagato: [input numerico] EUR"
- "a fronte di: [importo dovuto dal dropdown] EUR" (calcolato automaticamente, solo lettura)
- Pulsante "Salva" che salva `importo_pagato` nel record pagamenti

---

### 4. UI - Drawer dettaglio (click sulla card)

Aprire un Drawer (componente `Drawer` gia usato in TurnoPage) con:

**Sezione superiore**:
- Avatar con iniziali + nome ragazzo + genitore (qualita)
- Turno
- Stato pagamento con colore (badge)
- Importo dovuto e importo gia pagato (se parziale)

**Pulsante "Invia reminder pagamento"**:
- Visibile solo se stato = "da_pagare" o "parziale"
- Se stato = "pagato": pulsante disattivato con testo "Pagamento completato"
- Al click: chiama la edge function, registra il log, mostra toast di conferma

**Sezione Log**:
- Lista cronologica (piu recente in alto) di tutti gli invii webhook per quella iscrizione
- Formato: nome profilo, stato al momento, data `dd-MM-yyyy, HH.mm`
- Log non eliminabili, solo visibili

---

### 5. Dettagli tecnici

**File da creare:**
- `supabase/functions/notify-pagamento-reminder/index.ts` - Edge function per webhook

**File da modificare:**
- `src/hooks/usePagamenti.ts` - Aggiungere `genitore_qualita`, `importo_dovuto`, `importo_pagato` all'interfaccia e alle query; aggiungere hook per reminder logs e invio webhook
- `src/pages/GestionePagamenti.tsx` - Card cliccabili, Drawer dettaglio, dropdown importo, note strutturate, pulsante webhook, sezione log

**Migrazione SQL:**
```text
-- Aggiungere colonne a pagamenti
ALTER TABLE public.pagamenti
  ADD COLUMN importo_dovuto integer NOT NULL DEFAULT 250,
  ADD COLUMN importo_pagato integer NOT NULL DEFAULT 0;

-- Tabella log reminder
CREATE TABLE public.pagamento_reminder_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  iscrizione_id uuid NOT NULL,
  inviato_da uuid NOT NULL,
  inviato_da_nome text NOT NULL,
  stato_al_momento text NOT NULL,
  note_al_momento text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pagamento_reminder_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can select pagamento_reminder_logs"
  ON public.pagamento_reminder_logs FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can insert pagamento_reminder_logs"
  ON public.pagamento_reminder_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

ALTER PUBLICATION supabase_realtime ADD TABLE public.pagamento_reminder_logs;
```

**Inserimento webhook_config** (via insert tool):
```text
INSERT INTO webhook_config (webhook_url, descrizione)
VALUES ('', 'Webhook reminder pagamento');
```

