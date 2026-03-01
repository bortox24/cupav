

## Piano: Counter pre-iscrizioni in Anagrafica Ragazzi

### Cosa viene fatto

Aggiungere un contatore visivo sopra la barra di ricerca nella pagina Anagrafica Ragazzi che mostra il numero di pre-iscrizioni per l'anno corrente. Il contatore si aggiorna dinamicamente in base al filtro turno selezionato:

- **"Tutti i turni"** selezionato → mostra il totale complessivo delle pre-iscrizioni dell'anno corrente
- **Turno specifico** selezionato → mostra solo il conteggio per quel turno

### Implementazione

Nessuna modifica al database necessaria. I dati sono già disponibili dalla tabella `ragazzi_iscrizioni` caricata tramite `useRagazzi()`.

**Modifica a `src/pages/AnagraficaRagazzi.tsx`:**

1. Calcolare il conteggio delle iscrizioni per l'anno corrente dai dati già in memoria:
   - Se `filterTurno === 'all'`: contare tutti i ragazzi non archiviati con almeno un'iscrizione nell'anno corrente
   - Se turno specifico: contare solo quelli con iscrizione per quel turno nell'anno corrente

2. Inserire un elemento compatto sopra la riga di ricerca/filtro, con:
   - Un'icona `Users` e il numero in grassetto
   - Testo descrittivo ("Pre-iscrizioni 2026" o "Pre-iscrizioni 2026 — 4^ Elementare")
   - Stile: badge/card piccola con sfondo `primary/10`, bordo `primary/20`, testo `primary`, ben visibile ma non ingombrante

