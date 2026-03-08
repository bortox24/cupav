

## Piano: Esporta dropdown solo su click

### Problema
Il menu "Esporta" nella pagina Anagrafica Ragazzi si apre involontariamente durante lo scroll (su mobile il touch-scroll sul pulsante viene interpretato come tap).

### Soluzione
Sostituire il `DropdownMenu` con un `Popover` controllato manualmente tramite stato `open`/`setOpen`, in modo che si apra solo su click esplicito del pulsante (non su touch passivo durante lo scroll).

In alternativa, gestire lo stato `open` del `DropdownMenu` stesso con `onOpenChange` e un controllo che distingua click intenzionali dallo scroll.

### Approccio concreto
In `src/pages/AnagraficaRagazzi.tsx` (righe 861-878):
- Aggiungere uno stato `const [exportOpen, setExportOpen] = useState(false)`
- Passare `open={exportOpen}` e `onOpenChange={setExportOpen}` al `DropdownMenu`
- Sul `Button` trigger, aggiungere `onClick={(e) => { e.preventDefault(); setExportOpen(!exportOpen); }}` per garantire apertura solo su click esplicito

### File modificato
- `src/pages/AnagraficaRagazzi.tsx`

