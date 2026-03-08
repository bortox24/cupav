

## Piano: Modulo Staff Pubblico + Evoluzione Anagrafica in "Anagrafica Staff"

### Panoramica
1. Aggiungere colonna `ruolo` alla tabella `animatori` (+ campi allergie/patologie/farmaci)
2. Creare pagina pubblica `/modulo-staff` per la registrazione di Animatori, Cuochi e Responsabili di campo
3. Rinominare "Anagrafica Animatori" in "Anagrafica Staff" e aggiungere filtri per ruolo e turno assegnato
4. Aggiornare hook, drawer, card, TurnoPage e Home di conseguenza

### Database Migration

Aggiungere colonne alla tabella `animatori`:
- `ruolo` (text, default `'animatore'`) — valori: `animatore`, `cuoco`, `responsabile_campo`
- `cognome` (text, nullable) — per separare nome/cognome
- `ha_allergie` (boolean, default false)
- `allergie_dettaglio` (text, nullable)
- `patologie_dettaglio` (text, nullable)
- `farmaco_1_nome`, `farmaco_1_posologia` (text, nullable)
- `farmaco_2_nome`, `farmaco_2_posologia` (text, nullable)
- `farmaco_3_nome`, `farmaco_3_posologia` (text, nullable)

RLS: insert pubblico (come per iscrizioni) per permettere l'invio del modulo senza autenticazione.

### Nuova pagina pubblica `src/pages/public/ModuloStaff.tsx`
- Stile coerente con IscrizioneCampeggio (logo, progress bar, card)
- Campi: Nome, Cognome (con capitalize parser), Data di nascita (DatePicker con selettore anno), Email, Telefono, sezione allergie/patologie (come iscrizione ragazzi), Ruolo (Select: Animatore / Cuoco / Responsabile di campo)
- On submit: insert in `animatori` con `full_name = "Cognome Nome"`, ruolo, campi medici
- Messaggio di conferma post-invio

### Aggiornamento `src/pages/AnagraficaAnimatori.tsx` → "Anagrafica Staff"
- Cambiare titolo in "Anagrafica Staff"
- Aggiungere **filtro ruolo** (Select: Tutti / Animatore / Cuoco / Responsabile di campo)
- Aggiungere **filtro turno** (Select con turni disponibili + "Tutti")
- Card: mostrare badge ruolo con colore diverso per tipo
- Drawer: mostrare campi medici (allergie, patologie, farmaci) e ruolo

### Aggiornamento `src/hooks/useAnimatori.ts`
- Estendere interfaccia `Animatore` con i nuovi campi (ruolo, ha_allergie, allergie_dettaglio, etc.)
- Aggiornare mutations per includere ruolo e campi medici

### Aggiornamento `src/pages/TurnoPage.tsx`
- Nella tab Animatori, mostrare badge ruolo accanto al nome

### Aggiornamento routing e navigazione
- `src/App.tsx`: aggiungere route pubblica `/modulo-staff`
- `src/pages/Home.tsx`: aggiornare label card da "Anagrafica Animatori" a "Anagrafica Staff"
- `src/hooks/usePagePermissions.ts`: rinominare label pagina
- `src/pages/public/ModuloStaff.tsx`: link in site_settings opzionale (toggle attivo/disattivo come iscrizioni)

### File coinvolti
- 1 migrazione DB (nuove colonne + policy insert anon)
- `src/pages/public/ModuloStaff.tsx` (nuovo)
- `src/hooks/useAnimatori.ts` (aggiornamento interfacce e mutations)
- `src/pages/AnagraficaAnimatori.tsx` (filtri ruolo/turno, badge ruolo, campi medici nel drawer)
- `src/pages/TurnoPage.tsx` (badge ruolo)
- `src/App.tsx` (nuova route)
- `src/pages/Home.tsx` (label aggiornata)
- `src/hooks/usePagePermissions.ts` (label aggiornata)

