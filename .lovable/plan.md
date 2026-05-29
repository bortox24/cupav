## Obiettivo

1. Limitare il download delle liste per gli **account staff** (creati dalla pagina Anagrafica Staff): potranno scaricare solo **Nome, Cognome e Data di nascita**. Gli **utenti reali** e gli **admin** mantengono il download completo con tutti i campi e i filtri attuali.
2. Nel PDF, la **Data di nascita** deve essere sempre formattata in **giorno/mese/anno (dd/MM/yyyy)**, non anno-mese-giorno.

## Come distinguere staff da utente reale

Gli account staff hanno una riga nella tabella `staff_accounts` (collegata al loro `user_id`). Le policy attuali permettono di leggere quella tabella solo agli admin, quindi un account staff non può verificare il proprio stato direttamente. Serve quindi una funzione lato database che restituisca se l'utente corrente è un account staff.

## Passi

### 1. Database
- Creare la funzione `public.is_staff_account()` (security definer) che restituisce `true` se `auth.uid()` esiste in `staff_accounts`. Permette al client di sapere in modo sicuro se l'utente corrente è un account staff, senza esporre i dati della tabella.

### 2. Pagina Turno (`src/pages/TurnoPage.tsx`)

**Restrizione campi per staff**
- Chiamare la nuova funzione via RPC all'avvio per ottenere `isStaffAccount`.
- Campi consentiti agli staff:
  - Ragazzi: `cognome`, `nome`, `data_nascita`
  - Staff: `nome_cognome`, `data_nascita`
- Quando l'utente è account staff (e non admin): mostrare nella tab "Download lista" solo le checkbox dei campi consentiti (gli altri nascosti) e forzare i default coerenti.
- Utenti reali/admin: nessun cambiamento, tutti i campi e filtri restano disponibili.
- In `handleDownloadPDF` riapplicare il filtro di sicurezza che, per gli staff, esclude qualsiasi campo non consentito anche con stati manipolati.

**Formato Data di nascita nel PDF**
- Nelle funzioni `get` dei campi `data_nascita` (ragazzi e staff), formattare il valore in `dd/MM/yyyy` invece di restituire la stringa grezza (oggi `yyyy-MM-dd`).
- Usare una formattazione robusta: se il valore è già in formato data valido lo si converte in `dd/MM/yyyy`, altrimenti si lascia il testo originale (i campi `data_nascita` di staff/ragazzi sono `text` e potrebbero non essere sempre date ISO).

## Dettagli tecnici

```sql
CREATE OR REPLACE FUNCTION public.is_staff_account()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_accounts WHERE user_id = auth.uid()
  )
$$;
```

Nel componente:
```text
ALLOWED_RAGAZZI_STAFF = ['cognome','nome','data_nascita']
ALLOWED_STAFF_STAFF   = ['nome_cognome','data_nascita']
```
Helper di formattazione data (es.):
```text
formatDob(v) -> v ISO/Date valido ? format(date,'dd/MM/yyyy') : v
```
applicato nei `get` di `data_nascita` per ragazzi (`ragazzo_data_nascita`) e staff (`data_nascita`).

## Nota

La restrizione campi è lato interfaccia: i dati grezzi restano accessibili via le query esistenti (le policy RLS non cambiano). Se vuoi nascondere i campi sensibili anche a livello di dati servirà un intervento sulle policy/viste — fammelo sapere.