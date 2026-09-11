import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import {
  useFestaCampeggio,
  useUpdateFestaCampeggio,
  parseAllergie,
  totalePersone,
  personeArrivate,
  residuoDaPagare,
  COSTO_FESTA_ADULTO,
  COSTO_FESTA_RAGAZZO,
  COSTO_FESTA_STAFF,
  type FestaCampeggio,
} from "@/hooks/useFestaCampeggio";
import {
  Search, X, ArrowLeft, Radio, CheckCircle2, AlertTriangle, Minus, Plus,
  Loader2, Undo2, Users, Banknote,
} from "lucide-react";

type Stepper = { adulti: number; ragazzi: number; staff: number };

const rimanenti = (i: FestaCampeggio): Stepper => ({
  adulti: Math.max(0, i.num_adulti - (i.arrivati_adulti ?? 0)),
  ragazzi: Math.max(0, i.num_ragazzi - (i.arrivati_ragazzi ?? 0)),
  staff: Math.max(0, i.num_staff - (i.arrivati_staff ?? 0)),
});

const importoDi = (s: Stepper) =>
  s.adulti * COSTO_FESTA_ADULTO + s.ragazzi * COSTO_FESTA_RAGAZZO + s.staff * COSTO_FESTA_STAFF;

export default function FestaCampeggioCheckIn() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const fullName = profile?.full_name || "Sistema";
  const { data: items = [], isLoading, realtimeConnected } = useFestaCampeggio();
  const update = useUpdateFestaCampeggio();

  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [entrati, setEntrati] = useState<Stepper>({ adulti: 0, ragazzi: 0, staff: 0 });
  const [pagaOra, setPagaOra] = useState(0);
  const [lastAction, setLastAction] = useState<{ id: string; nome: string; before: Partial<FestaCampeggio> } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = items.find(i => i.id === selectedId) || null;

  useEffect(() => {
    if (!selected) setTimeout(() => inputRef.current?.focus(), 100);
  }, [selected]);

  const stats = useMemo(() => ({
    previste: items.reduce((s, i) => s + totalePersone(i), 0),
    entrate: items.reduce((s, i) => s + personeArrivate(i), 0),
    incassato: items.reduce((s, i) => s + (i.importo_incassato ?? 0), 0),
  }), [items]);

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length < 2) return [];
    return items
      .filter(i =>
        `${i.cognome} ${i.nome}`.toLowerCase().includes(q) ||
        `${i.nome} ${i.cognome}`.toLowerCase().includes(q) ||
        (i.email || "").toLowerCase().includes(q) ||
        (i.telefono || "").toLowerCase().includes(q))
      .sort((a, b) => `${a.cognome} ${a.nome}`.localeCompare(`${b.cognome} ${b.nome}`, "it"))
      .slice(0, 8);
  }, [items, search]);

  const openItem = (item: FestaCampeggio) => {
    const rest = rimanenti(item);
    setSelectedId(item.id);
    setEntrati(rest);
    setPagaOra(Math.min(residuoDaPagare(item), importoDi(rest)));
  };

  const closeItem = () => {
    setSelectedId(null);
    setSearch("");
  };

  const conferma = async () => {
    if (!selected) return;
    const nuoviArrivatiA = (selected.arrivati_adulti ?? 0) + entrati.adulti;
    const nuoviArrivatiR = (selected.arrivati_ragazzi ?? 0) + entrati.ragazzi;
    const nuoviArrivatiS = (selected.arrivati_staff ?? 0) + entrati.staff;
    const totArrivati = nuoviArrivatiA + nuoviArrivatiR + nuoviArrivatiS;
    const nuovoIncassato = Math.min(selected.contributo, (selected.importo_incassato ?? 0) + pagaOra);
    const tuttiDentro = totArrivati >= totalePersone(selected);
    const saldato = nuovoIncassato >= selected.contributo;
    const now = new Date().toISOString();

    const before: Partial<FestaCampeggio> = {
      arrivati_adulti: selected.arrivati_adulti ?? 0,
      arrivati_ragazzi: selected.arrivati_ragazzi ?? 0,
      arrivati_staff: selected.arrivati_staff ?? 0,
      importo_incassato: selected.importo_incassato ?? 0,
      arrivato: selected.arrivato,
      arrivato_da: selected.arrivato_da,
      arrivato_at: selected.arrivato_at,
      pagato: selected.pagato,
      pagato_da: selected.pagato_da,
      pagato_at: selected.pagato_at,
    };

    try {
      await update.mutateAsync({
        id: selected.id,
        updates: {
          arrivati_adulti: nuoviArrivatiA,
          arrivati_ragazzi: nuoviArrivatiR,
          arrivati_staff: nuoviArrivatiS,
          importo_incassato: nuovoIncassato,
          arrivato: tuttiDentro,
          arrivato_da: totArrivati > 0 ? fullName : null,
          arrivato_at: totArrivati > 0 ? (selected.arrivato_at || now) : null,
          pagato: saldato,
          pagato_da: nuovoIncassato > 0 ? fullName : null,
          pagato_at: nuovoIncassato > 0 ? (selected.pagato_at || now) : null,
        },
      });
      const residuo = selected.contributo - nuovoIncassato;
      const daEntrare = totalePersone(selected) - totArrivati;
      setLastAction({ id: selected.id, nome: `${selected.cognome} ${selected.nome}`, before });
      toast({
        title: `${selected.cognome} ${selected.nome} — check-in registrato`,
        description: `${entrati.adulti + entrati.ragazzi + entrati.staff} persone entrate · incassati ${pagaOra}€` +
          (residuo > 0 ? ` · residuo ${residuo}€` : " · saldato") +
          (daEntrare > 0 ? ` · ${daEntrare} ancora da entrare` : ""),
      });
      closeItem();
    } catch (e: any) {
      toast({ title: "Errore", description: e.message, variant: "destructive" });
    }
  };

  const annullaUltimo = async () => {
    if (!lastAction) return;
    try {
      await update.mutateAsync({ id: lastAction.id, updates: lastAction.before });
      toast({ title: `Check-in annullato · ${lastAction.nome}` });
      setLastAction(null);
    } catch (e: any) {
      toast({ title: "Errore", description: e.message, variant: "destructive" });
    }
  };

  const StepperRow = ({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (v: number) => void }) => (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-background/70 border p-3">
      <div>
        <p className="font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground">max {max}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" size="icon" variant="outline" className="rounded-full h-11 w-11" disabled={value <= 0}
          onClick={() => onChange(Math.max(0, value - 1))}>
          <Minus className="h-5 w-5" />
        </Button>
        <span className="w-10 text-center text-2xl font-bold tabular-nums">{value}</span>
        <Button type="button" size="icon" variant="outline" className="rounded-full h-11 w-11" disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}>
          <Plus className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-fuchsia-100 via-background to-purple-100 dark:from-fuchsia-950/40 dark:via-background dark:to-purple-950/30">
      <div className="mx-auto w-full max-w-xl px-4 pb-24 pt-4 flex flex-col min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" className="rounded-xl gap-1 -ml-2"
            onClick={() => (selected ? closeItem() : navigate("/festa-campeggio-iscrizioni"))}>
            <ArrowLeft className="h-4 w-4" /> {selected ? "Indietro" : "Esci"}
          </Button>
          <Badge variant="outline" className={realtimeConnected
            ? "border-green-500 text-green-600 gap-1 bg-background/70"
            : "border-muted text-muted-foreground gap-1 bg-background/70"}>
            <Radio className="h-3 w-3" /> {realtimeConnected ? "In tempo reale" : "Connessione..."}
          </Badge>
        </div>

        {/* Contatori */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="rounded-2xl bg-background/70 border p-3 text-center">
            <p className="text-2xl font-bold tabular-nums">
              {stats.entrate}<span className="text-base text-muted-foreground">/{stats.previste}</span>
            </p>
            <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1"><Users className="h-3 w-3" /> Persone entrate</p>
          </div>
          <div className="rounded-2xl bg-background/70 border p-3 text-center">
            <p className="text-2xl font-bold tabular-nums text-fuchsia-600">{stats.incassato}€</p>
            <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1"><Banknote className="h-3 w-3" /> Incassato</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-fuchsia-500" /></div>
        ) : !selected ? (
          /* ---------- STEP 1: ricerca ---------- */
          <div className="flex-1 flex flex-col justify-center py-10">
            <h1 className="text-center text-2xl font-bold tracking-tight mb-1">Check-in Festa</h1>
            <p className="text-center text-sm text-muted-foreground mb-6">Scrivi il nome per trovare l'adesione</p>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
              <Input
                ref={inputRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cerca nome, cognome, telefono..."
                className="h-14 rounded-2xl pl-12 pr-12 text-base bg-background/90 shadow-lg border-fuchsia-200 dark:border-fuchsia-900"
              />
              {search && (
                <button type="button" onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground p-1">
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            <div className="mt-3 space-y-2">
              {search.trim().length >= 2 && results.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-6">Nessuna adesione trovata.</p>
              )}
              {results.map(item => {
                const entrate = personeArrivate(item);
                const tot = totalePersone(item);
                const allergie = parseAllergie(item.allergie);
                const incassato = item.importo_incassato ?? 0;
                const saldato = incassato >= item.contributo;
                const completo = tot > 0 && entrate >= tot;
                const statoClasse = completo && saldato
                  ? "border-green-500/70 bg-green-500/10"
                  : (entrate > 0 || incassato > 0)
                    ? "border-amber-500/70 bg-amber-500/10"
                    : "border-red-500/60 bg-red-500/10";
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openItem(item)}
                    className={`w-full text-left rounded-2xl border p-3 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3 ${statoClasse}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">{item.cognome} {item.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.num_adulti} ad. · {item.num_ragazzi} rag. · {item.num_staff} staff · {item.contributo}€
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <Badge variant="outline" className={entrate >= tot ? "border-green-500 text-green-600 text-[10px]" : "text-[10px] text-muted-foreground"}>
                          Entrati {entrate}/{tot}
                        </Badge>
                        <Badge variant="outline" className={(item.importo_incassato ?? 0) >= item.contributo ? "border-green-500 text-green-600 text-[10px]" : "text-[10px] text-muted-foreground"}>
                          Incassato {item.importo_incassato ?? 0}/{item.contributo}€
                        </Badge>
                        {allergie.map((r, idx) => (
                          <Badge key={idx} variant="outline" className="border-amber-400 text-amber-700 dark:text-amber-300 gap-1 text-[10px]">
                            <AlertTriangle className="h-3 w-3" /> {r.nome} ×{r.quantita}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-xl bg-fuchsia-500 text-white px-3 py-2 text-sm font-semibold">Check-in</span>
                  </button>
                );
              })}
            </div>

            {lastAction && (
              <Button variant="ghost" className="rounded-xl gap-1 mt-6 text-muted-foreground self-center" onClick={annullaUltimo}>
                <Undo2 className="h-4 w-4" /> Annulla ultimo check-in ({lastAction.nome})
              </Button>
            )}
          </div>
        ) : (
          /* ---------- STEP 2: dettaglio ---------- */
          (() => {
            const rest = rimanenti(selected);
            const tot = totalePersone(selected);
            const giaEntrati = personeArrivate(selected);
            const residuo = residuoDaPagare(selected);
            const oraTot = entrati.adulti + entrati.ragazzi + entrati.staff;
            const importoChiEntra = Math.min(residuo, importoDi(entrati));
            const allergie = parseAllergie(selected.allergie);
            return (
              <div className="flex-1 py-4 space-y-4">
                <div className="rounded-2xl border bg-background/90 p-4 shadow-sm">
                  <p className="text-lg font-bold leading-tight">{selected.cognome} {selected.nome}</p>
                  <p className="text-sm text-muted-foreground">
                    Prenotazione: {selected.num_adulti} adulti · {selected.num_ragazzi} ragazzi · {selected.num_staff} staff
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <Badge variant="outline" className="text-[11px]">Entrati {giaEntrati}/{tot}</Badge>
                    <Badge variant="outline" className="text-[11px]">Incassato {selected.importo_incassato ?? 0}/{selected.contributo}€</Badge>
                    {allergie.map((r, idx) => (
                      <Badge key={idx} variant="outline" className="border-amber-400 text-amber-700 dark:text-amber-300 gap-1 text-[11px]">
                        <AlertTriangle className="h-3 w-3" /> {r.nome} ×{r.quantita}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Persone entrate ora */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Chi entra adesso</Label>
                    <Button size="sm" variant="outline" className="rounded-xl"
                      onClick={() => { setEntrati(rest); setPagaOra(Math.min(residuo, importoDi(rest))); }}>
                      Sono arrivati tutti
                    </Button>
                  </div>
                  {rest.adulti > 0 && (
                    <StepperRow label="Adulti" value={entrati.adulti} max={rest.adulti}
                      onChange={v => setEntrati(p => ({ ...p, adulti: v }))} />
                  )}
                  {rest.ragazzi > 0 && (
                    <StepperRow label="Ragazzi" value={entrati.ragazzi} max={rest.ragazzi}
                      onChange={v => setEntrati(p => ({ ...p, ragazzi: v }))} />
                  )}
                  {rest.staff > 0 && (
                    <StepperRow label="Staff" value={entrati.staff} max={rest.staff}
                      onChange={v => setEntrati(p => ({ ...p, staff: v }))} />
                  )}
                  {rest.adulti + rest.ragazzi + rest.staff === 0 && (
                    <p className="rounded-2xl border bg-background/70 p-3 text-sm text-green-600 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" /> Tutti già entrati
                    </p>
                  )}
                </div>

                {/* Pagamento */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Quanto si incassa adesso</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant={pagaOra === importoChiEntra ? "default" : "outline"} className="rounded-xl h-12"
                      onClick={() => setPagaOra(importoChiEntra)}>
                      Solo chi entra · {importoChiEntra}€
                    </Button>
                    <Button variant={pagaOra === residuo ? "default" : "outline"} className="rounded-xl h-12"
                      onClick={() => setPagaOra(residuo)}>
                      Saldo totale · {residuo}€
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input type="number" min={0} max={residuo} inputMode="numeric"
                      value={pagaOra}
                      onChange={e => setPagaOra(Math.max(0, Math.min(residuo, Number(e.target.value) || 0)))}
                      className="h-12 rounded-xl text-base bg-background/90" />
                    <span className="text-sm text-muted-foreground shrink-0">€ incassati ora</span>
                  </div>
                  <div className="rounded-2xl bg-background/70 border p-3 text-sm grid grid-cols-3 gap-2 text-center">
                    <div><p className="font-bold">{selected.contributo}€</p><p className="text-[11px] text-muted-foreground">Totale</p></div>
                    <div><p className="font-bold">{(selected.importo_incassato ?? 0) + pagaOra}€</p><p className="text-[11px] text-muted-foreground">Incassato</p></div>
                    <div><p className="font-bold text-fuchsia-600">{Math.max(0, residuo - pagaOra)}€</p><p className="text-[11px] text-muted-foreground">Residuo</p></div>
                  </div>
                </div>

                <div className="sticky bottom-4 pt-2">
                  <Button className="w-full h-14 rounded-2xl text-base gap-2" disabled={update.isPending || (oraTot === 0 && pagaOra === 0)}
                    onClick={conferma}>
                    {update.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                    Conferma · {oraTot} persone · {pagaOra}€
                  </Button>
                </div>
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
}
