## Obiettivo
Semplificare il pulsante "Invio Massivo Comunicazioni" in Anagrafica Ragazzi: rimuovere completamente l'AI e usare lo stesso flusso (titolo + testo → template HTML CUPAV) già presente in `InviaComunicazioneWizard`, con anteprima, selezione turni e invio sequenziale (1 email ogni 30s).

## Nuovo flusso (3 step)

**Step 1 — Scrivi messaggio**
- Campo `Titolo` (Input, max 120 caratteri)
- Campo `Testo` (Textarea, max 5000 caratteri) — l'utente incolla il testo "pari pari"
- Nessun prompt AI, nessun campo dinamico, nessun pulsante "Genera"

**Step 2 — Anteprima**
- Anteprima dell'email renderizzata nel template HTML standard CUPAV (stesso `buildEmailHtml` usato in `InviaComunicazioneWizard.tsx`: header giallo con logo, titolo verde, "Gentile {nome_genitore}", testo, footer verde)
- Mostrata in un `<iframe srcDoc>` come nel wizard singolo
- Per l'anteprima si usa un nome genitore di esempio ("Genitore") oppure il primo della lista filtrata

**Step 3 — Destinatari + invio**
- Selezione turni (checkbox multipli: 4^/5^ Elementare, 1^/2^/3^ Media, Turno famiglie) — anno 2026
- Filtro numero (tutti / con numero / senza numero) — mantenuto come oggi
- Selezione webhook (Select dai `webhook_config`) — mantenuto
- Conteggio destinatari filtrati
- Pulsante "Avvia invio" → invia 1 email ogni 30 secondi, una per ragazzo
- Per ogni ragazzo: ricostruisce l'HTML con `buildEmailHtml(titolo, testo, genitoreNome)` usando il nome del primo genitore del ragazzo, poi POST al webhook con payload identico a quello attuale + `html_content`
- Coda visuale con stato per ogni ragazzo (pending/sending/sent/error), countdown 30s, pulsante Stop
- Log su `anagrafica_invio_logs` con `tipo: 'invio_massivo'` (come oggi)

## Modifiche tecniche

- **`src/components/InvioMassivoDialog.tsx`** — riscrittura completa:
  - Rimuovere step `ai_generation`, `userPrompt`, `generatedHtml`, `modifications`, `selectedDynamicFields`, `replaceePlaceholders`, `generateEmail`, import di `DOMPurify`, dipendenza dalla edge function `generate-email-html`
  - Aggiungere stato `titolo`, `testo`
  - Estrarre `buildEmailHtml` in un file condiviso (`src/lib/comunicazioneEmailTemplate.ts`) e usarlo sia qui che in `InviaComunicazioneWizard.tsx` per coerenza
  - Steps: `message` (titolo+testo) → `preview` (anteprima iframe) → `filters` (turni+webhook) → `sending` (coda)
  - Intervallo invio: 30s (già configurato come `SEND_INTERVAL`)

- **`src/lib/comunicazioneEmailTemplate.ts`** (nuovo) — esporta `buildEmailHtml(titolo, testo, genitoreNome)` identico a quello in `InviaComunicazioneWizard`

- **`src/components/InviaComunicazioneWizard.tsx`** — importa `buildEmailHtml` dal nuovo file (nessun cambio funzionale)

## Cosa NON cambia
- Pulsante e posizione in Anagrafica Ragazzi
- Tabella log e payload webhook
- Wizard singolo "Invia comunicazione" dentro la card ragazzo
- Edge function `generate-email-html` resta in repo ma non più usata da questo dialog (posso lasciarla o rimuoverla — dimmi tu)