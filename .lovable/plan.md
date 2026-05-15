## Obiettivo
Aggiungere un pulsante **Calendario** a sinistra di "Apri anagrafica completa" su entrambe le pagine Turno Famiglie e Montaggio Campeggio. Cliccandolo si apre un dialog con la lista dei giorni del turno e, per ogni giorno, il numero totale di persone presenti in campeggio.

## Componente condiviso

Creare `src/components/CalendarioPresenzeDialog.tsx`:

- Props: `open`, `onOpenChange`, `title`, `giorni: { key: string; label: string; date: Date }[]`, `presenzePerGiorno: Record<string, number>`, `colore: 'orange' | 'amber'`.
- Usa `Dialog` di shadcn (`max-w-lg`, `max-h-[85vh] overflow-y-auto`).
- Layout responsive: griglia `grid-cols-1 sm:grid-cols-2` di card per giorno con:
  - Data formattata in italiano (es. "Lunedì 3 agosto")
  - Conteggio grande con icona `Users`
  - Badge colorato gradient coerente con la pagina di provenienza
- Totale generale in fondo (somma persone-giorno).
- Stato vuoto se nessun giorno disponibile.

## Turno Famiglie (`src/pages/TurnoFamigliePage.tsx`)

- Aggiungere stato `calendarioOpen`.
- Calcolare con `useMemo`:
  - Range complessivo: min(data_inizio) → max(data_fine) di tutte le iscrizioni non archiviate.
  - Iterare ogni giorno del range. Per ogni giorno, sommare `totalePartecipanti(item)` per ogni iscrizione il cui intervallo `[data_inizio, data_fine]` include quel giorno.
- Toolbar: cambiare `flex justify-end` in `flex flex-col sm:flex-row sm:justify-end gap-2`. Inserire `<Button variant="outline" onClick={() => setCalendarioOpen(true)}><CalendarDays /> Calendario</Button>` **a sinistra** di "Apri anagrafica completa".
- Renderizzare `<CalendarioPresenzeDialog>` con colore `orange`.

## Montaggio Campeggio (`src/pages/TurnoMontaggioPage.tsx`)

- Aggiungere stato `calendarioOpen`.
- Calcolare con `useMemo` su `GIORNI_MONTAGGIO`: per ciascun `value`, sommare `totalePartecipanti(item)` per ogni iscrizione che ha quel valore in `giorni_selezionati`.
- Mappare ogni `GiornoMontaggio` su una `Date` reale (30/05, 31/05, 01/06, 02/06 del 2026) per coerenza con il componente condiviso.
- Toolbar: il container è già `flex justify-stretch sm:justify-end`. Aggiungere il pulsante Calendario a sinistra (su mobile entrambi full-width stack verticale, su desktop affiancati).
- Renderizzare `<CalendarioPresenzeDialog>` con colore `amber`.

## Responsive

- Toolbar pulsanti: stack verticale full-width su mobile, affiancati su `sm+`.
- Dialog: `max-w-lg` con padding ridotto su mobile (`p-4 sm:p-6`), griglia interna `grid-cols-1 sm:grid-cols-2`.
- Testo data: forma compatta su mobile (`text-sm`), estesa su desktop.

## File toccati

- Nuovo: `src/components/CalendarioPresenzeDialog.tsx`
- Modificati: `src/pages/TurnoFamigliePage.tsx`, `src/pages/TurnoMontaggioPage.tsx`

Nessuna modifica al database o a edge functions.