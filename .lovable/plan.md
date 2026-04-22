

## Obiettivo
Creare una **social cover (OG image) ben fatta** per CUPAV Hub, così quando il link viene condiviso su WhatsApp/Facebook/Telegram appare un'anteprima curata invece dell'immagine generica rotta attuale.

Nota: l'immagine del progetto **dentro la dashboard Lovable** non è modificabile via codice — quella la cambi tu da Settings del progetto su Lovable (istruzioni sopra).

## Cosa faccio

### 1. Genero l'immagine OG (1200×630 px, formato standard social)
Design coerente con il branding CUPAV:
- Sfondo con gradiente verde (colore primario `#16a34a` definito nel manifest)
- Logo CUPAV ufficiale a sinistra
- Titolo grande **"CUPAV Hub"**
- Sottotitolo **"Campeggio Unità Pastorale Altavilla Valmarana"**
- Tagline piccola **"Estate 2026"**
- Stile minimal, tipografia leggibile, ottimizzata per anteprima social

Genero il PNG con uno script Node/canvas e lo salvo in `public/og-image.png`.

### 2. Aggiorno `index.html`
- `og:image` → `https://cupav.lovable.app/og-image.png` (già corretto, basta che il file esista)
- Aggiungo `og:image:width=1200` e `og:image:height=630` per forzare il rendering corretto su tutti i social
- Aggiungo `og:url` per canonical
- Aggiorno `og:description` con un testo più descrittivo della web app (gestionale del campeggio) invece del semplice "CUPAV Hub"

### 3. QA
Apro l'immagine generata, verifico che testo non sia tagliato, logo nitido, contrasto buono.

## Note
- Dopo il deploy potresti dover forzare il refresh della cache di WhatsApp/Facebook usando rispettivamente i loro debugger (Facebook Sharing Debugger / WhatsApp invia il link due volte).
- Per la cover dentro la dashboard Lovable: usa le istruzioni in alto — è una funzione della piattaforma, non del codice.

