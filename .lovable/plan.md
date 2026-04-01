

## Piano: Correzione vulnerabilità di sicurezza RLS

### Problema
Alcune tabelle espongono dati sensibili (minori, genitori) al ruolo `anon` tramite policy SELECT/UPDATE troppo permissive. Il form pubblico di preiscrizione necessita di accesso anon solo per il controllo duplicati e l'inserimento dati.

### Approccio
Sostituire le policy anon broad con una **funzione SECURITY DEFINER** per il controllo duplicati, e rimuovere tutte le policy anon SELECT/UPDATE non necessarie. Spostare la logica di duplicate-check nel backend.

### Modifiche

**1. Nuova edge function `check-duplicate-ragazzo`**
- Riceve `{ full_name: string, anno: number }`
- Usa service role per fare la query su `ragazzi` + `ragazzi_iscrizioni`
- Restituisce `{ exists: boolean }`
- `verify_jwt = false` (accessibile da form pubblico)

**2. Migrazioni DB — rimozione policy anon pericolose**

| Tabella | Policy da rimuovere | Motivo |
|---------|---------------------|--------|
| `ragazzi` | `Anon can select ragazzi for duplicate check` | Espone tutti i dati dei minori |
| `ragazzi_genitori` | `Anon can select genitori` | Espone contatti genitori |
| `ragazzi_genitori` | `Anon can update genitori` | Permette modifica dati da chiunque |
| `ragazzi_iscrizioni` | `Anon can select iscrizioni` | Espone iscrizioni |
| `ragazzi_iscrizioni` | `Anyone can update iscrizioni` | Permette modifica iscrizioni da chiunque |

Le policy di INSERT anon restano (servono per il form pubblico).

**3. Tabella `tende` — restrizione DELETE/UPDATE ad admin**
- Sostituire le policy `Authenticated can delete/update tende` con policy che richiedono `is_admin()`.

**4. Aggiornare `PreiscrizioneCupav.tsx`**
- Sostituire la query diretta su `ragazzi` con una chiamata alla nuova edge function `check-duplicate-ragazzo`.

**5. Aggiornare `useRagazzi.ts` — `submitPreiscrizione`**
- La funzione fa query anon su `ragazzi` per trovare duplicati e update su `ragazzi_genitori`. Queste operazioni avvengono da form pubblico (utente non autenticato).
- Creare una seconda edge function `submit-preiscrizione` che gestisce tutto server-side con service role: check duplicato, insert/update ragazzo, insert genitori, insert iscrizione.
- Oppure: spostare la logica di update dentro la edge function `check-duplicate-ragazzo` ampliandola a `handle-preiscrizione`.

**Scelta consigliata**: una singola edge function `handle-preiscrizione` che:
1. Riceve tutti i dati del form
2. Controlla duplicati con service role
3. Inserisce/aggiorna ragazzo, genitori, iscrizione
4. Restituisce successo/errore

Questo elimina completamente la necessità di policy anon su SELECT/UPDATE.

### Riepilogo impatto

| Cosa | Prima | Dopo |
|------|-------|------|
| Dati minori (ragazzi) | Leggibili da chiunque | Solo utenti autenticati con permesso |
| Contatti genitori | Leggibili/modificabili da chiunque | Solo utenti autenticati con permesso |
| Iscrizioni | Leggibili/modificabili da chiunque | Solo utenti autenticati con permesso |
| Form preiscrizione | Funziona con query dirette anon | Funziona tramite edge function server-side |
| Tende DELETE/UPDATE | Qualsiasi utente autenticato | Solo admin |
| Funzionalità per utenti loggati | Invariata | Invariata (stesse policy authenticated) |

### File coinvolti
- **Nuovo**: `supabase/functions/handle-preiscrizione/index.ts`
- **Modifica**: `src/pages/public/PreiscrizioneCupav.tsx` — usa edge function invece di query dirette
- **Modifica**: `src/hooks/useRagazzi.ts` — `submitPreiscrizione` chiama edge function
- **Modifica**: `supabase/config.toml` — aggiunta config per nuova function
- **Migrazione DB**: rimozione 5 policy anon + sostituzione 2 policy tende

