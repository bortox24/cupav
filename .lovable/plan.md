

## Obiettivo
Sistemare la spaziatura del template email in `InviaComunicazioneWizard.tsx`:
- **Spazio AGGIUNTO** tra il **titolo** e la riga `Gentile {genitore},`
- **Spazio RIMOSSO** tra `Gentile {genitore},` e il **testo** della comunicazione (devono apparire come un blocco continuo)

## Modifiche

In `src/components/InviaComunicazioneWizard.tsx`, nel template HTML (righe 39-49), aggiusto i margini e i padding:

### Riga 41 — `<h2>` titolo
- Cambio `margin:0 0 12px 0` → `margin:0 0 28px 0` (più spazio sotto al titolo)

### Riga 42 — `<p>Gentile ...</p>`
- Cambio `margin:0 0 12px 0` → `margin:0` (azzero il margine sotto, così si attacca al testo)

### Riga 46 — `<td>` del paragrafo testo
- Cambio `padding: 0 40px 32px 40px` → `padding: 8px 40px 32px 40px` (piccolissimo respiro tra "Gentile..." e il testo, ma molto contenuto — quasi attaccato)

### Riga 40 — `<td>` del blocco titolo + Gentile
- Cambio `padding: 36px 40px 20px 40px` → `padding: 36px 40px 0 40px` (rimuovo il padding inferiore così non si somma al successivo)

## Risultato visivo
```
[Header giallo]

Titolo (H2 verde)
                       ← spazio (28px)
Gentile Nome Cognome,
Testo della comunicazione che parte
quasi subito sotto il "Gentile...".
```

Nessun'altra modifica: solo 4 ritocchi di CSS inline nel template HTML. Anteprima e invio webhook restano identici.

