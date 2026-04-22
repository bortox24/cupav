

## Obiettivo
Aggiungere un pulsante **rosso "Invia comunicazione"** nella card del ragazzo (sotto "Invia Lista d'Attesa") che apre un wizard a 2 step: scrittura testo → anteprima → invio webhook + log.

## Cosa faccio

### 1. DB — Nuovo webhook in `webhook_config`
Inserisco:
- `descrizione`: `"Invio comunicazione custom"`
- `webhook_url`: `https://n8n.marcobortolamai.synology.me/webhook/testo_custom`

### 2. Nuovo componente `InviaComunicazioneWizard` (in `src/components/`)
Dialog a 2 step:

**Step 1 — Compilazione**
- Campo `Input` per **Titolo** della comunicazione
- `Textarea` per **Testo** libero (multilinea, ridimensionabile)
- Pulsante "Avanti" (disabilitato se titolo o testo vuoti)

**Step 2 — Anteprima**
- Render HTML dell'email (in un `<iframe srcDoc>` per isolarla dagli stili dell'app) costruita dal template fornito, con i placeholder sostituiti:
  - `{{ $json.body.titolo }}` → titolo inserito
  - `{{ $json.body.genitori[0].nome_cognome }}` → primo genitore del ragazzo (fallback: "Genitore")
  - `{{ $json.body.testo }}` → testo inserito (con `\n` → `<br/>`)
- Pulsanti: "Indietro" (torna allo step 1) e **"Invia"** (rosso)

### 3. Logica invio
Al click "Invia":
1. Lookup webhook via `.ilike('descrizione', '%comunicazione custom%')`
2. POST con payload:
   ```json
   {
     "titolo": "...",
     "testo": "...",
     "ragazzo": { id, full_name, numero, ... },
     "genitori": [...],
     "iscrizioni": [...]
   }
   ```
3. Log in `anagrafica_invio_logs`:
   - `tipo`: `'invio_comunicazione_custom'`
   - `dettaglio`: `"Titolo: {titolo} — {testo troncato a 200 char}"` (così il testo è visibile nello storico, riusando la struttura esistente)
   - `successo`: true/false
4. Toast + chiusura dialog

### 4. UI nel `RagazzoDrawer` (`AnagraficaRagazzi.tsx`)
Aggiungo sotto il pulsante "Invia Lista d'Attesa":
```tsx
<Button
  onClick={() => setComunicazioneOpen(true)}
  className="w-full h-11 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
>
  <Mail className="h-4 w-4 mr-2" />
  Invia comunicazione
</Button>
```

### 5. Visualizzazione log
Nello "Storico invii" aggiungo la mappatura del nuovo `tipo`:
- Badge **rosso** "Comunicazione"
- Il `dettaglio` (titolo + estratto testo) viene già mostrato dalla logica esistente

## Note tecniche
- Template HTML salvato come costante `EMAIL_TEMPLATE` nel componente wizard, con sostituzione dei 3 placeholder via `.replaceAll`.
- Anteprima in `iframe` per evitare conflitti di stile (l'email usa stili inline, il browser li renderizza fedelmente).
- Nessuna modifica RLS: `webhook_config` e `anagrafica_invio_logs` hanno già le policy giuste.
- Nessun edge function: chiamata webhook diretta dal client come per gli altri due pulsanti (stesso pattern).

