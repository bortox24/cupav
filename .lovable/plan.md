## Obiettivo
Aggiungere, dopo titolo e testo, due campi **facoltativi**:
- `Etichetta pulsante` (es. "Iscriviti ora")
- `Link pulsante` (URL completo, https://…)

Se entrambi compilati, l'email mostra in fondo al body un pulsante verde CUPAV cliccabile che apre il link in nuova scheda.

## Modifiche

### 1. `src/lib/comunicazioneEmailTemplate.ts`
- Aggiornare firma: `buildEmailHtml(titolo, testo, genitoreNome, ctaLabel?, ctaUrl?)`
- Se `ctaLabel` e `ctaUrl` sono entrambi presenti e validi, iniettare prima del blocco footer una `<tr>` con un pulsante table-based (compatibile email client):
  - sfondo verde `#1a5c2e`, testo bianco, padding 14px 32px, border-radius 6px
  - `<a href="${ctaUrlSafe}" target="_blank" rel="noopener noreferrer">`
  - URL escapato e validato (deve iniziare con `http://` o `https://`, altrimenti ignorato)

### 2. `src/components/InvioMassivoDialog.tsx` (step "message")
- Aggiungere stato `ctaLabel`, `ctaUrl`
- Due campi opzionali sotto la textarea:
  - Input `Etichetta pulsante (opzionale)` — max 40 caratteri
  - Input `Link pulsante (opzionale)` — type url, placeholder `https://...`
- Validazione: se uno dei due è compilato, l'altro diventa obbligatorio per passare allo step preview
- Passare i due valori a `buildEmailHtml` per anteprima e invio
- Includere `cta_label` e `cta_url` nel payload webhook

### 3. `src/components/InviaComunicazioneWizard.tsx` (invio singolo)
- Stesse aggiunte: stato + due input nello step 1
- Stessa validazione e passaggio a `buildEmailHtml`
- Includere `cta_label` e `cta_url` nel payload webhook

## Cosa NON cambia
- Template, header, footer, logica invio 30s, log, filtri turni, webhook config
- Comportamento quando i campi CTA sono vuoti (email identica a oggi)
