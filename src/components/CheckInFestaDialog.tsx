import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Search, CheckCircle2, AlertTriangle, Undo2, Banknote, Radio } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { type FestaCampeggio, parseAllergie } from "@/hooks/useFestaCampeggio";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: FestaCampeggio[];
  realtimeConnected: boolean;
  onCheckIn: (item: FestaCampeggio) => Promise<void> | void;
  onUndoCheckIn: (item: FestaCampeggio) => Promise<void> | void;
  onMarkPagato: (item: FestaCampeggio) => Promise<void> | void;
}

const persone = (i: FestaCampeggio) => i.num_adulti + i.num_ragazzi + i.num_staff;

export function CheckInFestaDialog({ open, onOpenChange, items, realtimeConnected, onCheckIn, onUndoCheckIn, onMarkPagato }: Props) {
  const [search, setSearch] = useState("");
  const [soloDaArrivare, setSoloDaArrivare] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  const stats = useMemo(() => ({
    previste: items.reduce((s, i) => s + persone(i), 0),
    arrivate: items.filter(i => i.arrivato).reduce((s, i) => s + persone(i), 0),
    incassato: items.filter(i => i.pagato).reduce((s, i) => s + i.contributo, 0),
  }), [items]);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items
      .filter(i => (soloDaArrivare ? !i.arrivato : true))
      .filter(i => !q
        || `${i.cognome} ${i.nome}`.toLowerCase().includes(q)
        || (i.email || '').toLowerCase().includes(q)
        || (i.telefono || '').toLowerCase().includes(q))
      .sort((a, b) => `${a.cognome} ${a.nome}`.localeCompare(`${b.cognome} ${b.nome}`, 'it'));
  }, [items, search, soloDaArrivare]);

  const handleCheckIn = async (item: FestaCampeggio) => {
    await onCheckIn(item);
    toast({
      title: `${item.cognome} ${item.nome} — check-in ok`,
      description: `${persone(item)} persone · da incassare ${item.pagato ? 0 : item.contributo}€`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-2xl p-0 max-h-[92vh] flex flex-col gap-0">
        <DialogHeader className="p-4 pb-3 border-b space-y-3">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <CheckCircle2 className="h-5 w-5 text-fuchsia-500" /> Modalità Check-in
            </DialogTitle>
            <Badge variant="outline" className={realtimeConnected ? "border-green-500 text-green-600 gap-1" : "border-muted text-muted-foreground gap-1"}>
              <Radio className="h-3 w-3" /> {realtimeConnected ? "In tempo reale" : "Offline"}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-muted/40 p-2 text-center">
              <p className="text-xl font-bold tabular-nums">{stats.arrivate}<span className="text-sm text-muted-foreground">/{stats.previste}</span></p>
              <p className="text-[11px] text-muted-foreground">Persone arrivate</p>
            </div>
            <div className="rounded-xl bg-muted/40 p-2 text-center">
              <p className="text-xl font-bold tabular-nums text-fuchsia-600">{stats.incassato}€</p>
              <p className="text-[11px] text-muted-foreground">Incassato</p>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cerca nome, cognome, telefono..."
              className="pl-9 h-12 text-base rounded-xl"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch id="solo-da-arrivare" checked={soloDaArrivare} onCheckedChange={setSoloDaArrivare} />
            <Label htmlFor="solo-da-arrivare" className="text-sm text-muted-foreground">Mostra solo chi deve ancora arrivare</Label>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {list.map(item => {
            const allergie = parseAllergie(item.allergie);
            return (
              <div key={item.id} className="rounded-2xl border p-3 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-tight truncate">{item.cognome} {item.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {persone(item)} persone · {item.contributo}€ {item.pagato ? '· pagato' : ''}
                  </p>
                  {allergie.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {allergie.map((r, idx) => (
                        <Badge key={idx} variant="outline" className="border-amber-400 text-amber-700 dark:text-amber-300 gap-1 text-[10px]">
                          <AlertTriangle className="h-3 w-3" /> {r.nome} ×{r.quantita}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {item.arrivato && item.arrivato_da && (
                    <p className="text-[11px] text-green-600 mt-1">Arrivato · {item.arrivato_da}</p>
                  )}
                </div>
                {item.arrivato ? (
                  <div className="flex flex-col gap-1 shrink-0">
                    {!item.pagato && (
                      <Button size="sm" className="rounded-xl gap-1" onClick={() => onMarkPagato(item)}>
                        <Banknote className="h-4 w-4" /> Pagato
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="rounded-xl gap-1 text-muted-foreground" onClick={() => onUndoCheckIn(item)}>
                      <Undo2 className="h-4 w-4" /> Annulla
                    </Button>
                  </div>
                ) : (
                  <Button size="lg" className="rounded-xl shrink-0" onClick={() => handleCheckIn(item)}>
                    Check-in
                  </Button>
                )}
              </div>
            );
          })}
          {list.length === 0 && (
            <p className="text-center py-12 text-muted-foreground">
              {soloDaArrivare ? "Tutti arrivati! 🎉" : "Nessun risultato."}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
