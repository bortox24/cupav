

## Nuove funzionalita per le pagine Turno

### Panoramica
Aggiungere 3 pulsanti di navigazione (tab) nelle pagine `/turno/...` tra l'header e la sezione filtri: **Dettagli ragazzi**, **Appello**, **Download lista**. Ogni pulsante cambia il contenuto visualizzato.

---

### 1. Database - Nuova tabella `appello_logs`

Creare una tabella per salvare i log degli appelli:

| Colonna | Tipo | Note |
|---------|------|------|
| id | uuid | PK |
| turno | text | Valore del turno (es. "4deg Elementare") |
| effettuato_da | uuid | ID utente che ha fatto l'appello |
| effettuato_da_nome | text | Nome completo del profilo |
| presenti | integer | Numero presenti |
| totale | integer | Numero totale ragazzi |
| created_at | timestamptz | Data/ora dell'appello |

RLS: tutti gli utenti autenticati possono leggere e inserire (coerente con i permessi esistenti sulle iscrizioni). Nessuno puo eliminare o aggiornare i log.

Abilitare realtime sulla tabella per sincronizzare i log tra utenti.

---

### 2. Pulsanti Tab (UI)

Aggiungere uno stato `activeTab` con 3 valori: `dettagli` (default), `appello`, `download-lista`.

3 pulsanti stilizzati come tab pills subito dopo il titolo, prima dei filtri. Il pulsante attivo avra variante `default`, gli altri `outline`.

---

### 3. Tab "Dettagli ragazzi"

Nessuna modifica: mostra la pagina attuale con filtri, ricerca e card dettagliate.

---

### 4. Tab "Appello"

- Card semplificate: solo nome e cognome del ragazzo centrato, testo grande.
- Stato locale `presentSet` (Set di ID): di default tutte le card sono rosse.
- Click su una card: diventa verde (aggiunta al Set), click di nuovo: torna rossa.
- Nessun filtro/ricerca visibile in questa tab.
- In fondo: pulsante "Concludi appello" che mostra un banner/dialog di conferma con "Presenti X/Y".
- Alla conferma: inserisce un record nella tabella `appello_logs` e resetta tutte le card a rosse.
- Sotto il pulsante: lista dei log precedenti per quel turno, con formato: nome profilo, data `dd-MM-yyyy, HH.mm`, e "Presenti X/Y".

---

### 5. Tab "Download lista"

- Click sul pulsante scarica direttamente un PDF.
- Generazione PDF client-side con `jspdf` e `jspdf-autotable`.
- 3 colonne: Nome e Cognome ragazzo | Nome e Cognome genitore | Telefono.
- Il download parte immediatamente al click del tab (oppure si mostra un'anteprima con pulsante download).

---

### Dettagli tecnici

**Dipendenze da aggiungere:**
- `jspdf` e `jspdf-autotable` per generazione PDF client-side

**File modificati:**
- `src/pages/TurnoPage.tsx` - Aggiunta tabs, vista Appello, logica download PDF, sezione log
- Migrazione SQL per creare la tabella `appello_logs` con RLS

**Migrazione SQL:**
```text
CREATE TABLE public.appello_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  turno text NOT NULL,
  effettuato_da uuid NOT NULL,
  effettuato_da_nome text NOT NULL,
  presenti integer NOT NULL,
  totale integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.appello_logs ENABLE ROW LEVEL SECURITY;

-- Chiunque autenticato puo leggere
CREATE POLICY "Authenticated can select appello_logs"
  ON public.appello_logs FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Chiunque autenticato puo inserire
CREATE POLICY "Authenticated can insert appello_logs"
  ON public.appello_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Nessuna policy per UPDATE/DELETE (log immutabili)

ALTER PUBLICATION supabase_realtime ADD TABLE public.appello_logs;
```

