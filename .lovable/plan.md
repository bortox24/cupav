

## Piano: Export PDF/CSV lista ragazzi divisi per turno

### Obiettivo
Aggiungere un pulsante di download nella pagina Anagrafica Ragazzi che permette di esportare la lista dei ragazzi attivi (non archiviati) in PDF o CSV, divisi per turno (gruppo), con ordinamento: prima per numero crescente (nulli in fondo), poi alfabetico A-Z.

### Implementazione

#### 1. Pulsante download con dropdown (PDF/CSV)
- Aggiungere un `DropdownMenu` nella toolbar accanto al pulsante "Arricchisci tutti"
- Icona `Download` con due opzioni: "Scarica PDF" e "Scarica CSV"

#### 2. Logica di raggruppamento e ordinamento
- Raggruppare i ragazzi attivi con iscrizione anno corrente per turno
- Ordinare i turni secondo l'ordine di `TURNI_OPTIONS`
- Dentro ogni turno: prima per `numero` crescente (null in fondo), poi per `full_name` alfabetico
- Ragazzi senza iscrizione corrente in un gruppo "Senza turno" alla fine

#### 3. Export PDF (jspdf + jspdf-autotable, già installati)
- Per ogni turno: titolo sezione + tabella con colonne: #, Nome, Data nascita, Residente, Genitore, Telefono
- Layout professionale con separazione tra gruppi

#### 4. Export CSV
- Header: Turno, Numero, Nome, Data nascita, Residente, Genitore, Telefono
- UTF-8 BOM per compatibilità Excel
- Righe raggruppate per turno

### File modificati
- `src/pages/AnagraficaRagazzi.tsx` — aggiunta pulsante dropdown + funzioni `exportPDF` e `exportCSV`

