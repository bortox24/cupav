# Festa Campeggio: blocco doppioni via email

## Cosa ho trovato nei dati
Su 84 adesioni ci sono 83 email diverse: esiste **un solo doppione reale**, la stessa persona inserita due volte con la stessa email (Camilla Bonetto, maddalenaborghi@yahoo.com, il 2 settembre alle 14:40 e il 7 settembre alle 11:16). Nessun altro nome ripetuto.

## Come funzionerà il controllo
1. L'email nel punto 1 "Anagrafica" resta obbligatoria (già lo è) e viene mostrata come tale.
2. Appena la persona finisce di scrivere l'email e sposta il dito/cursore altrove (o dopo circa un secondo di pausa), il modulo controlla da solo se quell'email ha già un'adesione.
3. Durante il controllo compare una piccola scritta "Verifica in corso...".
4. Se l'email è **già iscritta**: appare un avviso rosso sotto il campo, **senza nomi e cognomi**, che indica solo la composizione già registrata — es. "Con questa email risulta già un'adesione per 2 adulti e 1 ragazzo. Non è possibile iscriversi due volte." (le voci con valore zero non vengono elencate) — e il pulsante "Conferma adesione" resta bloccato, con la stessa spiegazione sotto.
5. Se l'email è libera: nessun messaggio, si continua normalmente.
6. Se cambia l'email, il controllo si rifà da zero.
7. Controllo ripetuto anche al momento dell'invio, così due invii contemporanei non passano.

Nota: chi vede l'avviso può contattare l'indirizzo email CUPAV già presente nel modulo se pensa che sia un errore.

## Dettagli tecnici
- Nuova Edge Function `check-festa-duplicate` (service role, pubblica, `verify_jwt = false`): riceve `{ email }`, normalizza (trim + lowercase), interroga `festa_campeggio` e ritorna `{ exists, nome, cognome, created_at }`. Stesso schema di `check-iscrizione-duplicate`, incluso limite di lunghezza input e CORS.
- Motivo dell'Edge Function: la tabella non è leggibile in anonimo, quindi il controllo non può avvenire dal client.
- In `src/pages/public/FestaCampeggio.tsx`: stato `emailCheck` (`idle | checking | free | duplicate`), debounce ~700 ms + trigger su `onBlur`, chiamata via `supabase.functions.invoke`, avviso inline sotto il campo email, `isValid` esteso con `emailCheck !== 'duplicate'`, e ricontrollo dentro `handleSubmit` prima dell'insert.
- Nessun indice unico a livello database (romperebbe casi legittimi come due nuclei familiari che condividono un indirizzo email); il vincolo resta a livello di modulo.
- Il doppione esistente non viene toccato: se vuoi lo elimino dalla pagina gestionale su tua conferma.
