

## Piano: Pagine automatiche per account staff

### Obiettivo
Creare una configurazione admin che permette di scegliere quali pagine vengono assegnate automaticamente quando si crea un account staff dal pulsante "Crea Account" nell'Anagrafica Staff.

### Approccio
Usare la tabella `site_settings` esistente con una chiave `staff_default_pages` che contiene un array JSON di path. Nessuna migration necessaria.

### Implementazione

#### 1. Nuova sezione nella pagina Impostazioni (`src/pages/Impostazioni.tsx`)
- Aggiungere una card "Pagine predefinite account staff"
- Lista di checkbox con tutte le `availablePages` da `usePagePermissions`
- Al toggle, salva/aggiorna la riga `site_settings` con key `staff_default_pages` e value = JSON array dei path selezionati
- `/home` sempre selezionato e disabilitato (obbligatorio)

#### 2. Aggiornare Edge Function `create-staff-account/index.ts`
- Dopo la creazione utente, leggere `site_settings` dove `key = 'staff_default_pages'`
- Parsare il JSON array e inserire una riga `user_page_permissions` per ogni path (oltre a `/home` già presente)
- Se la setting non esiste, comportamento attuale (solo `/home`)

### File modificati
- `src/pages/Impostazioni.tsx` — nuova sezione con checkbox pagine predefinite
- `supabase/functions/create-staff-account/index.ts` — leggere setting e assegnare pagine automatiche

