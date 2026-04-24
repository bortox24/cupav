## Sì, esatto

Il controllo va fatto **appena il genitore prova ad andare avanti dalla prima parte del modulo**, cioè dopo aver compilato la schermata che hai allegato.

Non deve arrivare fino alla fine del modulo: se il ragazzo risulta già iscritto, viene bloccato subito prima di passare a Liberatoria/Regolamento.

## Dati usati per il controllo

Il confronto userà questi dati della prima parte:

- Cognome ragazzo
- Nome ragazzo
- Turno selezionato

Il confronto sarà fatto ignorando:

- maiuscole/minuscole
- spazi doppi
- spazi iniziali/finali
- accenti semplici

Esempio: questi verranno considerati uguali:

```text
Rossi Mario
rossi mario
ROSSI MARIO
Rossi  Mario
```

## Avviso mostrato al genitore

Se esiste già un’iscrizione con stesso ragazzo e stesso turno, il form non va avanti e mostra un messaggio del tipo:

```text
Iscrizione già presente
Suo figlio risulta già iscritto al turno 1° Media il giorno 23/04/2026.
Per dubbi o correzioni contattare CUPAV.
```

La data sarà presa dal campo `created_at` dell’iscrizione già presente nel database.

## Modifiche da fare

### 1. Nuova funzione backend di controllo

Creo una funzione backend dedicata, ad esempio `check-iscrizione-duplicate`, che riceve:

```json
{
  "ragazzo_cognome": "Rossi",
  "ragazzo_nome": "Mario",
  "turno": "1° Media"
}
```

e restituisce:

```json
{
  "exists": true,
  "turno": "1° Media",
  "created_at": "2026-04-23T..."
}
```

oppure:

```json
{
  "exists": false
}
```

Questo evita di aprire in modo pubblico la lettura diretta della tabella iscrizioni.

### 2. Controllo quando si clicca “Avanti” nello step 1

In `src/pages/public/IscrizioneCampeggio.tsx` modifico `nextStep` così:

1. valida tutti i campi obbligatori dello step 1
2. se nome, cognome e turno sono presenti, chiama il controllo doppione
3. se esiste già l’iscrizione, mostra l’avviso e resta nello step 1
4. se non esiste, prosegue normalmente allo step successivo

Quindi il genitore non deve compilare tutto il modulo.

### 3. Secondo controllo prima dell’invio finale

Aggiungo anche lo stesso controllo dentro `handleSubmit`, subito prima dell’inserimento finale.

Serve come sicurezza nel caso raro in cui due genitori compilino il modulo contemporaneamente: uno potrebbe superare lo step 1, ma l’altro inviare prima. In quel caso il secondo viene bloccato comunque prima del salvataggio.

## Nota importante

Il blocco avverrà per **stesso nome + stesso cognome + stesso turno**.

Quindi:

- stesso ragazzo nello stesso turno: bloccato
- stesso ragazzo in un turno diverso: permesso
- stesso cognome ma nome diverso: permesso

## File coinvolti

- `supabase/functions/check-iscrizione-duplicate/index.ts`
- `src/pages/public/IscrizioneCampeggio.tsx`

Nessuna modifica grafica importante al modulo, solo il blocco e il messaggio di avviso.