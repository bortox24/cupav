

## Piano: Pagina Anagrafica Animatori + Tab Animatori nei Turni

### Panoramica
1. Nuova tabella `animatori` per i dati degli animatori
2. Nuova tabella `animatori_turni` per l'assegnazione animatori ai turni (con conferma)
3. Nuova pagina `/anagrafica-animatori` con card stile AnagraficaRagazzi
4. Nuova tab "Animatori" nelle pagine `/turno/:slug` che mostra gli animatori assegnati a quel turno
5. Integrazione nel sistema permessi pagine

### Database

**Tabella `animatori`**:
- `id` (uuid, PK)
- `full_name` (text, NOT NULL)
- `email` (text, nullable)
- `telefono` (text, nullable)
- `data_nascita` (text, nullable)
- `note` (text, nullable)
- `archiviato` (boolean, default false)
- `created_at`, `updated_at` (timestamps)
- RLS: admin o chi ha accesso a `/anagrafica-animatori` può CRUD; lettura anche per chi ha accesso ai turni

**Tabella `animatori_turni`** (assegnazione ai turni):
- `id` (uuid, PK)
- `animatore_id` (uuid, FK -> animatori)
- `turno` (text, NOT NULL) — es. "4° Elementare"
- `anno` (integer, default anno corrente)
- `assegnato_da` (uuid, nullable)
- `created_at` (timestamp)
- RLS: admin o chi ha accesso a `/anagrafica-animatori` può insert/delete; lettura per utenti autenticati

### Nuova pagina `src/pages/AnagraficaAnimatori.tsx`
- Stile identico ad AnagraficaRagazzi: griglia di card con ricerca, filtro archiviati
- Drawer dettaglio con modifica dati, aggiunta/rimozione turni
- **Assegnazione turno con AlertDialog di conferma** ("Sei sicuro di voler assegnare [nome] al turno [turno]?")
- Possibilità di creare manualmente un animatore (in attesa del modulo futuro)

### Nuovo hook `src/hooks/useAnimatori.ts`
- Query animatori + join animatori_turni
- Mutations: add, update, archive, delete animatore
- Mutations: assign/remove turno (con invalidazione cache)

### Modifica `src/pages/TurnoPage.tsx`
- Aggiungere tab "Animatori" (icona UserPlus, gia importata) dopo "Tende"
- Query `animatori_turni` filtrata per turno corrente, join con `animatori`
- Lista card degli animatori assegnati a quel turno con nome, telefono, email

### Modifiche ai file esistenti
- **`src/hooks/usePagePermissions.ts`**: aggiungere `/anagrafica-animatori`
- **`src/App.tsx`**: nuova route protetta `/anagrafica-animatori`
- **`src/pages/Home.tsx`**: aggiungere card accesso rapido "Anagrafica Animatori"

### File coinvolti
- `src/pages/AnagraficaAnimatori.tsx` (nuovo)
- `src/hooks/useAnimatori.ts` (nuovo)
- `src/pages/TurnoPage.tsx` (aggiunta tab Animatori)
- `src/hooks/usePagePermissions.ts`
- `src/App.tsx`
- `src/pages/Home.tsx`
- 1 migrazione DB (2 tabelle + RLS + realtime)

