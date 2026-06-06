## Obiettivo

Limitare ulteriormente gli **account staff** in base al **ruolo** assegnato nella card di Anagrafica Staff (campo `ruolo` della tabella `animatori`):

- Ruolo **`animatore`** (Animatore): vede Home, Regolamento e, **dentro il turno assegnato**, solo le tab **Appello**, **Tende** e **Download lista** (già limitata a Nome, Cognome, Data di nascita). Le tab **Dettagli ragazzi** e **Staff** vengono nascoste.
- Ruoli **`cuoco`**, **`responsabile_campo`**, **`responsabile_animatori`**: nessuna nuova restrizione, vedono tutto il turno come adesso.
- Admin e utenti reali: nessun cambiamento.

## Come ricavare il ruolo in modo sicuro

Gli account staff hanno una riga in `staff_accounts` con `animatore_id` che punta alla riga `animatori`. Le policy non consentono allo staff di leggere `animatori` direttamente, quindi serve una funzione lato database `security definer`.

### 1. Database
Creare la funzione:

```text
public.my_staff_ruolo() -> text
```

che, per `auth.uid()`, trova la riga in `staff_accounts`, fa join con `animatori` su `id = animatore_id` e restituisce `ruolo` (NULL se non è un account staff). `STABLE SECURITY DEFINER`, `search_path = public`.

### 2. Pagina Turno (`src/pages/TurnoPage.tsx`)

- Aggiungere una query RPC a `my_staff_ruolo()` per ottenere il ruolo dell'utente corrente.
- Calcolare un flag, es. `isAnimatoreLimitato = isStaffAccount && !isAdmin && ruolo === 'animatore'`.
- Quando `isAnimatoreLimitato` è true:
  - Nascondere i pulsanti tab **Dettagli ragazzi** e **Staff** (rendering condizionale dei due `<Button>`).
  - Impostare la tab iniziale di default su `'appello'` invece di `'dettagli'`.
  - Proteggere il rendering dei blocchi `activeTab === 'dettagli'` e `activeTab === 'animatori'` in modo che non vengano mostrati anche se lo stato venisse forzato.
- Le tab **Appello**, **Tende** e **Download lista** restano visibili; il Download lista mantiene la restrizione campi già esistente (`restrictFields`).
- Per cuoco / responsabili: il flag è false, quindi tutto resta invariato.

## Dettagli tecnici

```sql
CREATE OR REPLACE FUNCTION public.my_staff_ruolo()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT a.ruolo
  FROM public.staff_accounts sa
  JOIN public.animatori a ON a.id = sa.animatore_id
  WHERE sa.user_id = auth.uid()
  LIMIT 1
$$;
```

Nel componente: nuova query React Query (come quella `is-staff-account`), flag derivato, rendering condizionale delle tab e guardia sul contenuto.

## Nota
La restrizione è a livello di interfaccia (come l'attuale limitazione campi). I dati grezzi restano accessibili tramite le query esistenti regolate da RLS; se serve nascondere i dati anche a livello DB occorrerà un intervento separato sulle policy.