## Obiettivo
Nella tab **Giornata Genitori** (turni 4ª e 5ª elementare, in `src/pages/TurnoPage.tsx`) aggiungere:
1. Un elenco dei genitori **mancanti** (figli iscritti al turno che non hanno ancora compilato il modulo).
2. Per ogni card di adesione, due pulsanti **check-in**: "Arrivato" e "Pagato", con conferma e log di chi ha registrato.

## 1. Modifica database
Aggiungo alla tabella `giornata_genitori` i campi per il check-in:
- `arrivato` (sì/no, default no)
- `arrivato_da` (nome di chi ha registrato l'arrivo)
- `arrivato_at` (data/ora)
- `pagato` (sì/no, default no)
- `pagato_da` (nome di chi ha registrato il pagamento)
- `pagato_at` (data/ora)

Le regole di accesso restano invariate (già esiste la regola che permette agli utenti autenticati di aggiornare le adesioni).

## 2. Elenco genitori mancanti
Sopra o sotto le KPI, nella tab, aggiungo una card "Genitori mancanti":
- Confronto la lista dei **ragazzi iscritti** al turno (`iscrizioni`, già caricati) con le adesioni ricevute (`giornata_genitori`), abbinando per cognome+nome normalizzato (riuso `normalizeDuplicateName`).
- Mostro **cognome e nome** (formato "Cognome Nome") di ogni ragazzo il cui genitore non ha ancora compilato il modulo, con un contatore (es. "5 da compilare").
- Se non manca nessuno, mostro un messaggio positivo.

## 3. Pulsanti check-in nelle card
In ogni `GenitoreCard` aggiungo due pulsanti:
- **Arrivato**: rosso di default, diventa **verde** quando segnato come arrivato.
- **Pagato**: rosso "Non pagato" di default, verde "Pagato" quando segnato.

Comportamento:
- Al click si apre un **dialog di conferma** (es. "Confermi che *Cognome Nome* è arrivato?" / "Confermi il pagamento di *Cognome Nome*?").
- Alla conferma aggiorno il record e salvo **chi** ha registrato (nome dell'utente loggato, da `profile.full_name`) e **quando**.
- I pulsanti si possono anche riattivare/annullare (toggle) con conferma.

Sotto i pulsanti, nella card, mostro il **log**:
- "Arrivo segnato da *Nome* — data/ora"
- "Pagamento segnato da *Nome* — data/ora"

## 4. Permessi
- I pulsanti di check-in e la conferma sono attivi **solo** per admin, responsabili di campo, responsabili animatori e cuochi (riuso la logica esistente `ggCanOpen` / `!isAnimatoreLimitato`).
- Gli **animatori** vedono le card, l'elenco mancanti e lo stato (arrivato/pagato) ma **non** possono cliccare i pulsanti (disabilitati / sola lettura).

## Dettagli tecnici
- Estendo il tipo `GenitoreRow` con i nuovi campi.
- Aggiungo mutation React Query per aggiornare `arrivato`/`pagato` e invalidare `['giornata-genitori', turnoValue]`.
- Il nome del registrante viene da `useAuth().profile.full_name`.
- Nessuna modifica al modulo pubblico `GiornataGenitori.tsx`.
