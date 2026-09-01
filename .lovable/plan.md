# Festa Campeggio: modulo pubblico + sezione gestionale

Nuovo modulo pubblico "Festa Campeggio" e nuova sezione in Home (accanto a Montaggio Campeggio) dove arrivano tutte le risposte, con modifica ed eliminazione di ogni riga.

## Modulo pubblico `/festa-campeggio`

Mobile first, un'unica schermata compatta:

- Nome e Cognome (due campi separati, auto-capitalizzazione come negli altri moduli)
- Email e Telefono
- Numero adulti (15 EUR ciascuno)
- Numero ragazzi (10 EUR ciascuno)
- Numero staff — animatori, responsabili animatori, staff cucina, responsabili campo, direttivo (10 EUR ciascuno)
- Riepilogo live del contributo totale mentre si compilano i campi
- Firma: nome e cognome + data, invio con conferma di avvenuta iscrizione

Il totale viene ricalcolato anche lato salvataggio, così resta coerente se qualcuno modifica i numeri dal gestionale.

## Sezione gestionale `/festa-campeggio-iscrizioni`

- Card in Home nel blocco "Altre iscrizioni", accanto a Montaggio Campeggio, con contatore iscritti
- KPI in alto: iscrizioni, totale persone (adulti / ragazzi / staff), totale da incassare, totale incassato, arrivati
- Tabella a più colonne (pochi dati per riga: nome, cognome, contatti, adulti, ragazzi, staff, totale, stato) con ricerca; su mobile diventa una lista di card compatte
- Per ogni riscrizione: pulsanti "Arrivato" e "Pagato" (come Giornata Genitori, con chi e quando)
- Per ogni riga: modifica (dialog con tutti i campi, totale ricalcolato) ed eliminazione con conferma
- Export CSV dell'elenco

## Dettagli tecnici

- Nuova tabella `public.festa_campeggio`: nome, cognome, email, telefono, num_adulti, num_ragazzi, num_staff, contributo, arrivato/arrivato_da/arrivato_at, pagato/pagato_da/pagato_at, firma_nome, firma_data, timestamps + trigger `updated_at`.
- GRANT: `INSERT` a `anon` e `authenticated` (modulo pubblico), `SELECT/UPDATE/DELETE` a `authenticated`, `ALL` a `service_role`. RLS: insert pubblica, lettura/gestione per admin o utenti con permesso sulla pagina (stesso schema di `giornata_genitori`).
- Nuovo hook `useFestaCampeggio` (query + mutation di insert/update/delete/toggle) e utility prezzi (15/10/10).
- Rotte in `src/App.tsx`: `/festa-campeggio` pubblica, `/festa-campeggio-iscrizioni` protetta; card in `src/pages/Home.tsx` con conteggio; voce in permessi pagine e pulsante nel banner Home governato da un flag in `site_settings` (`festa_campeggio_enabled`) con toggle in Impostazioni.
