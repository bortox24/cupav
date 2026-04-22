

## Obiettivo
Aggiungere un pulsante **arancione "Invia Lista d'Attesa"** nel drawer del ragazzo, sotto il pulsante "Invia Iscrizione". Al click apre un dialog di conferma e invia un webhook al nuovo endpoint, registrando il log come per gli altri invii.

## Cosa faccio

### 1. DB — Aggiungo il webhook in `webhook_config`
Inserisco una nuova riga:
- `descrizione`: `"Invio lista attesa"`
- `webhook_url`: `https://n8n.marcobortolamai.synology.me/webhook/invio_lista_attesa`

### 2. `src/pages/AnagraficaRagazzi.tsx` — Aggiunte nel `RagazzoDrawer`

**Nuovi stati:**
```ts
const [sendingListaAttesa, setSendingListaAttesa] = useState(false);
const [confirmListaAttesa, setConfirmListaAttesa] = useState(false);
```

**Nuovo handler `handleInviaListaAttesa`** — copia identica di `handleInviaIscrizione`, con:
- Lookup webhook tramite `.ilike('descrizione', '%lista attesa%')`
- Stesso payload (dati ragazzo + genitori + iscrizioni + farmaci)
- Toast di successo: `"Lista d'attesa inviata!"`
- Log in `anagrafica_invio_logs` con `tipo: 'invio_lista_attesa'`

**Nuovo pulsante** (sotto "Invia Iscrizione", riga ~495):
```tsx
<Button
  onClick={() => setConfirmListaAttesa(true)}
  disabled={sendingListaAttesa}
  className="w-full h-11 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-sm"
>
  {sendingListaAttesa ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
  Invia Lista d'Attesa
</Button>
```

**Nuovo `<AlertDialog>` di conferma** (accanto agli altri, ~riga 756):
- Titolo: "Conferma invio lista d'attesa"
- Descrizione: "Vuoi davvero inviare i dati di {nome} alla lista d'attesa?"
- Azione conferma → chiama `handleInviaListaAttesa()`

### 3. Visualizzazione del log
Il log apparirà automaticamente nella sezione "Storico invii" del drawer (già esistente), perché legge tutti i record di `anagrafica_invio_logs` per quel ragazzo. Il `tipo: 'invio_lista_attesa'` verrà mostrato come gli altri.

Verifico anche se esiste un mapping di label per i `tipo` (es. icone/colori dedicati): se sì, aggiungo un'etichetta leggibile "Invio lista d'attesa" con icona arancione coerente.

## Note
- Stesso pattern esatto degli altri due pulsanti (Invia Iscrizione, Conferma Preiscrizione) — zero rischi di regressione.
- Il colore arancione è coerente col branding (gradiente `orange-500 → amber-600`, leggibile in dark mode).
- Nessuna modifica RLS necessaria: `webhook_config` e `anagrafica_invio_logs` hanno già le policy giuste.

