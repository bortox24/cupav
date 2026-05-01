## Obiettivi

1. Aggiungere la **6ª card "Turno Famiglie"** nella sezione "Iscrizioni per turno" della Home (stesso stile delle altre 5).
2. Completare i **3 punti finali** rimasti dell'integrazione Turno Famiglie:
   - Logica di **update pagamenti** per le iscrizioni famiglia
   - **Badge visivo** "Turno Famiglie" in `GestionePagamenti`
   - **Filtri/identificazione** chiara nella lista pagamenti

---

## 1. Sesta card "Turno Famiglie" nella Home

In `src/pages/Home.tsx`, dentro l'array `turnoQuickAccessCards` (righe 224-275), aggiungere come 6° elemento:

```ts
{
  title: 'Turno Famiglie',
  description: 'Famiglie iscritte al turno famiglie',
  icon: <Tent className="h-7 w-7" />, // o GraduationCap per coerenza
  path: '/turno/turno-famiglie',
  gradient: 'bg-gradient-to-br from-fuchsia-100 via-pink-50 to-rose-50 dark:from-fuchsia-950/50 dark:via-pink-950/30 dark:to-rose-950/30',
  borderColor: 'border-fuchsia-300 dark:border-fuchsia-700',
  iconBg: 'bg-gradient-to-br from-fuchsia-500 to-pink-600',
  iconColor: 'text-white',
}
```

Aggiornamenti collegati:
- Cambiare la griglia da `lg:grid-cols-5` a `lg:grid-cols-6` (riga 384) così tutte e 6 stanno su una riga su desktop.
- Estendere la query `turnoCounts` (righe 284-298) per contare anche le righe di `iscrizioni_famiglie`. Aggiungo una seconda query e popolo `turnoCounts['Turno famiglie']` con il numero di nuclei familiari iscritti.
- Il filtro permessi (riga 307-312) funziona già perché `TURNI` include già `Turno famiglie`. Gli admin la vedranno automaticamente; per gli altri staff sarà visibile solo se hanno il permesso turno corrispondente.

Risultato: nella sezione "Iscrizioni per turno" appariranno 6 card affiancate, l'ultima dedicata al Turno Famiglie con countdown iscritti aggiornato in tempo reale.

---

## 2. Pagina `TurnoFamigliePage` come "vera" pagina turno

La pagina esiste già in `/turno/turno-famiglie` (`src/pages/TurnoFamigliePage.tsx`). Il click sulla nuova card della Home porterà direttamente lì, esattamente come avviene per le altre 5 tab. Verifico che la pagina:
- Mostri il count totale famiglie/persone (già presente).
- Sia coerente nello stile con le pagine degli altri turni (header, layout `MainLayout`).
- Se mancano sezioni rispetto agli altri turni (es. lista iscritti rapida), allineo la struttura.

---

## 3. Aggiornamento pagamenti famiglie

In `src/hooks/usePagamenti.ts`:
- Aggiungere mutation `useUpdatePagamentoFamiglia` che scrive su `pagamenti_famiglie` (campi: `importo_dovuto`, `importo_pagato`, `stato`, `note`, `data_pagamento`).
- Quando la card pagamento ha `is_famiglia === true`, l'UI deve usare questa mutation invece di quella standard.
- Realtime già attivo sulla tabella → invalidazione automatica.

In `src/pages/GestionePagamenti.tsx`:
- Nel componente card pagamento, ramificare il salvataggio in base a `is_famiglia`.
- Permettere **inserimento manuale dell'importo dovuto** per le famiglie (le altre iscrizioni hanno importo fisso 230/250€).

---

## 4. Badge e identificazione visiva in Gestione Pagamenti

In `src/pages/GestionePagamenti.tsx`:
- Sulle card con `is_famiglia === true`:
  - Badge in alto a destra: **"🏕️ Turno Famiglie"** (stile `bg-fuchsia-500 text-white`, rounded-full).
  - Bordo card più marcato: `border-2 border-fuchsia-400 dark:border-fuchsia-600`.
  - Sfondo leggermente tinto: `bg-fuchsia-50/30 dark:bg-fuchsia-950/20`.
- Aggiungere chip filtro nella toolbar in alto: `Tutti | Standard | Turno Famiglie` per isolare velocemente le famiglie.
- Nel contatore in alto, aggiungere riga "Famiglie: N" accanto ai contatori esistenti (Da pagare / Parziale / Pagato).

Risultato: le iscrizioni famiglia sono **immediatamente riconoscibili** anche scorrendo velocemente la lista mista.

---

## File da modificare

- `src/pages/Home.tsx` — aggiunta 6ª card + griglia a 6 colonne + count famiglie
- `src/pages/TurnoFamigliePage.tsx` — allineamento layout (se necessario)
- `src/hooks/usePagamenti.ts` — mutation update famiglie
- `src/pages/GestionePagamenti.tsx` — badge, bordo, filtro, salvataggio condizionale

Nessuna modifica al database: le tabelle `iscrizioni_famiglie` e `pagamenti_famiglie` sono già pronte.
