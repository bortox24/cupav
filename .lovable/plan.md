

# Trasporre la tabella Permessi Pagine

## Cosa cambia

La tabella nella pagina "Permessi Pagine" viene trasposta: le **righe** diventano le pagine e i turni, le **colonne** diventano gli utenti. Questo rende la tabella piu' facile da navigare, specialmente con molte pagine/turni.

## Layout della nuova tabella

```text
                  | Utente 1  | Utente 2  | Utente 3  | ...
------------------+-----------+-----------+-----------+----
  PAGINE          |           |           |           |
  Home            |  [x]      |  [ ]      |  [x]      |
  Anagrafica      |  [ ]      |  [x]      |  [x]      |
  Controllo Spese |  [x]      |  [ ]      |  [ ]      |
  ...             |           |           |           |
------------------+-----------+-----------+-----------+----
  TURNI           |           |           |           |
  4^ Elementare   |  [x]      |  [ ]      |  [x]      |
  5^ Elementare   |  [ ]      |  [x]      |  [ ]      |
  ...             |           |           |           |
------------------+-----------+-----------+-----------+----
  AZIONI          | [Reset]   | [Reset]   | [Reset]   |
```

- Prima colonna fissa: nome della pagina o del turno
- Colonne successive: una per ogni utente non-admin (nome + email nell'header)
- Sezione "Pagine" seguita da sezione "Turni", separate visivamente
- Ultima riga: bottoni "Reset" per ogni utente
- Gli utenti disattivati hanno le checkbox disabilitate e colonna con opacita' ridotta

## Dettaglio tecnico

### File da modificare
`src/pages/AdminPermessiPagine.tsx` -- riscrittura della struttura tabella

### Modifiche
- L'header della tabella avra': prima cella "Permesso", poi una cella per ogni utente non-admin (con nome e email)
- Le righe saranno: una per ogni pagina (displayPages), poi una riga separatore, poi una per ogni turno (TURNI), poi una riga finale con i bottoni Reset
- Tutta la logica esistente (handlePermissionChange, handleTurnoPermissionChange, handleResetUser) resta identica
- Si aggiunge una riga separatore visivo tra pagine e turni con un label "Turni" in grassetto
- Scroll orizzontale mantenuto per gestire molti utenti

