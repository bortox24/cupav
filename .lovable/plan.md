

## Piano: Invio massivo comunicazioni via webhook con coda

### Obiettivo
Creare una pagina/dialog dedicata per l'invio massivo di comunicazioni ai ragazzi tramite webhook, con filtri avanzati, selezione del webhook, e coda di invio con intervallo di 30 secondi tra ogni email.

### 1. Nuova pagina o Dialog?
Dato che è una funzionalità complessa con filtri, preview e coda, propongo un **Dialog/Sheet** full-screen accessibile da un nuovo pulsante "Invio Massivo" nella toolbar di Anagrafica Ragazzi.

### 2. Interfaccia utente del Dialog

**Sezione Filtri:**
- Multi-select turni (checkboxes per ogni turno, possibilità di selezionarne più di uno)
- Filtro numero: "Tutti" / "Con numero assegnato" / "Senza numero"
- Combinazione dei filtri (AND tra turno e numero)
- Contatore live dei ragazzi che corrispondono ai filtri

**Sezione Webhook:**
- Select per scegliere quale webhook usare dalla tabella `webhook_config` (mostra descrizione e url)

**Sezione Anteprima:**
- Lista scrollabile dei ragazzi filtrati con nome, turno, numero
- Conteggio totale

**Sezione Invio:**
- Pulsante "Avvia invio" che avvia la coda
- Progress bar con contatore (es. "Inviato 5/23")
- Stato di ogni ragazzo: in attesa / in invio / inviato / errore
- Timer visibile "Prossimo invio tra X secondi"
- Pulsante "Interrompi" per fermare la coda

### 3. Logica di coda (client-side)
- Iterazione sequenziale sui ragazzi filtrati
- Ogni 30 secondi viene inviata una chiamata al webhook selezionato con i dati del ragazzo (stesso payload usato per invio singolo)
- Dopo ogni invio, viene registrato un log in `anagrafica_invio_logs` con tipo basato sulla descrizione del webhook (es. `invio_massivo_conferma_preiscrizione` o `invio_massivo_iscrizione`)
- Se l'utente chiude il dialog o preme "Interrompi", la coda si ferma

### 4. Log
- Tipo log: `invio_massivo` con nel dettaglio il nome del webhook usato e l'esito
- Ogni ragazzo riceve il proprio log individuale (come già funziona)
- I log appaiono nella card ragazzo come al solito

### 5. Modifiche tecniche

| File | Modifica |
|------|----------|
| `src/pages/AnagraficaRagazzi.tsx` | Aggiungere pulsante "Invio Massivo" nella toolbar e nuovo componente Dialog |
| Nuovo componente `InvioMassivoDialog` | Dialog con filtri, selezione webhook, anteprima, coda di invio con progress |
| Nessuna modifica DB | Usa tabelle esistenti `webhook_config` e `anagrafica_invio_logs` |

### 6. Flusso utente
1. Click "Invio Massivo" nella toolbar
2. Seleziona filtri (turni, numero)
3. Vede anteprima ragazzi filtrati
4. Sceglie il webhook da usare
5. Preme "Avvia invio"
6. Vede progress bar e stato di ogni invio in tempo reale
7. Ogni 30 secondi parte il prossimo invio
8. Al termine, riepilogo con successi/errori

