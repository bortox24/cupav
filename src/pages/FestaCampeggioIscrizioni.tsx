import { useMemo, useState } from "react";
import { InvioMassivoGenericDialog, GenericRecipient } from "@/components/InvioMassivoGenericDialog";
import { useAuth } from "@/lib/auth";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, FileDown, Pencil, Trash2, Users, CheckCircle2, Banknote, PartyPopper, Loader2, Megaphone, AlertTriangle, Plus, X, Radio, ScanLine, ArrowUpDown, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useFestaCampeggio, useDeleteFestaCampeggio, useUpdateFestaCampeggio, type FestaCampeggio, type AllergiaRiga, calcolaContributoFesta, parseAllergie, totalePersoneAllergiche } from "@/hooks/useFestaCampeggio";
import { exportFestaCampeggioPdf } from "@/lib/exportFestaCampeggioPdf";
import { CheckInFestaDialog } from "@/components/CheckInFestaDialog";

function StatoBadge({ item }: { item: FestaCampeggio }) {
  if (item.pagato) return <Badge className="bg-green-500 hover:bg-green-600 text-white">Pagato</Badge>;
  if (item.arrivato) return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">Arrivato</Badge>;
  return <Badge variant="outline" className="text-muted-foreground">In attesa</Badge>;
}

export default function FestaCampeggioIscrizioni() {
  const { profile } = useAuth();
  const fullName = profile?.full_name || 'Sistema';
  const { data: items = [], isLoading, realtimeConnected } = useFestaCampeggio();
  const update = useUpdateFestaCampeggio();
  const remove = useDeleteFestaCampeggio();

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<'recente' | 'alfabetico'>('recente');
  const [editItem, setEditItem] = useState<FestaCampeggio | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<FestaCampeggio | null>(null);
  const [invioOpen, setInvioOpen] = useState(false);
  const [checkInOpen, setCheckInOpen] = useState(false);



  const invioRecipients: GenericRecipient[] = useMemo(() => items
    .filter(i => i.email)
    .map(i => {
      const tipologia: string[] = [];
      if (i.num_adulti > 0) tipologia.push('adulti');
      if (i.num_ragazzi > 0) tipologia.push('ragazzi');
      if (i.num_staff > 0) tipologia.push('staff');
      const badges = [
        i.num_adulti > 0 ? { label: `${i.num_adulti} ad.`, variant: 'secondary' as const } : null,
        i.num_ragazzi > 0 ? { label: `${i.num_ragazzi} rag.`, variant: 'secondary' as const } : null,
        i.num_staff > 0 ? { label: `${i.num_staff} staff`, variant: 'secondary' as const } : null,
      ].filter(Boolean) as { label: string; variant: 'secondary' }[];
      return {
        id: i.id,
        full_name: `${i.cognome} ${i.nome}`.trim(),
        badges,
        tags: { tipologia },
      };
    }), [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(i =>
      `${i.cognome} ${i.nome}`.toLowerCase().includes(q) ||
      i.email.toLowerCase().includes(q) ||
      (i.telefono || '').toLowerCase().includes(q)
    );
  }, [items, search]);

  const stats = useMemo(() => {
    const totAdulti = items.reduce((s, i) => s + i.num_adulti, 0);
    const totRagazzi = items.reduce((s, i) => s + i.num_ragazzi, 0);
    const totStaff = items.reduce((s, i) => s + i.num_staff, 0);
    return {
      iscrizioni: items.length,
      persone: totAdulti + totRagazzi + totStaff,
      personeArrivate: items.filter(i => i.arrivato).reduce((s, i) => s + i.num_adulti + i.num_ragazzi + i.num_staff, 0),
      adulti: totAdulti,
      ragazzi: totRagazzi,
      staff: totStaff,
      totale: items.reduce((s, i) => s + i.contributo, 0),
      incassato: items.filter(i => i.pagato).reduce((s, i) => s + i.contributo, 0),
      daIncassare: items.filter(i => !i.pagato).reduce((s, i) => s + i.contributo, 0),
      allergici: items.reduce((s, i) => s + totalePersoneAllergiche(i.allergie), 0),
    };
  }, [items]);

  const editRighe: AllergiaRiga[] = Array.isArray(editItem?.allergie)
    ? (editItem!.allergie as AllergiaRiga[]).map(r => ({ nome: String(r?.nome ?? ''), quantita: Number(r?.quantita ?? 0) }))
    : [];

  const setEditRighe = (righe: AllergiaRiga[]) => {
    setEditItem(prev => (prev ? { ...prev, allergie: righe, ha_allergie: righe.length > 0 } : prev));
  };

  const toggleArrivato = async (item: FestaCampeggio) => {
    const updates: Partial<FestaCampeggio> = item.arrivato
      ? { arrivato: false, arrivato_da: null, arrivato_at: null }
      : { arrivato: true, arrivato_da: fullName || 'Sistema', arrivato_at: new Date().toISOString() };
    await update.mutateAsync({ id: item.id, updates }, {
      onSuccess: () => toast({ title: "Stato aggiornato" }),
      onError: (e: any) => toast({ title: "Errore", description: e.message, variant: "destructive" }),
    });
  };

  const togglePagato = async (item: FestaCampeggio) => {
    const updates: Partial<FestaCampeggio> = item.pagato
      ? { pagato: false, pagato_da: null, pagato_at: null }
      : { pagato: true, pagato_da: fullName || 'Sistema', pagato_at: new Date().toISOString() };
    await update.mutateAsync({ id: item.id, updates }, {
      onSuccess: () => toast({ title: "Stato pagamento aggiornato" }),
      onError: (e: any) => toast({ title: "Errore", description: e.message, variant: "destructive" }),
    });
  };

  const saveEdit = async () => {
    if (!editItem) return;
    const contributo = calcolaContributoFesta(editItem.num_adulti, editItem.num_ragazzi, editItem.num_staff);
    const righeValide = parseAllergie(editItem.allergie);
    await update.mutateAsync({ id: editItem.id, updates: { ...editItem, contributo, allergie: righeValide.length ? righeValide : null, ha_allergie: righeValide.length > 0 } }, {
      onSuccess: () => { toast({ title: "Iscrizione aggiornata" }); setEditItem(null); },
      onError: (e: any) => toast({ title: "Errore", description: e.message, variant: "destructive" }),
    });
  };

  const deleteItem = async (item: FestaCampeggio) => {
    await remove.mutateAsync(item.id, {
      onSuccess: () => { toast({ title: "Iscrizione eliminata" }); setConfirmDelete(null); },
      onError: (e: any) => toast({ title: "Errore", description: e.message, variant: "destructive" }),
    });
  };

  const exportPdf = async () => {
    await exportFestaCampeggioPdf(filtered.length < items.length ? filtered : items);
    toast({ title: "PDF scaricato" });
  };

  return (
    <MainLayout title="Festa Campeggio">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-fuchsia-100 text-fuchsia-600 rounded-xl"><PartyPopper className="h-6 w-6" /></div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Festa Campeggio</h1>
              <p className="text-sm text-muted-foreground">Gestione adesioni e contributi</p>
            </div>
          </div>
          <Badge variant="outline" className={realtimeConnected ? "border-green-500 text-green-600 gap-1 w-fit" : "border-muted text-muted-foreground gap-1 w-fit"}>
            <Radio className="h-3 w-3" /> {realtimeConnected ? "In tempo reale" : "Connessione..."}
          </Badge>
        </div>
        {/* KPI */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'Persone previste', value: stats.persone, icon: Users },
            { label: 'Persone arrivate', value: stats.personeArrivate, icon: CheckCircle2 },
            { label: 'Allergie/intoll.', value: stats.allergici, icon: AlertTriangle },
            { label: 'Totale previsto', value: `${stats.totale}€`, icon: Banknote },
            { label: 'Totale incassato', value: `${stats.incassato}€`, icon: CheckCircle2 },
            { label: 'Da incassare', value: `${stats.daIncassare}€`, icon: Banknote },
          ].map((k, i) => (
            <Card key={i} className="rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-foreground">{k.value}</p>
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                </div>
                <k.icon className="h-8 w-8 text-fuchsia-500/60" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Distribuzione partecipanti */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Distribuzione partecipanti</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Adulti', val: stats.adulti, color: 'bg-fuchsia-500' },
              { label: 'Ragazzi', val: stats.ragazzi, color: 'bg-purple-500' },
              { label: 'Staff', val: stats.staff, color: 'bg-sky-500' },
            ].map(r => {
              const max = Math.max(stats.adulti, stats.ragazzi, stats.staff, 1);
              return (
                <div key={r.label} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 text-xs text-muted-foreground">{r.label}</span>
                  <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full ${r.color} transition-all`} style={{ width: `${(r.val / max) * 100}%` }} />
                  </div>
                  <span className="w-8 text-right text-sm font-semibold tabular-nums">{r.val}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>



        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca per nome o email..." className="pl-9 rounded-xl" />
            </div>
            <div className="relative w-full sm:w-56">
              <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as 'recente' | 'alfabetico')}
                className="h-10 w-full rounded-xl border border-input bg-background px-3 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="recente">Più recente</option>
                <option value="alfabetico">Alfabetico</option>
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">

            <Button onClick={() => setCheckInOpen(true)} className="gap-2 rounded-xl">
              <ScanLine className="h-4 w-4" /> Modalità Check-in
            </Button>

            <Button onClick={exportPdf} variant="outline" className="gap-2 rounded-xl">
              <FileDown className="h-4 w-4" /> Scarica PDF
            </Button>
            <Button
              variant="outline"
              className="gap-2 rounded-xl"
              onClick={() => {
                if (invioRecipients.length === 0) { toast({ title: "Nessuna adesione con email" }); return; }
                setInvioOpen(true);
              }}
            >
              <Megaphone className="h-4 w-4" /> Comunicazioni
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <Tabs defaultValue="tutte">
            <TabsList className="rounded-2xl bg-muted/50 p-1 mb-4 flex-wrap h-auto">
              <TabsTrigger value="tutte" className="rounded-xl">Tutte ({items.length})</TabsTrigger>
              <TabsTrigger value="da-arrivare" className="rounded-xl">
                Da arrivare ({items.filter(i => !i.arrivato).reduce((s, i) => s + i.num_adulti + i.num_ragazzi + i.num_staff, 0)})
              </TabsTrigger>
              <TabsTrigger value="arrivati" className="rounded-xl">Arrivati ({items.filter(i => i.arrivato).length})</TabsTrigger>
              <TabsTrigger value="pagati" className="rounded-xl">Pagati ({items.filter(i => i.pagato).length})</TabsTrigger>
            </TabsList>

            {['tutte', 'da-arrivare', 'arrivati', 'pagati'].map(tab => {
              const list = tab === 'tutte'
                ? filtered
                : tab === 'da-arrivare' ? filtered.filter(i => !i.arrivato)
                : tab === 'arrivati' ? filtered.filter(i => i.arrivato)
                : filtered.filter(i => i.pagato);

              return (
                <TabsContent key={tab} value={tab}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {list.map(item => (
                      <Card key={item.id} className="rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-base leading-tight">{item.cognome} {item.nome}</CardTitle>
                            <StatoBadge item={item} />
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                          <div className="grid grid-cols-3 gap-2 text-center bg-muted/30 rounded-xl p-2">
                            <div><p className="font-bold">{item.num_adulti}</p><p className="text-[10px] text-muted-foreground">Adulti</p></div>
                            <div><p className="font-bold">{item.num_ragazzi}</p><p className="text-[10px] text-muted-foreground">Ragazzi</p></div>
                            <div><p className="font-bold">{item.num_staff}</p><p className="text-[10px] text-muted-foreground">Staff</p></div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Contributo</span>
                            <span className="font-bold text-fuchsia-600">{item.contributo}€</span>
                          </div>
                          {parseAllergie(item.allergie).length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {parseAllergie(item.allergie).map((r, idx) => (
                                <Badge key={idx} variant="outline" className="border-amber-400 text-amber-700 dark:text-amber-300 gap-1">
                                  <AlertTriangle className="h-3 w-3" /> {r.nome} ×{r.quantita}
                                </Badge>
                              ))}
                            </div>
                          )}
                          {item.telefono && <p className="text-muted-foreground text-xs">Tel: {item.telefono}</p>}
                          {item.email && <p className="text-muted-foreground text-xs truncate">{item.email}</p>}
                          <div className="flex gap-2 pt-1">
                            <Button size="sm" variant={item.arrivato ? "default" : "outline"} className="flex-1 rounded-xl" onClick={() => toggleArrivato(item)}>
                              {item.arrivato ? "Annulla arrivo" : "Arrivato"}
                            </Button>
                            <Button size="sm" variant={item.pagato ? "default" : "outline"} className="flex-1 rounded-xl" onClick={() => togglePagato(item)}>
                              {item.pagato ? "Pagato" : "Segna pagato"}
                            </Button>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" className="flex-1 rounded-xl" onClick={() => setEditItem(item)}>
                              <Pencil className="h-4 w-4 mr-1" /> Modifica
                            </Button>
                            <Button size="sm" variant="ghost" className="text-destructive rounded-xl" onClick={() => setConfirmDelete(item)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {list.length === 0 && (
                      <div className="col-span-full text-center py-12 text-muted-foreground">
                        Nessuna adesione trovata.
                      </div>
                    )}
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={open => !open && setEditItem(null)}>
        <DialogContent className="max-w-md rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Modifica adesione</DialogTitle></DialogHeader>
          {editItem && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Nome</Label><Input value={editItem.nome} onChange={e => setEditItem({ ...editItem, nome: e.target.value })} /></div>
                <div><Label>Cognome</Label><Input value={editItem.cognome} onChange={e => setEditItem({ ...editItem, cognome: e.target.value })} /></div>
              </div>
              <div><Label>Email</Label><Input type="email" value={editItem.email} onChange={e => setEditItem({ ...editItem, email: e.target.value })} /></div>
              <div><Label>Telefono</Label><Input value={editItem.telefono || ''} onChange={e => setEditItem({ ...editItem, telefono: e.target.value })} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Adulti</Label><Input type="number" min={0} value={editItem.num_adulti} onChange={e => setEditItem({ ...editItem, num_adulti: Number(e.target.value) })} /></div>
                <div><Label>Ragazzi</Label><Input type="number" min={0} value={editItem.num_ragazzi} onChange={e => setEditItem({ ...editItem, num_ragazzi: Number(e.target.value) })} /></div>
                <div><Label>Staff</Label><Input type="number" min={0} value={editItem.num_staff} onChange={e => setEditItem({ ...editItem, num_staff: Number(e.target.value) })} /></div>
              </div>

              {/* Allergie */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Allergie / intolleranze</Label>
                {(() => {
                  const totPart = editItem.num_adulti + editItem.num_ragazzi + editItem.num_staff;
                  const totAll = editRighe.reduce((s, r) => s + r.quantita, 0);
                  return (
                    <>
                      {editRighe.map((riga, idx) => {
                        const maxRiga = Math.max(0, totPart - (totAll - riga.quantita));
                        return (
                          <div key={idx} className="flex items-center gap-2">
                            <Input
                              value={riga.nome}
                              placeholder="Es. celiaco"
                              onChange={e => setEditRighe(editRighe.map((r, i) => i === idx ? { ...r, nome: e.target.value } : r))}
                            />
                            <Input
                              type="number"
                              min={0}
                              max={maxRiga}
                              className="w-20"
                              value={riga.quantita}
                              onChange={e => setEditRighe(editRighe.map((r, i) => i === idx ? { ...r, quantita: Math.max(0, Math.min(maxRiga, Number(e.target.value))) } : r))}
                            />
                            <Button variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => setEditRighe(editRighe.filter((_, i) => i !== idx))}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl"
                        disabled={totAll >= totPart}
                        onClick={() => setEditRighe([...editRighe, { nome: '', quantita: 1 }])}
                      >
                        <Plus className="h-4 w-4 mr-1" /> Aggiungi allergia
                      </Button>
                      <p className="text-xs text-muted-foreground">{totAll} su {totPart} partecipanti</p>
                    </>
                  );
                })()}
              </div>

              <div className="bg-fuchsia-50 dark:bg-fuchsia-950/20 rounded-xl p-3 text-center">
                <p className="text-sm text-muted-foreground">Contributo calcolato</p>
                <p className="text-2xl font-bold text-fuchsia-600">
                  {calcolaContributoFesta(editItem.num_adulti, editItem.num_ragazzi, editItem.num_staff)}€
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Annulla</Button>
            <Button onClick={saveEdit} disabled={update.isPending}>{update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salva'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!confirmDelete} onOpenChange={open => !open && setConfirmDelete(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle>Conferma eliminazione</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Vuoi eliminare l'adesione di <strong>{confirmDelete?.cognome} {confirmDelete?.nome}</strong>? L'azione è irreversibile.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Annulla</Button>
            <Button variant="destructive" onClick={() => confirmDelete && deleteItem(confirmDelete)} disabled={remove.isPending}>
              {remove.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Elimina'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CheckInFestaDialog
        open={checkInOpen}
        onOpenChange={setCheckInOpen}
        items={items}
        realtimeConnected={realtimeConnected}
        onCheckIn={async (item) => {
          await update.mutateAsync({ id: item.id, updates: { arrivato: true, arrivato_da: fullName || 'Sistema', arrivato_at: new Date().toISOString() } });
        }}
        onUndoCheckIn={async (item) => {
          await update.mutateAsync({ id: item.id, updates: { arrivato: false, arrivato_da: null, arrivato_at: null } });
        }}
        onMarkPagato={async (item) => {
          await update.mutateAsync({ id: item.id, updates: { pagato: true, pagato_da: fullName || 'Sistema', pagato_at: new Date().toISOString() } });
        }}
      />


      <InvioMassivoGenericDialog
        open={invioOpen}
        onOpenChange={setInvioOpen}
        entityType="festa"
        recipients={invioRecipients}
        recipientsLabel="destinatari"
        allowIndividualSelection
        filterGroups={[
          {
            key: 'tipologia',
            label: 'Tipologia partecipanti',
            options: [
              { value: 'adulti', label: 'Adulti' },
              { value: 'ragazzi', label: 'Ragazzi' },
              { value: 'staff', label: 'Staff' },
            ],
          },
        ]}
      />
    </MainLayout>
  );
}
