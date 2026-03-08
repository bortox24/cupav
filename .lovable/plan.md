

## Piano: Rimuovere "Resp. Animatori" dal modulo pubblico + Gestione ruolo da Anagrafica Staff

### Cosa cambia

1. **`src/pages/public/ModuloStaff.tsx`** — Rimuovere `responsabile_animatori` dall'array `RUOLI` (riga 38). Lo staff pubblico potrà scegliere solo: Animatore, Cuoco, Responsabile di campo.

2. **`src/pages/AnagraficaAnimatori.tsx`** — Il ruolo "Responsabile animatori" resta selezionabile solo qui (drawer modifica, form aggiunta, filtro), dove solo gli utenti autorizzati possono assegnarlo. Nessuna modifica necessaria a questa pagina.

### File modificati
- `src/pages/public/ModuloStaff.tsx` — rimuovere una riga dall'array RUOLI

