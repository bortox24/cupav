

# Sezioni Turni in Home + Permessi Turno

## Panoramica

Aggiunta di 5 sezioni accordion nella Home per visualizzare i ragazzi iscritti per turno, con controllo permessi granulare tramite una nuova tabella `turno_permessi`. La pagina "Permessi Pagine" viene estesa con 5 nuove colonne per gestire i permessi turno.

---

## 1. Nuova tabella: `turno_permessi`

Nuova tabella nel database con:
- `id` (uuid, primary key, auto)
- `user_id` (uuid, NOT NULL)
- `turno` (text, NOT NULL) -- uno dei 5 valori turno
- `created_at` (timestamptz, default now())
- `assegnato_da` (uuid, nullable)
- UNIQUE constraint su (user_id, turno)

RLS:
- SELECT: utente autenticato puo' leggere solo le proprie righe (`user_id = auth.uid()`)
- SELECT per admin: admin puo' leggere tutte le righe (per la pagina Permessi Pagine)
- INSERT/DELETE: solo admin (`is_admin()`)

---

## 2. Nuovo hook: `useTurnoPermissions`

File: `src/hooks/useTurnoPermissions.ts`

Contiene:
- `useMyTurnoPermissions()` -- legge i turni accessibili per l'utente corrente
- `useAllTurnoPermissions()` -- admin: legge tutti i permessi turno di tutti gli utenti
- `useSetTurnoPermission()` -- admin: INSERT un permesso turno
- `useRemoveTurnoPermission()` -- admin: DELETE un permesso turno
- `useResetUserTurnoPermissions()` -- admin: DELETE tutti i permessi turno di un utente
- Costante `TURNI` con i 5 nomi turno e le relative label per la UI

---

## 3. Modifiche alla Home (`src/pages/Home.tsx`)

Dopo la sezione "Accesso rapido", aggiunta di una nuova sezione visibile SOLO agli utenti autenticati contenente 5 accordion (uno per turno).

Ogni accordion:
- **Titolo**: nome turno (es. "4^ Elementare") + contatore "X ragazzi iscritti"
- **Se l'utente NON ha il permesso**: accordion chiuso, non espandibile, messaggio "Non hai i permessi per visualizzare questo turno."
- **Se l'utente HA il permesso**: accordion aperto di default con lista card dei ragazzi
- **Admin**: ha sempre accesso a tutti i turni

Ogni card ragazzo mostra:
- Nome e Cognome (grassetto)
- Data di nascita, Comune, Recapito telefonico
- Genitore/Tutore con email
- Badge allergie (rosso con dettagli o verde "Nessuna allergia")
- Farmaci (se compilati)
- Liberatoria foto (Si/No)
- Data iscrizione

Dati caricati dalla tabella `iscrizioni` filtrati per campo `turno`.
Aggiornamento in tempo reale tramite Realtime sulla tabella `iscrizioni`.
Il contatore e' una query separata che conta per tutti i turni indipendentemente dai permessi.

---

## 4. Modifiche a Permessi Pagine (`src/pages/AdminPermessiPagine.tsx`)

Aggiunta di 5 nuove colonne nella tabella esistente, DOPO le colonne pagine e PRIMA della colonna "Azioni":
- "4^ Elementare", "5^ Elementare", "1^ Media", "2^ Media", "3^ Media"

Ogni cella contiene una checkbox (stesso stile delle esistenti):
- Checked = esiste record in `turno_permessi` per quell'utente e turno
- Click attiva: INSERT in `turno_permessi`
- Click disattiva: DELETE da `turno_permessi`
- Toast di conferma con nome permesso e utente

Il bottone "Reset" esistente viene esteso per cancellare anche i record in `turno_permessi` per quell'utente.

---

## Dettaglio tecnico

### File da creare
1. `src/hooks/useTurnoPermissions.ts` -- hook per gestione permessi turno

### File da modificare
1. `src/pages/Home.tsx` -- aggiunta sezione accordion turni
2. `src/pages/AdminPermessiPagine.tsx` -- aggiunta 5 colonne turno + estensione reset

### Migrazione database
- CREATE TABLE `turno_permessi` con constraint e RLS
- ALTER PUBLICATION `supabase_realtime` ADD TABLE `iscrizioni` (per realtime)

### Logica chiave
- I contatori turno usano una query con `.select('turno', { count: 'exact' })` raggruppata, accessibile a tutti gli autenticati
- I dettagli ragazzi vengono caricati solo per i turni a cui l'utente ha accesso
- L'admin ha accesso implicito a tutti i turni senza record in `turno_permessi`
- La RLS su `turno_permessi` usa `is_admin()` per INSERT/DELETE e permette SELECT sia per le proprie righe che per admin

