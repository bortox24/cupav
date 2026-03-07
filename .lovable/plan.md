

## Piano: Pagina Impostazioni con logo dinamico e toggle link pubblici

### Panoramica
Creare una pagina "Impostazioni" con:
1. Upload logo personalizzato (URL stabile via storage bucket)
2. Toggle per abilitare/disabilitare i link Iscrizione e Preiscrizione
3. Integrazione nel sistema permessi pagine

### Database

**Nuova tabella `site_settings`** (key-value):
- `key` (text, primary key) — es. `iscrizione_enabled`, `preiscrizione_enabled`
- `value` (text) — es. `true`/`false`
- RLS: tutti autenticati possono leggere, solo admin o chi ha accesso `/impostazioni` può modificare. Lettura pubblica per i toggle (servono nelle pagine pubbliche).

**Nuovo storage bucket `branding`** (public):
- Path fisso: `branding/logo.png` — sovrascrivendo sempre lo stesso file, l'URL pubblico resta invariato
- RLS: upload/delete solo per admin o chi ha accesso `/impostazioni`, lettura pubblica

### Nuova pagina `src/pages/Impostazioni.tsx`
- Sezione **Logo**: anteprima logo attuale, pulsante upload da computer, sovrascrive `branding/logo.png`
- Sezione **Link pubblici**: due Switch per Iscrizione e Preiscrizione, salva su `site_settings`
- Layout con MainLayout, stile coerente

### Modifiche ai file esistenti

**`src/components/layout/Header.tsx`** + **`src/pages/Login.tsx`** + pagine pubbliche:
- Creare un hook `useCustomLogo()` che cerca il logo nel bucket `branding/logo.png`; se esiste usa quello, altrimenti fallback a `src/assets/logo-cupav.png`
- Sostituire l'import statico con il risultato dell'hook

**`src/pages/Home.tsx`** (righe 315-324):
- I pulsanti "Iscrizioni" e "Preiscrizioni" nel banner leggono `site_settings` e si nascondono se disabilitati

**Pagine pubbliche** (`/iscrizione`, `/preiscrizione-cupav`):
- Se il relativo toggle è disabilitato, mostrare un messaggio "Le iscrizioni/preiscrizioni sono chiuse" invece del form

**`src/hooks/usePagePermissions.ts`**:
- Aggiungere `/impostazioni` all'array `availablePages`

**`src/App.tsx`**:
- Aggiungere route protetta `/impostazioni`

**Card accesso rapido in Home.tsx**:
- Aggiungere card "Impostazioni" con icona Settings

### File coinvolti
- `src/pages/Impostazioni.tsx` (nuovo)
- `src/hooks/useSiteSettings.ts` (nuovo)
- `src/hooks/useCustomLogo.ts` (nuovo)
- `src/components/layout/Header.tsx`
- `src/pages/Login.tsx`
- `src/pages/public/IscrizioneCampeggio.tsx`
- `src/pages/public/PreiscrizioneCupav.tsx`
- `src/pages/public/ModuloForm.tsx`
- `src/pages/Home.tsx`
- `src/hooks/usePagePermissions.ts`
- `src/App.tsx`
- 1 migrazione DB (tabella + bucket + RLS + seed dati iniziali)

