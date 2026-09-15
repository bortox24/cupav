# Festa Campeggio: comunicazioni singole, PDF filtrati, adesioni "Invitato"

Tre aggiunte alla pagina Festa Campeggio iscrizioni.

## 1. "Invia comunicazione" per singola adesione

- Nuovo pulsante in ogni card, accanto a "Modifica" (icona busta).
- Si apre una finestra in 2 passi, come già esiste per Montaggio Campeggio:
  1. Titolo + testo del messaggio.
  2. Anteprima dell'email nel layout CUPAV, con nome e indirizzo del destinatario.
- "Invia" manda l'email a quella sola persona e registra l'invio nei log.
- Se l'adesione non ha email, il pulsante è disattivato.

## 2. Scarica PDF: quattro varianti

Il pulsante "Scarica PDF" apre un menù con quattro voci:

- Tutte le adesioni (come oggi)
- Solo adesioni con almeno un adulto
- Solo adesioni con almeno un ragazzo
- Solo adesioni con almeno uno staff

Ogni PDF mantiene grafica, KPI, grafico e tabella attuali, con sottotitolo che indica il filtro; i totali sono ricalcolati sul sottoinsieme. La ricerca attiva continua a valere.

## 3. Adesioni "Invitato" (contributo zero)

- Nella finestra "Modifica adesione" un interruttore **Invitato — contributo zero**.
- Attivo: il contributo dell'adesione diventa 0€ e non viene più ricalcolato in base ai partecipanti; l'adesione risulta subito saldata (nessun importo da incassare).
- Disattivandolo, il contributo torna al valore calcolato su adulti/ragazzi/staff.
- Card in elenco: badge viola **Invitato** accanto al nome, contributo mostrato come "0€ — Invitato".
- Check-in: la riga di ricerca e la schermata di conferma mostrano il badge **Invitato**; il passo del pagamento è sostituito da una nota "Invitato — nessun contributo da incassare", resta solo la scelta di quante persone sono entrate.
- KPI e PDF: gli invitati contano nelle persone previste/arrivate ma con 0€ previsti, così i totali economici restano corretti.

## Dettagli tecnici

- Migrazione: `festa_campeggio.invitato boolean not null default false`.
- `src/hooks/useFestaCampeggio.ts`: campo `invitato` nell'interfaccia; helper `contributoEffettivo(i)` = `i.invitato ? 0 : i.contributo`.
- `src/pages/FestaCampeggioIscrizioni.tsx`: switch in edit dialog (in `saveEdit`, `contributo = invitato ? 0 : calcolaContributoFesta(...)`), badge nelle card, dropdown PDF, pulsante e stato per il nuovo wizard singolo.
- Nuovo `src/components/InviaComunicazioneFestaWizard.tsx`, modellato su `InviaComunicazioneMontaggioWizard.tsx`: webhook da `webhook_config` (descrizione "comunicazione custom festa", fallback all'endpoint n8n testo custom) e log in `anagrafica_invio_logs` con `tipo: 'invio_comunicazione_custom'` (nessun `ragazzo_id`).
- `src/lib/exportFestaCampeggioPdf.ts`: parametro opzionale `{ label }` per il sottotitolo; il filtraggio avviene nella pagina.
- `src/pages/FestaCampeggioCheckIn.tsx`: badge Invitato e ramo senza pagamento nello step 2.
