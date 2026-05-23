## Export PDF — Turno Montaggio Campeggio

Aggiungo un pulsante **"Esporta PDF"** nella pagina `/turno/montaggio-campeggio` (accanto a "Calendario" e "Apri anagrafica completa") che genera un PDF completo con riepiloghi, suddivisioni per giorno ed elenco iscritti.

### Struttura del PDF

**Pagina 1 — Riepilogo generale**

- Header arancione/ambra con titolo "Montaggio Campeggio 2026" e data di generazione
- 3 card grandi con i totali: Iscrizioni, Persone totali, Totale da versare (€)
- Grafico a barre orizzontali: **Suddivisione per fascia d'età** (Adulti / Figli >10 / Bambini 4–10 / Bambini 0–3) con valori assoluti e percentuali
- Grafico a barre verticali: **Presenze per giornata** (Sab 30/05, Dom 31/05, Lun 01/06, Mar 02/06)

**Pagina 2 — Dettaglio giornaliero**
Tabella con una riga per ciascuno dei 4 giorni e colonne:
| Giorno | Adulti | Figli >10 | 4–10 anni | 0–3 anni | **Totale** |

I numeri coincidono esattamente con quelli mostrati nel Calendario presenze.

**Pagine seguenti — Elenco iscritti**  
Tabella paginata automaticamente (≈15–20 righe per pagina A4) con tutti gli iscritti non archiviati, ordinati per Cognome Nome. Colonne:  
| Cognome Nome | Residenza | Giorni selezionati | Adulti | >10 | 4–10 | 0–3 | **Tot pers.** | Notti | **Importo €** |

In fondo all'ultima pagina: riga riepilogo con **totale persone** e **totale importo** da versare.

Footer su tutte le pagine: "CUPAV — Montaggio Campeggio" + numero pagina.

### Dettagli tecnici

- Libreria: **jsPDF + jspdf-autotable** (già adatte a tabelle paginate; nessuna dipendenza nuova pesante). I "grafici" della pagina 1 sono disegnati direttamente con primitive `rect()` per restare leggeri e nitidi (no canvas/png).
- Nuovo file `src/lib/exportMontaggioPdf.ts` che esporta `exportMontaggioPdf(items: IscrizioneMontaggio[])`:
  - calcola aggregati per fascia d'età e per giorno (riusa `GIORNI_MONTAGGIO`, `totalePartecipanti`, `formatEuro`)
  - genera le 3 sezioni descritte sopra
  - salva con nome `montaggio-campeggio-YYYY-MM-DD.pdf`
- Modifica `src/pages/TurnoMontaggioPage.tsx`:
  - aggiungo pulsante `<Button variant="outline">Esporta PDF</Button>` con icona `FileDown` nella riga azioni
  - onClick chiama `exportMontaggioPdf(items)` (solo iscritti non archiviati, stessi dati visibili in pagina)
  - toast di conferma con `sonner`
- Colori: palette ambra/arancione coerente con la pagina (`#f59e0b`, `#ea580c`) per header e barre.

### Cosa NON cambia

- Nessuna modifica al database o agli edge function.
- L'anagrafica completa, il calendario e le card restano invariati.