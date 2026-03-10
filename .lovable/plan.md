

## Piano: Fix navigazione step senza allergie

### Problema
Quando si seleziona "No" alle allergie, il codice salta dallo step 1 allo step 3 (`setCurrentStep(3)`), ma la Liberatoria foto si renderizza a `currentStep === 2` (quando `showStep2=false`), e il Regolamento a `currentStep === 3`. Quindi dopo il salto allo step 3, si vede direttamente il Regolamento, saltando la Liberatoria.

### Soluzione
Cambiare la logica di skip: quando non ci sono allergie, saltare dallo step 1 allo step **2** (non 3). I render condizionali già mappano correttamente gli step quando `showStep2=false`:
- Step 2 → Liberatoria (`showStep2 ? 3 : 2`)
- Step 3 → Regolamento (`showStep2 ? 4 : 3`)

### Modifiche in `src/pages/public/IscrizioneCampeggio.tsx`

1. **Riga 194** — `nextStep()`: cambiare `setCurrentStep(3)` → `setCurrentStep(2)`
2. **Riga 200** — `prevStep()`: cambiare la condizione `currentStep === 3` → `currentStep === 2` per tornare allo step 1
3. **Riga 287** — `lastStep`: cambiare `showStep2 ? 4 : 3` → il lastStep diventa `showStep2 ? 4 : 3` (già corretto, nessun cambiamento)

In pratica: senza allergie gli step effettivi diventano 1 → 2 → 3, coerenti con i render condizionali.

