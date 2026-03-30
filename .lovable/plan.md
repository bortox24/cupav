

## Piano: Wizard Invio Massivo con generazione email via AI

### Panoramica
Ristrutturare `InvioMassivoDialog` come wizard a 4 step con generazione email HTML tramite Lovable AI.

### Step del Wizard

**Step 1 — Composizione messaggio**
- Textarea dove l'utente scrive cosa vuole comunicare, cosa non includere, indicazioni generali
- Campo libero, nessun vincolo

**Step 2 — Generazione email HTML con AI**
- Chiamata a una nuova edge function `generate-email-html` che riceve il testo dello Step 1 e genera HTML email completo
- Anteprima HTML renderizzata con `dangerouslySetInnerHTML` in un contenitore stilizzato
- Pulsanti: "Conferma", "Rigenera", campo testo per modifiche aggiuntive da passare all'AI
- Ogni rigenerazione invia l'HTML precedente + le nuove istruzioni per ottenere una versione aggiornata completa

**Step 3 — Filtri e anteprima destinatari**
- Filtri turni (multi-select checkbox), filtro numero (tutti/con/senza), filtro tipo iscrizione (iscrizione effettiva vs preiscrizione)
- Lista scrollabile dei ragazzi filtrati con contatore
- Selezione webhook da `webhook_config`

**Step 4 — Invio con coda e monitoraggio**
- Stesso meccanismo attuale: invio ogni 30 secondi via webhook
- Il payload includerà anche l'HTML generato nello Step 2
- Progress bar, countdown, stato per ragazzo, pulsante interrompi
- Log in `anagrafica_invio_logs`

### Modifiche tecniche

| File | Modifica |
|------|----------|
| `src/components/InvioMassivoDialog.tsx` | Riscrittura completa come wizard a 4 step |
| `supabase/functions/generate-email-html/index.ts` | Nuova edge function che chiama Lovable AI per generare HTML email |

### Edge function `generate-email-html`
- Riceve: `{ prompt: string, previousHtml?: string, modifications?: string }`
- System prompt con template HTML email base (stile inline, responsive, branding CUPAV)
- Usa `LOVABLE_API_KEY` (già presente) con modello `google/gemini-3-flash-preview`
- Restituisce: `{ html: string }`
- Non streaming, chiamata singola con `response_format` via tool calling per estrarre l'HTML

### Nessuna modifica al database
Usa tabelle e colonne esistenti. L'HTML generato viene inviato come parte del payload webhook.

