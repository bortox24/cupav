# Comunicazioni dalle risposte dei moduli

Aggiungere il pulsante "Comunicazioni" nella pagina delle risposte di ogni modulo (`/visualizza-moduli/:id/risposte`), con lo stesso wizard già usato per Festa Campeggio: scrivi oggetto e testo, anteprima, poi selezione dei destinatari (tutti oppure uno per uno) e invio a un'email ogni 30 secondi.

## Come funziona per l'utente

1. In alto, accanto a "Esporta CSV", compare il pulsante **Comunicazioni**.
2. Si scrive il titolo/oggetto, il testo e (facoltativo) un pulsante con link.
3. Anteprima dell'email con il template CUPAV.
4. Elenco destinatari: tutte le risposte che contengono un'email, con checkbox per selezionare/deselezionare singolarmente, più "Seleziona tutti" / "Deseleziona tutti".
5. Avvio invio: la coda parte in background con cadenza di 30 secondi e si può monitorare come negli altri invii.

Le risposte senza indirizzo email non sono selezionabili (mostrate come escluse dal conteggio dei destinatari).

## Dettagli tecnici

- **Rilevamento email/nome dalla risposta**: il modulo ha uno schema dinamico. Il destinatario viene ricavato dal primo campo con `type: 'email'` (fallback: campo il cui nome/label contiene "email"). Il nome mostrato viene composto dai campi che contengono "nome"/"cognome" (fallback: valore email).
- **`src/components/InvioMassivoGenericDialog.tsx`**: aggiungere `'modulo'` a `entityType` e una prop opzionale `extraStartPayload` (per passare `form_id`) inclusa nella chiamata di start. Nessun gruppo di filtri obbligatorio: si passa `filterGroups={[]}` con selezione individuale attiva.
- **`src/pages/VisualizzaModuloRisposte.tsx`**: stato `invioOpen`, pulsante nella toolbar, mapping delle `filteredResponses` in `GenericRecipient` (id = id risposta) e istanza del dialog. Stessa aggiunta in `src/pages/AdminModuloRisposte.tsx` per coerenza.
- **`supabase/functions/invio-massivo-runner/index.ts`**:
  - aggiungere `modulo` a `PAGE_BY_ENTITY` con path `/visualizza-moduli` (admin sempre autorizzato);
  - accettare `modulo` in `entity_type` e leggere `form_id` dal body;
  - costruire i destinatari lato server da `form_responses` filtrando per `form_id` e `id in recipient_ids`, ricavando email e nome dallo schema di `forms.form_schema` (stessa logica del client, applicata server-side per non fidarsi dell'input);
  - payload per il template: `{ full_name, email, form_name, risposta, genitori: [{ nome_cognome, email }] }`;
  - logging in `anagrafica_invio_logs` saltato per questa entità (nessuna FK dedicata), come già fatto per `festa`.
- Nessuna modifica al database: `invio_massivo_jobs.entity_type` è testo libero senza vincoli.
- Deploy della funzione `invio-massivo-runner` dopo le modifiche.
