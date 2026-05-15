## Obiettivo

Allineare la card di dettaglio dell'**Anagrafica Montaggio Campeggio** a quella dell'**Anagrafica Turno Famiglie**, aggiungendo il pulsante "Invia comunicazione" + log invii, e verificare la responsività mobile/tablet di tutti i nuovi componenti del modulo Montaggio.

## 1. Wizard "Invia comunicazione" per Montaggio

Creare un nuovo componente `src/components/InviaComunicazioneMontaggioWizard.tsx`, clone funzionale di `InviaComunicazioneFamigliaWizard`, con queste differenze:

- Prop: `iscrizione: IscrizioneMontaggio`.
- Webhook: lookup su `webhook_config` con `descrizione ILIKE '%comunicazione custom montaggio%'`, fallback `https://n8n.marcobortolamai.synology.me/webhook/testo_custom_montaggio`.
- Payload JSON arricchito con i campi del montaggio: `giorni_selezionati`, `num_notti`, `num_adulti`, `num_figli_over10`, `num_4_10_anni`, `num_0_3_anni`, `importo_totale_calcolato`, `tipo: 'montaggio_campeggio'`, `iscrizione_montaggio_id: id`.
- Email HTML: stesso template CUPAV, ma sottotitolo header "CUPAV — Montaggio Campeggio" (resto identico).
- Logging in `anagrafica_invio_logs` con la nuova colonna `iscrizione_montaggio_id`.

## 2. Migration database

Estendere `anagrafica_invio_logs` per supportare i log delle iscrizioni montaggio:
- Aggiungere colonna `iscrizione_montaggio_id uuid` nullable, FK opzionale verso `iscrizioni_montaggio(id) on delete cascade`.
- Aggiornare RLS / policy esistenti per coprire il nuovo riferimento (stesse regole di `iscrizione_famiglia_id`).

## 3. Aggiornamento `AnagraficaMontaggioCampeggio.tsx`

Nel `MontaggioDetailDrawer`:
- Importare `useAuth`, `useQuery/useQueryClient`, `supabase`, il nuovo `InviaComunicazioneMontaggioWizard`.
- Aggiungere stato `comunicazioneOpen`.
- Recuperare i log da `anagrafica_invio_logs` filtrando `iscrizione_montaggio_id`.
- Inserire, in modalità lettura, il pulsante full-width:

```tsx
<Button onClick={() => setComunicazioneOpen(true)}
  className="w-full h-11 bg-gradient-to-r from-red-500 to-red-600 ...">
  <Mail className="h-4 w-4 mr-2" />Invia comunicazione
</Button>
```

  seguito dalla griglia 3 pulsanti già esistenti (Modifica / Archivia / Elimina) — invariati nel comportamento.
- Inserire la sezione "Cronologia invii" (lista compatta dei log) come nella pagina famiglie.
- Loggare `modifica_dati`, `archiviazione`, `ripristino` con la stessa logica del wizard famiglie (riusare un mini helper locale `logMontaggioAction`).
- Renderizzare `<InviaComunicazioneMontaggioWizard>` accanto all'AlertDialog di eliminazione.

## 4. Verifica responsive mobile/tablet

Audit dei file creati per il modulo Montaggio (form pubblico, dashboard turno, anagrafica, sezione Home "Altre iscrizioni") e applicazione di fix puntuali dove serve:

- `src/pages/public/IscrizioneMontaggio.tsx`: header/CTA stack su mobile, padding ridotti `px-4 sm:px-6`, griglie partecipanti `grid-cols-1 sm:grid-cols-2`, bottoni step full-width su mobile.
- `src/pages/TurnoMontaggioPage.tsx`: hero `flex-col sm:flex-row`, contatori `grid-cols-3` con `text-xl sm:text-2xl`, CTA "Apri anagrafica" full-width su mobile.
- `src/pages/AnagraficaMontaggioCampeggio.tsx`: toolbar `flex-col sm:flex-row`, Search/Archivia/Export bottoni full-width su mobile, drawer con `px-4 sm:px-5`, bottoni azione 3-grid che restano leggibili (testo nascosto < `sm` oppure `text-xs`), griglia giorni `grid-cols-2 sm:grid-cols-3`.
- `src/pages/Home.tsx` (sezione "Altre iscrizioni" e card Quick Access "Anagrafica Montaggio Campeggio"): verificare che la nuova sezione usi la stessa griglia responsive delle altre e che il bottone nel welcome banner non rompa il wrap su iPhone.

QA finale via preview a viewport 375×812, 768×1024 e desktop, controllando che nulla vada in overflow.

## 5. Non in scope

- Nessuna modifica a logica tariffaria, webhook esistenti famiglie, o RLS oltre la nuova colonna.
- Nessun cambiamento al form pubblico se non micro-aggiustamenti di responsive.

## Dettagli tecnici (riferimento)

Migration:
```sql
ALTER TABLE public.anagrafica_invio_logs
  ADD COLUMN iscrizione_montaggio_id uuid
  REFERENCES public.iscrizioni_montaggio(id) ON DELETE CASCADE;
CREATE INDEX idx_anagrafica_invio_logs_montaggio
  ON public.anagrafica_invio_logs(iscrizione_montaggio_id);
```

File toccati:
- nuovo: `src/components/InviaComunicazioneMontaggioWizard.tsx`
- nuova migration su `anagrafica_invio_logs`
- modificati: `src/pages/AnagraficaMontaggioCampeggio.tsx`, `src/pages/TurnoMontaggioPage.tsx`, `src/pages/public/IscrizioneMontaggio.tsx`, `src/pages/Home.tsx` (solo classi responsive)
