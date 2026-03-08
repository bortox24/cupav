

## Piano: Log attivita' staff + accesso completo per tutti gli utenti della pagina

### 1. Nuova tabella `staff_activity_logs`

Migrazione SQL:

```sql
CREATE TABLE public.staff_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  animatore_id uuid NOT NULL,
  azione text NOT NULL,        -- 'turno_assegnato', 'turno_rimosso', 'ruolo_cambiato', 'dati_modificati', 'account_creato', 'archiviato', 'ripristinato'
  dettaglio text,              -- es. "Turno: 1° Media" o "Ruolo: cuoco → animatore"
  eseguito_da uuid NOT NULL,
  eseguito_da_nome text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.staff_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can select staff_activity_logs"
  ON public.staff_activity_logs FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can insert staff_activity_logs"
  ON public.staff_activity_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
```

### 2. Rimuovere restrizione `isAdmin` — accesso completo per tutti

Nell'intero `AnagraficaAnimatori.tsx`, sostituire tutti i check `isAdmin` con accesso aperto (chiunque abbia accesso alla pagina puo' modificare, assegnare turni, creare account, ecc.):

- Riga 184: `canCreateAccount` — rimuovere `isAdmin &&`
- Riga 286: pulsante rimuovi turno — rimuovere `{isAdmin && ...}`
- Riga 296: assegna turno — rimuovere `{isAdmin && ...}`
- Riga 327: azioni (modifica/archivia/elimina/crea account) — rimuovere `{isAdmin && ...}`
- Riga 635: pulsante "Nuovo" — rimuovere `{isAdmin && ...}`

### 3. Edge function — rimuovere check admin

In `create-staff-account/index.ts` righe 57-64: rimuovere il blocco che verifica `roleData?.role !== 'admin'`. Lasciare solo la verifica che il chiamante sia autenticato.

### 4. Inserire log per ogni azione

Nel drawer `AnimatoreDrawer`, dopo ogni operazione con successo, inserire una riga in `staff_activity_logs`:

| Azione | `azione` | `dettaglio` |
|--------|----------|-------------|
| Salva modifica dati | `dati_modificati` | Campi modificati |
| Cambio ruolo (dentro saveEdit) | `ruolo_cambiato` | `"Da X a Y"` |
| Assegna turno | `turno_assegnato` | `"Turno: 1° Media"` |
| Rimuovi turno | `turno_rimosso` | `"Turno: 1° Media"` |
| Archivia/Ripristina | `archiviato` / `ripristinato` | — |
| Crea account | `account_creato` | `"Email: xxx"` |

Helper function per inserire il log:
```typescript
const insertLog = async (azione: string, dettaglio?: string) => {
  await supabase.from('staff_activity_logs' as any).insert({
    animatore_id: animatore.id,
    azione,
    dettaglio: dettaglio || null,
    eseguito_da: user.id,
    eseguito_da_nome: profile?.full_name || 'Utente',
  });
  queryClient.invalidateQueries({ queryKey: ['staff-logs', animatore.id] });
};
```

### 5. Mostrare log nel drawer

Stile identico ad AnagraficaRagazzi: sezione "Log attivita'" con badge colorato per tipo azione, nome utente, data `dd-MM-yyyy HH:mm`.

Badge colori per tipo:
- `turno_assegnato` → verde
- `turno_rimosso` → rosso
- `ruolo_cambiato` → viola
- `dati_modificati` → blu
- `account_creato` → emerald
- `archiviato` / `ripristinato` → amber

### File modificati
- **Migrazione SQL**: nuova tabella `staff_activity_logs`
- **`supabase/functions/create-staff-account/index.ts`**: rimuovere check admin
- **`src/pages/AnagraficaAnimatori.tsx`**: rimuovere tutti i check `isAdmin`, aggiungere log insert dopo ogni azione, aggiungere sezione log nel drawer

