

## Obiettivo
Normalizzare la visualizzazione di nome/cognome di **ragazzi e genitori** nelle card del turno (`/turno/:slug`) in formato "Prima Lettera Maiuscola" (Title Case), senza modificare i dati nel database.

## Dove intervenire
File: `src/pages/TurnoPage.tsx`

Tre punti di rendering interessati:
1. **`RagazzoCompactCard`** (righe ~282-302) — la card compatta nella griglia iscritti: mostra `r.ragazzo_cognome r.ragazzo_nome` e `r.genitore_nome r.genitore_cognome`.
2. **`RagazzoDetailDrawer`** (righe ~360-376) — il drawer dei dettagli: titolo ragazzo + riga genitore.
3. **Card appello** (riga ~449) — mostra `r.ragazzo_cognome r.ragazzo_nome`.

## Approccio
Aggiungere un piccolo helper locale in `TurnoPage.tsx`:

```ts
const toTitleCase = (s?: string | null) =>
  (s || '')
    .toLowerCase()
    .replace(/(^|[\s'’\-])(\p{L})/gu, (_, sep, ch) => sep + ch.toUpperCase());
```

Questa regex gestisce correttamente:
- nomi multipli ("MARIA ROSA" → "Maria Rosa")
- cognomi con apostrofo ("D'ANGELO" → "D'Angelo")
- cognomi con trattino ("ROSSI-BIANCHI" → "Rossi-Bianchi")
- caratteri accentati tramite flag Unicode

Applicarlo nei 3 punti elencati a `ragazzo_nome`, `ragazzo_cognome`, `genitore_nome`, `genitore_cognome` (le iniziali per gli avatar restano calcolate come ora — già forzate a `.toUpperCase()`).

## Note
- Modifica **solo di visualizzazione**: i dati nel DB restano invariati, così non si perde l'originale.
- Nessun impatto su ricerca/filtri/export (continuano a usare i valori grezzi).
- Nessuna modifica al database o ad altre pagine — l'utente ha chiesto specificamente le card del turno.

