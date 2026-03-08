

## Piano: Limitare area cliccabile telefono/email nella tab Staff

### Problema
I link telefono ed email nella tab Staff delle pagine turno usano `flex` che li estende per tutta la larghezza della card. Cliccando ovunque sulla riga si attiva il link.

### Soluzione
Aggiungere `w-fit` ai tag `<a>` di telefono ed email (righe 1039-1045 e 1048-1054 di `TurnoPage.tsx`) così che l'area cliccabile sia limitata solo al testo e all'icona.

### Modifiche
**`src/pages/TurnoPage.tsx`** — 2 modifiche:
- Riga 1041: aggiungere `w-fit` alla classe del link telefono
- Riga 1050: aggiungere `w-fit` alla classe del link email

