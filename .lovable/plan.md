

## Piano: Creazione automatica account staff dall'Anagrafica

### Obiettivo
Aggiungere un pulsante "Crea account" nel drawer di ogni animatore (che ha un'email). Cliccando, il sistema:
1. Crea un utente con password temporanea
2. Assegna automaticamente i permessi turno in base ai turni gia' assegnati all'animatore
3. L'animatore potra' accedere e vedere **solo** i turni a cui e' assegnato

### Implementazione

#### 1. Nuova edge function `create-staff-account`
Nuova funzione (o estensione di `create-user`) che:
- Riceve: `email`, `fullName`, `turni` (array di stringhe turno)
- Crea l'utente con `admin.createUser` + password generata (8 caratteri random)
- Inserisce i permessi turno nella tabella `turno_permessi` per ogni turno assegnato
- **Non** assegna permessi pagina aggiuntivi (lo staff vedra' solo le pagine turno `/turno/:slug`)
- Ritorna la password temporanea per poterla comunicare all'animatore

#### 2. UI nel drawer `AnagraficaAnimatori.tsx`
- Nel drawer dell'animatore, aggiungere un pulsante **"Crea account"** visibile solo se:
  - L'utente corrente e' admin
  - L'animatore ha un'email compilata
  - L'animatore ha almeno un turno assegnato nell'anno corrente
- Al click: dialog di conferma che mostra email e turni che verranno assegnati
- Dopo la creazione: dialog con la password temporanea da comunicare all'animatore
- Se l'account esiste gia' (email duplicata), mostrare errore chiaro

#### 3. Flusso completo
```text
Admin apre drawer animatore
  → Vede pulsante "Crea account" 
  → Click → Dialog conferma (email + turni)
  → Conferma → Edge function crea utente + permessi turno
  → Mostra password temporanea da comunicare
```

### Dettagli tecnici

- **Edge function**: `supabase/functions/create-staff-account/index.ts`
  - Verifica che il chiamante sia admin (stessa logica di `create-user`)
  - Genera password random sicura
  - Crea utente con `email_confirm: true`
  - Inserisce righe in `turno_permessi` per ogni turno
  - Ritorna `{ password, userId }`

- **Frontend**: Modifica `src/pages/AnagraficaAnimatori.tsx`
  - Nuovo pulsante nel drawer con icona `UserPlus`
  - Dialog conferma + dialog risultato con password copiabile
  - Chiamata via `supabase.functions.invoke('create-staff-account', ...)`

### File modificati/creati
- `supabase/functions/create-staff-account/index.ts` — nuova edge function
- `supabase/config.toml` — aggiunta config per la nuova function (verify_jwt = false)
- `src/pages/AnagraficaAnimatori.tsx` — pulsante "Crea account" nel drawer

