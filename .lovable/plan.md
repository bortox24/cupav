

## Piano: Sezioni distinte nella card ragazzo

### Cosa cambia

Riorganizzare i pulsanti nella card ragazzo (righe 380-430) in due sezioni visivamente distinte con titolo, più i log sotto.

### Layout finale

```text
──────────────────────────
📋 Gestione iscrizioni
  ┌──────────────────────┐
  │ Conferma Preiscrizione│  (full width, h-11, emerald)
  └──────────────────────┘
  ┌──────────────────────┐
  │ Invia Iscrizione      │  (full width, h-11, blue)
  └──────────────────────┘
──────────────────────────
✏️ Modifica dati
  [Modifica dati]          (full width)
  [Arricchisci dati]       (full width)
  [Archivia] [Elimina]     (flex row 50/50)
──────────────────────────
📋 Log invii
  (log entries invariati)
──────────────────────────
```

### Dettagli implementazione (`src/pages/AnagraficaRagazzi.tsx`, righe 380-430)

1. **Sezione "Gestione iscrizioni"**: wrap con div + titoletto `p` con icona. I due pulsanti diventano full-width (`w-full`) uno sopra l'altro, con altezza maggiore (`h-11`) e testo `text-sm` invece di `text-xs` per migliorare la leggibilità mobile.

2. **Separator** tra le due sezioni.

3. **Sezione "Modifica dati"**: wrap con div + titoletto. Contiene Modifica dati, Arricchisci dati, e la riga Archivia/Elimina — stessi pulsanti di ora, solo raggruppati sotto il titolo.

4. **Log**: restano sotto come sono, invariati.

### File modificato
- `src/pages/AnagraficaRagazzi.tsx` (righe 380-430)

