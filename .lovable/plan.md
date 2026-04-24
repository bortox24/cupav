## Doppioni trovati, divisi per turno

Ho ricontrollato la tabella iscrizioni raggruppando per:
- turno
- cognome ragazzo normalizzato
- nome ragazzo normalizzato

La regola proposta è: **tenere l'iscrizione più vecchia** e rimuovere le iscrizioni successive dello stesso ragazzo nello stesso turno.

### 1° Media

**Francesco Nichele** — 2 iscrizioni

Da tenere:
- 23/04/2026 08:25 — genitore: Antonella Zanetti — email: antonella_zanetti@hotmail.it

Da rimuovere:
- 23/04/2026 08:31 — genitore: Sergio Nichele — email: sergionichele79@gmail.com

### 3° Media

**Cristian Garzon** — 2 iscrizioni

Da tenere:
- 22/04/2026 21:25 — genitore: Alessia Fracaro — email: alessiafracaro@gmail.com

Da rimuovere:
- 23/04/2026 11:23 — genitore: Alessia Fracaro — email: alessiafracaro@gmail.com

### 4° Elementare

**Aurora Febbrile** — 2 iscrizioni

Da tenere:
- 15/04/2026 00:28 — genitore: Luigi Febbrile — email: luigifebbrile@live.it

Da rimuovere:
- 15/04/2026 07:05 — genitore: Luigi Febbrile — email: luigifebbrile@live.it

### 5° Elementare

**Cristina Dallegno** — 2 iscrizioni

Da tenere:
- 19/04/2026 17:46 — genitore: Tania Filì — email: taniadomfili@yahoo.it

Da rimuovere:
- 19/04/2026 17:53 — genitore: Jacopo Dallegno — email: jacopodallegno@yahoo.it

## Nota importante

Rispetto all'analisi precedente, in questo controllo attuale non risulta più il doppione di **Lina Zoljami** in 5° Elementare. Quindi al momento i gruppi doppi sono **4**, per un totale di **4 iscrizioni da rimuovere**.

## Piano di rimozione

### 1. Backup logico prima della cancellazione

Prima di eliminare qualcosa, preparo una query di verifica con l'elenco completo degli ID che verranno rimossi.

Gli ID da rimuovere sono:

```text
43439eb2-e393-44b8-8bb5-d3e3e48ac4a5  Francesco Nichele  1° Media
42258a36-1a94-43a0-b288-d3ba30873379  Cristian Garzon    3° Media
c0854b80-12ec-4626-b036-8e3139cc71e1  Aurora Febbrile    4° Elementare
df802b37-300d-4fff-a7dc-73e5f040e22f  Cristina Dallegno  5° Elementare
```

### 2. Rimozione record collegati nei pagamenti

Ho verificato che ci sono **4 record in `pagamenti`** collegati esattamente a queste iscrizioni doppie.

Quindi la rimozione deve avvenire in questo ordine:

1. eliminare i pagamenti collegati alle iscrizioni duplicate
2. eliminare le iscrizioni duplicate

Questo evita pagamenti orfani o dati incoerenti.

Non risultano invece log di sollecito pagamento collegati a questi doppioni:

```text
pagamento_reminder_logs: 0
```

### 3. Cancellazione delle iscrizioni duplicate

Dopo aver eliminato i pagamenti collegati, cancello dalla tabella `iscrizioni` solo le 4 righe duplicate successive, lasciando intatte le prime iscrizioni.

### 4. Verifica finale

Dopo la cancellazione eseguo due controlli:

1. controllo che non esistano più doppioni per stesso nome + cognome + turno
2. controllo che le pagine `/turno` e `Gestione Pagamenti` non mostrino più i record rimossi

## Dettaglio tecnico

La cancellazione prevista sarà equivalente a:

```sql
DELETE FROM pagamenti
WHERE iscrizione_id IN (
  '43439eb2-e393-44b8-8bb5-d3e3e48ac4a5',
  '42258a36-1a94-43a0-b288-d3ba30873379',
  'c0854b80-12ec-4626-b036-8e3139cc71e1',
  'df802b37-300d-4fff-a7dc-73e5f040e22f'
);

DELETE FROM iscrizioni
WHERE id IN (
  '43439eb2-e393-44b8-8bb5-d3e3e48ac4a5',
  '42258a36-1a94-43a0-b288-d3ba30873379',
  'c0854b80-12ec-4626-b036-8e3139cc71e1',
  'df802b37-300d-4fff-a7dc-73e5f040e22f'
);
```

## Risultato atteso

Dopo l'intervento:

- ogni ragazzo risulterà iscritto una sola volta per turno
- spariranno i badge **DOPPIONE** per questi casi nelle pagine `/turno`
- in Gestione Pagamenti resterà una sola card per ciascun ragazzo
- il nuovo controllo anti-doppione già implementato bloccherà nuovi casi futuri dal modulo pubblico