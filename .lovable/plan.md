# Redesign tab Tende

Mantengo la **forma attuale** della tenda (la stessa sagoma di adesso), con tre modifiche mirate richieste.

## Cosa cambia

### 1. Forma tenda invariata, senza riga centrale
- Resta la sagoma attuale dell'icona tenda.
- **Rimuovo la riga verticale centrale** (il tratto che divide a metà la tenda) — non serve e non piace.

### 2. Colori più vivaci
Rendo le tende più colorate e leggibili, alzando la saturazione/intensità rispetto alle tinte tenui attuali (es. riempimenti più pieni invece dei `-100` chiari, bordi e numeri più decisi), sempre via token/classi Tailwind e con resa corretta in dark mode.

### 3. Colori e categorie
Schema aggiornato:

```text
Maschile   -> blu     (assegnazione ragazzi)
Femminile  -> rosa    (assegnazione ragazze)
Animatori  -> verde   (assegnazione staff, prefisso §)
Nessuno    -> grigio  (default, tenda non assegnata)
```

- "Animatori" passa da grigio a **verde**.
- Aggiungo l'opzione **"Nessuno"** (grigio), default per le tende non ancora assegnate.
- Le tende già salvate come `grigio` restano grigie (= "Nessuno"); per renderle tende staff si seleziona "Animatori" (verde).

### 4. Drawer di assegnazione
- Selettore colore con le 4 opzioni (Maschile / Femminile / Animatori / Nessuno) e pallini coerenti.
- L'aggiunta **staff** resta abilitata solo per le tende **Animatori** (verde); l'aggiunta **ragazzi** per Maschile/Femminile. Con "Nessuno" la tenda resta vuota/non assegnata.

### 5. Legenda
Aggiorno la legenda della tab con le 4 voci e i colori più vivaci.

## Dettagli tecnici
- File: `src/pages/TurnoPage.tsx`.
  - `TendaCard`: rimuovo la `<path>` della riga verticale centrale; aggiorno i mapping `fill/stroke/text` con colori più vivaci e aggiungo `verde` e `grigio`.
  - `COLORE_STYLES`: aggiungo `verde` (Animatori) e mantengo `grigio` (Nessuno), label aggiornate.
  - `TendaDrawer`: `isStaffTent` diventa `colore === 'verde'`; selettore colore a 4 opzioni; default `grigio`.
  - Legenda nella sezione `activeTab === 'tende'` aggiornata.
- Il campo DB `colore` resta una stringa: aggiungo i valori `verde`/`grigio`. Nessuna migrazione necessaria.
- Aggiorno la memoria `mem://features/gestione-tende-campeggio` con la nuova semantica colori.
