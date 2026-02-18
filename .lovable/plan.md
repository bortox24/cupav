
# Preiscrizione CUPAV - Sistema Anagrafico

## Panoramica

Creeremo un sistema composto da due parti:

1. **Pagina pubblica** (`/preiscrizione-cupav`) - Form di preiscrizione accessibile a chiunque, senza login
2. **Gestionale anagrafico** (`/anagrafica-ragazzi`) - Pagina protetta con card per ogni ragazzo, ricerca e storico iscrizioni per anno

I dati verranno salvati in tabelle dedicate, separate dal sistema moduli esistente, per costruire un vero gestionale anagrafico scalabile.

---

## Struttura Database

### Tabella `ragazzi` (anagrafica principale)
Contiene i dati del ragazzo. Il campo `full_name` sara' il record unico per evitare duplicati.

| Colonna | Tipo | Note |
|---------|------|------|
| id | uuid | PK |
| full_name | text | UNIQUE, nome e cognome |
| data_nascita | text | Data di nascita |
| residente_altavilla | boolean | Si/No |
| created_at | timestamp | Auto |
| updated_at | timestamp | Auto |

### Tabella `ragazzi_genitori` (genitori associati)
Ogni ragazzo puo' avere 1 o 2 genitori.

| Colonna | Tipo | Note |
|---------|------|------|
| id | uuid | PK |
| ragazzo_id | uuid | FK -> ragazzi |
| nome_cognome | text | |
| ruolo | text | Mamma/Papa' |
| email | text | |
| telefono | text | |

### Tabella `ragazzi_iscrizioni` (storico annuale)
Ogni anno il ragazzo puo' avere un'iscrizione con il turno corrispondente. Questo rende il sistema scalabile: 2026 -> 5^ Elementare, 2027 -> 1^ Media, ecc.

| Colonna | Tipo | Note |
|---------|------|------|
| id | uuid | PK |
| ragazzo_id | uuid | FK -> ragazzi |
| anno | integer | Es. 2026 |
| turno | text | Es. "5^ Elementare" |
| created_at | timestamp | Auto |

### RLS Policies
- `ragazzi`, `ragazzi_genitori`, `ragazzi_iscrizioni`: INSERT aperto a tutti (anon) per il form pubblico; SELECT/UPDATE/DELETE solo per admin o utenti con permesso sulla pagina `/anagrafica-ragazzi`

---

## Pagina Pubblica: `/preiscrizione-cupav`

File: `src/pages/public/PreiscrizioneCupav.tsx`

- Stesso stile del ModuloForm esistente (header con logo, footer CUPAV)
- Campi organizzati in sezioni con le card visive (come gia' implementato):
  - **Dati ragazzo/a**: Nome e Cognome, Data di nascita, Turno (radio: 4^ Elem, 5^ Elem, 1^ Media, 2^ Media, 3^ Media), Residente ad Altavilla (Si/No)
  - **Dati genitore 1**: Nome e Cognome, Chi (Mamma/Papa'), Email, Telefono
  - **Dati genitore 2** (opzionale): stessi campi
- Al submit:
  - Cerca il ragazzo per `full_name`
  - Se esiste: aggiunge solo l'iscrizione per l'anno corrente (2026) e aggiorna i dati genitori
  - Se non esiste: crea il ragazzo, i genitori e l'iscrizione
- Super responsive per mobile (grid a colonna singola su mobile, 2 colonne su desktop per i campi affiancati)

---

## Gestionale Anagrafico: `/anagrafica-ragazzi`

File: `src/pages/AnagraficaRagazzi.tsx`

Pagina protetta (richiede autenticazione + permesso pagina).

### Layout
- Header standard con titolo "Anagrafica Ragazzi"
- **Barra di ricerca** sotto l'header per filtrare per nome
- **Griglia di card** responsive (1 colonna mobile, 2 tablet, 3 desktop)

### Card ragazzo
Ogni card mostra:
- Nome e cognome (titolo)
- Data di nascita
- Residente ad Altavilla (badge Si/No)
- **Storico iscrizioni**: lista anno -> turno (es. "2026: 5^ Elementare", "2027: 1^ Media")
- Dati genitori (nome, ruolo, email, telefono)
- Possibilita' in futuro di aggiungere manualmente un'iscrizione per un nuovo anno

---

## Routing e Permessi

### Modifiche a `src/App.tsx`
- Aggiungere route pubblica `/preiscrizione-cupav` -> `PreiscrizioneCupav`
- Aggiungere route protetta `/anagrafica-ragazzi` -> `AnagraficaRagazzi`

### Modifiche a `src/hooks/usePagePermissions.ts`
- Aggiungere `/anagrafica-ragazzi` all'array `availablePages`

---

## File da creare
1. `src/pages/public/PreiscrizioneCupav.tsx` - Form pubblico
2. `src/pages/AnagraficaRagazzi.tsx` - Gestionale anagrafico
3. `src/hooks/useRagazzi.ts` - Hook per CRUD ragazzi, genitori, iscrizioni

## File da modificare
1. `src/App.tsx` - Nuove route
2. `src/hooks/usePagePermissions.ts` - Nuova pagina nei permessi

## Migrazione database
1. Creazione tabelle `ragazzi`, `ragazzi_genitori`, `ragazzi_iscrizioni` con RLS
