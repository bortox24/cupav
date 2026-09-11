# Gestione utenti e permessi più semplice e scalabile

## Obiettivo
Nella pagina Permessi (/admin/permessi) la gestione degli utenti diventa una lista leggibile senza barre di scorrimento laterali, e i permessi si assegnano cliccando direttamente sull'utente. La scheda Account staff resta come è ora.

## Cosa cambia

### 1. Lista utenti su una schermata sola
- Via la tabella larga con scorrimento orizzontale: ogni utente diventa una scheda in elenco (una colonna su telefono, due su schermi grandi).
- Ogni scheda mostra: nome, email, etichetta Admin, stato Attivo/Disattivato, numero di pagine e turni abilitati.
- Le azioni restano quelle di oggi: interruttore Admin, interruttore Attivo, elimina utente, più il nuovo pulsante per i permessi. L'utente collegato resta non modificabile come adesso.

### 2. Permessi direttamente dall'utente
- Cliccando sulla scheda dell'utente (o sul pulsante "Permessi") si apre un pannello dedicato a quella persona con:
  - elenco di tutte le pagine disponibili, ognuna con la sua spunta;
  - elenco dei turni, ognuno con la sua spunta;
  - ricerca rapida per filtrare le pagine quando sono molte;
  - scorciatoie "Seleziona tutto" / "Nessuna" e il pulsante Reset già esistente;
  - contatore delle pagine abilitate.
- Ogni spunta salva subito, esattamente come oggi (stesso comportamento, compresa la pagina collegata alle risposte dei moduli).
- Per gli utenti admin il pannello mostra solo l'avviso che hanno già accesso completo.

### 3. Schede della pagina
- Restano due schede: "Utenti" (con i permessi dentro) e "Account staff".
- La scheda separata "Permessi pagine" viene rimossa perché il suo contenuto si trova ora dentro ogni utente.

## Sicurezza dei dati esistenti
Nessuna modifica al database: si continuano a usare le stesse tabelle e le stesse funzioni di lettura/scrittura dei permessi (pagine e turni). I permessi già assegnati restano identici; cambia solo il modo in cui vengono mostrati e modificati. Dopo la modifica verifico su alcuni utenti reali che le spunte corrispondano ai permessi salvati.

## Dettagli tecnici
- `src/pages/AdminPermessi.tsx`: `GestioneUtentiTab` passa da `Table` a griglia di `Card`; nuovo componente `UserPermessiDialog` (Dialog su desktop, a piena larghezza su mobile) che riusa `useAllPagePermissions`, `useSetPagePermission`, `useResetUserPermissions`, `useAllTurnoPermissions`, `useSetTurnoPermission`, `useRemoveTurnoPermission`, `useResetUserTurnoPermissions`, `availablePages`, `TURNI`.
- Rimozione di `PermessiPagineTab` e del relativo `TabsTrigger`/`TabsContent`; `AccountStaffTab` invariato.
- Nessuna migrazione, nessuna modifica a RLS o hook.
