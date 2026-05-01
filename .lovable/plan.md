## Obiettivo
Avere un solo permesso "Turno Famiglie" nella pagina Permessi (sezione Turni). Quando attivato, l'utente accede automaticamente sia ai dati delle iscrizioni famiglie sia alle pagine dedicate (`/turno-famiglie` e `/anagrafica-turno-famiglie`).

## Modifiche

### 1. `src/hooks/usePagePermissions.ts`
Rimuovere le due voci appena aggiunte:
- `/turno-famiglie`
- `/anagrafica-turno-famiglie`

In questo modo non compaiono più nella sezione "Pagine" della tabella permessi.

### 2. `src/hooks/usePagePermissions.ts` → `useMyPagePermissions.canAccessPage`
Estendere la logica: se la pagina richiesta è `/turno-famiglie` o `/anagrafica-turno-famiglie`, restituire `true` quando l'utente ha il permesso del turno `Turno famiglie` (lettura da `turno_permessi` via nuovo hook combinato, oppure leggendo direttamente la tabella).

Implementazione semplice: aggiungere una query a `turno_permessi` dentro `useMyPagePermissions` (o usare `useMyTurnoPermissions`) e nel `canAccessPage`:
```ts
if (pagePath === '/turno-famiglie' || pagePath === '/anagrafica-turno-famiglie') {
  return turnoPerms.some(p => p.turno === 'Turno famiglie');
}
```

### 3. RLS database (migrazione)
Aggiornare le policy delle tabelle `iscrizioni_famiglie` e `pagamenti_famiglie` (se serve) per usare anche `has_turno_access(auth.uid(), 'Turno famiglie')` invece del semplice `auth.uid() IS NOT NULL`, così solo chi ha il permesso turno vede i dati famiglie.

Attualmente `iscrizioni_famiglie` permette SELECT/UPDATE/DELETE a qualsiasi utente autenticato — va ristretto a:
```sql
is_admin() OR has_turno_access(auth.uid(), 'Turno famiglie')
```

### 4. Sidebar / Home
Verificare che i link a "Turno Famiglie" e "Anagrafica Turno Famiglie" usino il nuovo controllo (passa già da `canAccessPage`, quindi nessuna modifica necessaria se il punto 2 è fatto bene).

## Risultato
Nella pagina Permessi resterà **un'unica casella "Turno Famiglie"** sotto la sezione Turni, accanto agli altri turni (4° Elementare, 1° Media, ecc.). Spuntandola, l'utente:
- vede le pagine Turno Famiglie e Anagrafica Turno Famiglie
- può leggere/modificare i dati delle iscrizioni famiglie

Coerente con come funzionano gli altri turni del campeggio.