# Revisione presentazione "Account Staff CUPAV"

Aggiorno il PDF esistente (`presentazione-account-staff-cupav.pdf`) salvando una nuova versione (`presentazione-account-staff-cupav_v2.pdf`) con le correzioni richieste.

## Modifiche

1. **Rimuovere la slide "Chi vede cosa a colpo d'occhio"** (la tabella comparativa dei permessi). Mostrare tutto subito è fuorviante.

2. **Pulire la slide della Home / vista staff** — eliminare il blocco esplicativo in basso ("lo staff vede solo il saluto, il countdown, niente pulsanti di gestione, solo i turni assegnati"). Questi confronti "account vs staff" non servono: la piattaforma è già riservata solo allo staff.

3. **Download lista identico per tutti** — chiarire che animatori e responsabili scaricano la **stessa** lista. Le opzioni di download non cambiano tra i ruoli staff.

4. **Rimuovere la slide del "download lista completa"** (era una vista admin). Nessun account staff vede l'export completo: è riservato solo a chi ha un profilo admin reale.

5. **Correggere la distinzione tra ruoli** (no admin, solo account staff):
   - **Animatore**: vede solo le tab **Appello**, **Tende** e **Download lista**.
   - **Responsabili (campo/animatori) e Cuochi**: vedono in più i **Dettagli Ragazzi** (con allergie) e i **Dettagli Staff** (con dati interni e allergie).
   Mantengo le slide che illustrano questi dettagli, già impostate bene.

6. **Nuova ultima slide con QR code** ad alta definizione che punta a `https://cupav.lovable.app`. QR generato in alta risoluzione, grande e ben leggibile anche da lontano, con testo invito a scansionare per entrare nella piattaforma (e nota che seguiranno istruzioni per aggiungerlo alla home del telefono).

## Struttura finale (indicativa)
1. Copertina
2. Perché gli account staff
3. Vista Home / piattaforma riservata (senza blocco confronto)
4. ANIMATORE — solo Appello, Tende, Download lista
5. Appello (screenshot)
6. Tende (screenshot)
7. Download lista (uguale per tutti i ruoli)
8. RESPONSABILI / CUOCHI — in più Dettagli Ragazzi e Dettagli Staff
9. Dettagli Ragazzi (allergie)
10. Dettagli Staff (dati interni / allergie)
11. Privacy / dati sensibili
12. QR code → cupav.lovable.app

## Note tecniche
- Riuso gli screenshot e lo stile/branding CUPAV già prodotti (logo, colori verde/arancio/blu, font Poppins).
- QR generato con `qrcode` (Python) ad alta risoluzione (box grandi, error correction H), inserito su slide dedicata.
- QA visiva di ogni pagina (conversione in immagini) prima della consegna; correggo e ri-verifico finché pulito.
- Output salvato in `/mnt/documents/presentazione-account-staff-cupav_v2.pdf`.