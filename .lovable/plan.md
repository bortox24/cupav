
# Modifiche Anagrafica Ragazzi

## Panoramica

Trasformeremo le card dei ragazzi in card compatte con solo le informazioni essenziali visibili. Cliccando su una card si aprira' un Dialog (finestra modale) con tutti i dettagli e la possibilita' di modificare la scheda anagrafica e gestire le iscrizioni anno per anno.

---

## 1. Card compatte (vista esterna)

Ogni card mostrera' solo:
- **Nome e cognome**
- **Data di nascita** in formato dd-mm-yyyy
- **Badge** Residente / Non residente
- **Turno iscrizione anno corrente** (2026, calcolato dinamicamente con `new Date().getFullYear()`)

Cliccando sulla card si apre il dettaglio completo.

---

## 2. Dialog dettaglio completo

Una finestra modale (Dialog) che si apre al click sulla card, contenente:

### Sezione dati ragazzo
- Nome e cognome, data di nascita, residenza (tutti i dati della card esterna ripetuti)

### Sezione genitori
- Lista genitori con nome, ruolo, email, telefono

### Sezione iscrizioni (storico annuale)
- Lista di tutte le iscrizioni ordinate per anno (anno corrente in primo piano, evidenziato)
- Es: **2026: 5^ Elementare** (in evidenza), 2025: 4^ Elementare, etc.

### Azioni di modifica
- **Pulsante "Modifica"**: apre una modalita' di editing inline nel Dialog dove si possono modificare tutti i campi (nome, data nascita, residenza, dati genitori)
- **Pulsante "Aggiungi iscrizione"**: permette di aggiungere una nuova riga anno/turno (per anni precedenti o futuri)
- **Possibilita' di eliminare** iscrizioni esistenti

---

## 3. Hook aggiornato (`useRagazzi.ts`)

Aggiungere funzioni di mutation:
- `useUpdateRagazzo()`: aggiorna dati anagrafici (full_name, data_nascita, residente_altavilla) e genitori
- `useAddIscrizione()`: inserisce una nuova iscrizione (anno + turno) per un ragazzo
- `useDeleteIscrizione()`: rimuove un'iscrizione

Tutte le mutation invalideranno la query `['ragazzi']` per aggiornare la lista automaticamente.

---

## 4. Anno corrente dinamico

L'anno corrente verra' calcolato con `new Date().getFullYear()` (attualmente 2026). L'anno prossimo il sistema mostrera' automaticamente 2027 in primo piano senza modifiche al codice.

---

## Dettaglio tecnico

### File da modificare

1. **`src/pages/AnagraficaRagazzi.tsx`**
   - Card compatta: mostra solo nome, data nascita (dd-mm-yyyy), badge residenza, turno anno corrente
   - Click sulla card apre un `Dialog`
   - Dialog con vista completa + form di modifica inline
   - Form per aggiungere nuove iscrizioni (select anno + select turno)
   - Pulsante elimina per iscrizioni

2. **`src/hooks/useRagazzi.ts`**
   - Aggiungere `useUpdateRagazzo` mutation (update ragazzo + delete/re-insert genitori)
   - Aggiungere `useAddIscrizione` mutation
   - Aggiungere `useDeleteIscrizione` mutation
   - Funzione helper per formattare data in dd-mm-yyyy

### Nessuna modifica al database
Le tabelle e le RLS policies esistenti supportano gia' tutte le operazioni necessarie (UPDATE su ragazzi, DELETE/INSERT su genitori e iscrizioni per utenti autenticati con accesso alla pagina).
