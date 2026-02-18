

## Gestione Pagamenti - Piano di implementazione

### Panoramica
Creare una nuova pagina "Gestione Pagamenti" che mostra card compatte per ogni iscrizione (dalla tabella `iscrizioni`), con stato pagamento (Pagato / Parziale / Da pagare) e arricchimento dati nell'Anagrafica Ragazzi incrociando i dati delle iscrizioni e pre-iscrizioni.

---

### 1. Database: nuova tabella `pagamenti`

Creare una tabella per tracciare lo stato di pagamento per ogni iscrizione:

```text
pagamenti
- id (uuid, PK)
- iscrizione_id (uuid, FK -> iscrizioni.id, UNIQUE)
- stato: 'da_pagare' | 'parziale' | 'pagato'  (default: 'da_pagare')
- note (text, nullable) -- per importo parziale
- updated_by (uuid, nullable)
- created_at, updated_at (timestamps)
```

RLS: solo utenti autenticati con permesso alla pagina `/gestione-pagamenti` o admin possono leggere/scrivere.

---

### 2. Arricchimento Anagrafica Ragazzi

Creare una funzione backend (edge function) che, dato un ragazzo, cerca nelle tabelle `iscrizioni` e `ragazzi_genitori` tutti i dati disponibili e li unifica con logica AI (Lovable AI - Gemini Flash) per:
- Normalizzare i nomi genitori (es. "Marco Bortolamai" vs "Bortolamai Marco" vengono riconosciuti come stessa persona)
- Unire email e telefoni trovati sia nelle iscrizioni che nelle pre-iscrizioni
- Aggiornare la tabella `ragazzi_genitori` con i dati arricchiti

Nella pagina Anagrafica Ragazzi, aggiungere un bottone "Arricchisci dati" che lancia questo processo per il ragazzo selezionato (o in batch per tutti).

---

### 3. Nuova pagina: `/gestione-pagamenti`

**UI e funzionalita:**

- Griglia di card compatte (stile simile a TurnoPage) con:
  - Nome e cognome ragazzo
  - Nome genitori (dal cross-reference iscrizioni + ragazzi_genitori)  
  - Turno di iscrizione
  - Stato pagamento con radio button: Pagato / Parziale / Da pagare
  - Campo note visibile solo se "Parziale" selezionato

- Colore card in base allo stato:
  - Verde (sfondo leggero) = Pagato
  - Giallo/Ambra = Parziale
  - Rosso = Da pagare (default)

- Filtri: ricerca per nome, filtro per turno, filtro per stato pagamento

- I dati vengono dalla tabella `iscrizioni` (solo iscrizioni formali, non pre-iscrizioni). Al primo caricamento, se non esiste un record in `pagamenti` per una iscrizione, viene creato automaticamente con stato "da_pagare".

---

### 4. Routing e permessi

- Aggiungere rotta `/gestione-pagamenti` in App.tsx (protetta)
- Aggiungere pagina nell'elenco `availablePages` in usePagePermissions
- Aggiungere card in Home.tsx per accesso rapido
- Permesso pagina configurabile dall'admin tramite Permessi Pagine

---

### 5. Dettagli tecnici

**File da creare:**
- `src/pages/GestionePagamenti.tsx` - pagina principale
- `src/hooks/usePagamenti.ts` - hook per CRUD pagamenti
- `supabase/functions/enrich-anagrafica/index.ts` - edge function per arricchimento dati AI

**File da modificare:**
- `src/App.tsx` - aggiungere rotta
- `src/pages/Home.tsx` - aggiungere card accesso rapido
- `src/hooks/usePagePermissions.ts` - aggiungere pagina nell'elenco
- `src/pages/AnagraficaRagazzi.tsx` - aggiungere bottone arricchimento dati

**Migrazione DB:**
- Creare tabella `pagamenti` con RLS
- Creare enum o check per stato pagamento

**Flusso dati della card:**
1. Query `iscrizioni` per tutti i record
2. LEFT JOIN con `pagamenti` per stato
3. Cross-reference con `ragazzi` + `ragazzi_genitori` per nomi genitori arricchiti
4. Cambio stato pagamento -> upsert in `pagamenti`

