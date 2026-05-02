
# Modulo pubblico Iscrizione Famiglie — Step 2 più chiaro

## Obiettivo
Rendere la sezione "Persone partecipanti" del modulo pubblico (`/iscrizione-famiglie`, step 2) più semplice, ordinata e auto-esplicativa: chi compila deve capire al volo a quale fascia appartiene ogni familiare.

## Problemi attuali
- Le fasce d'età sono sparse senza ordine (Adulti, 4–10, 0–3, Animali in griglia 2×2).
- "Adulti" non specifica da che età.
- Gli animali sono mescolati alle persone.
- I "Figli > 10 anni" sono 3 checkbox in colonna senza spiegazione del perché siano ordinate (1°, 2°, 3°).

## Nuova struttura (file: `src/pages/public/IscrizioneFamiglie.tsx`, step 2)

Sezione **"Persone partecipanti *"** con sottotitolo:
> *Indica quante persone partecipano per ciascuna fascia d'età.*

Ordine dei blocchi (dal più piccolo al più grande):

1. **👶 Bambini 0–3 anni** — etichetta "Gratis" sotto il titolo. Input numero.
2. **🧒 Bambini 4–10 anni** — etichetta "Tariffa ridotta". Input numero.
   *(I due blocchi qui sopra in griglia 2 colonne su desktop, 1 su mobile.)*
3. **🧑 Figli oltre i 10 anni** — riquadro dedicato con testo:
   > *Spunta una casella per ogni figlio sopra i 10 anni (la tariffa diminuisce dal 2° e 3° figlio).*
   
   3 caselle "card-style" affiancate (1°, 2°, 3° figlio), evidenziate in verde quando selezionate.
4. **🧑‍🦱 Adulti (dai 18 anni)** — etichetta esplicita "dai 18 anni". Input numero.
5. **🐾 Animali al seguito** — riquadro **separato visivamente** (sfondo ambra) per chiarire che non sono persone. Input numero con sottotitolo "Numero di animali domestici che porterai".

## Cosa NON cambia
- Nessuna modifica al database o alla logica di salvataggio (i campi `num_adulti`, `figlio_1_over10`, `num_4_10_anni`, `num_0_3_anni`, `num_animali` restano identici).
- Nessuna modifica alle altre tab del modulo o alle pagine interne (anagrafica, pagamenti, calcolo prezzo).

## Risultato atteso
La tab "Iscrizione e partecipanti" diventa una lista verticale ordinata per età, con icone, sottotitoli che spiegano ogni fascia, "adulti" chiaramente definiti come maggiorenni, e gli animali separati in un riquadro distinto.
