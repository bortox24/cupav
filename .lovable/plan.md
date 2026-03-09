

## Piano: Log numero più dettagliato

### Problema
I log per le modifiche al numero non mostrano i dettagli (quale numero è stato assegnato, da quale a quale è stato cambiato, quale è stato rimosso).

### Soluzione

**1. Aggiungere colonna `dettaglio` alla tabella `anagrafica_invio_logs`**
- Nuova colonna `dettaglio text nullable` (default null)
- Migrazione SQL

**2. Popolare `dettaglio` nell'insert del log** (`AnagraficaRagazzi.tsx`, riga 58)
- `numero_assegnato`: `"Numero 7 assegnato"`
- `numero_modificato`: `"Numero cambiato da 5 a 12"`
- `numero_rimosso`: `"Numero 5 rimosso"`

**3. Mostrare `dettaglio` nel Drawer dei log** (riga ~497)
- Sotto o accanto al badge, mostrare `log.dettaglio` se presente, come testo secondario

### File modificati
- Migrazione SQL (nuova colonna `dettaglio`)
- `src/pages/AnagraficaRagazzi.tsx` — insert del log + rendering nel Drawer

