

## Piano: Gestione turni preiscrizione dalle Impostazioni

### Obiettivo
Permettere all'admin di abilitare/disabilitare i singoli turni nel modulo di preiscrizione dalla pagina Impostazioni. I turni disabilitati non appariranno come opzione nel form pubblico.

### Implementazione

**1. Impostazioni (`src/pages/Impostazioni.tsx`)**
- Aggiungere una nuova Card "Turni Preiscrizione" con checkbox per ciascun turno: `4^ Elementare`, `5^ Elementare`, `1^ Media`, `2^ Media`, `3^ Media`
- Il valore viene salvato in `site_settings` con chiave `preiscrizione_turni_attivi` come JSON array (es. `["4^ Elementare","1^ Media"]`)
- Di default tutti i turni sono attivi (se la setting non esiste)

**2. Modulo Preiscrizione (`src/pages/public/PreiscrizioneCupav.tsx`)**
- Leggere la setting `preiscrizione_turni_attivi` da `useSiteSettings()` (già importato)
- Filtrare la costante `TURNI` mostrando solo quelli presenti nella setting (o tutti se la setting non esiste)
- Se il turno selezionato viene disabilitato, il campo si resetta

### Nessuna modifica al database
Si usa la tabella `site_settings` già esistente con una nuova chiave.

