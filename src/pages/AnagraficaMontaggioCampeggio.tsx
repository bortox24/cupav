import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  useIscrizioniMontaggio, useUpdateIscrizioneMontaggio, useDeleteIscrizioneMontaggio,
  IscrizioneMontaggio, RecapitoTel,
} from '@/hooks/useIscrizioniMontaggio';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Loader2, Search, Users, Phone, Mail, MapPin, Calendar, Download, Pencil,
  Archive, ArchiveRestore, Trash2, Save, X, Plus, Hammer, Moon, Check, XCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { it as itLocale } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { InviaComunicazioneMontaggioWizard } from '@/components/InviaComunicazioneMontaggioWizard';
import {
  GIORNI_MONTAGGIO, GiornoMontaggio,
  calcolaTotaleMontaggio, formatEuro,
} from '@/lib/tariffeMontaggio';

async function logMontaggioAction(params: {
  iscrizioneId: string; userId: string; userName: string;
  tipo: string; dettaglio?: string; successo?: boolean;
}) {
  await (supabase.from('anagrafica_invio_logs' as any) as any).insert({
    iscrizione_montaggio_id: params.iscrizioneId,
    inviato_da: params.userId,
    inviato_da_nome: params.userName,
    successo: params.successo ?? true,
    tipo: params.tipo,
    dettaglio: params.dettaglio || null,
  });
}

function buildDiff(prev: IscrizioneMontaggio, next: IscrizioneMontaggio): string {
  const labels: Partial<Record<keyof IscrizioneMontaggio, string>> = {
    cognome: 'Cognome', nome: 'Nome', email: 'Email', residente_a: 'Residenza', via: 'Via',
    num_adulti: 'Adulti', num_figli_over10: 'Figli >10', num_4_10_anni: '4-10 anni', num_0_3_anni: '0-3 anni',
    num_notti: 'Notti', importo_totale_calcolato: 'Totale calcolato',
  };
  const changes: string[] = [];
  (Object.keys(labels) as (keyof IscrizioneMontaggio)[]).forEach((k) => {
    if (String(prev[k] ?? '') !== String(next[k] ?? '')) {
      changes.push(`${labels[k]}: "${prev[k] ?? ''}" → "${next[k] ?? ''}"`);
    }
  });
  const prevG = JSON.stringify(prev.giorni_selezionati ?? []);
  const nextG = JSON.stringify(next.giorni_selezionati ?? []);
  if (prevG !== nextG) changes.push('Giorni selezionati aggiornati');
  const prevR = JSON.stringify(prev.recapiti_telefonici ?? []);
  const nextR = JSON.stringify(next.recapiti_telefonici ?? []);
  if (prevR !== nextR) changes.push('Recapiti telefonici aggiornati');
  return changes.join(' · ');
}

function nFigli(i: IscrizioneMontaggio) { return Math.max(0, i.num_figli_over10 ?? 0); }
function totalePartecipanti(i: IscrizioneMontaggio) {
  return i.num_adulti + nFigli(i) + i.num_4_10_anni + i.num_0_3_anni;
}
function formatDate(d: string) {
  try { return format(new Date(d), 'dd/MM/yyyy', { locale: itLocale }); } catch { return d; }
}

function MontaggioCard({ item, onClick }: { item: IscrizioneMontaggio; onClick: () => void }) {
  const initials = `${(item.cognome[0] || '').toUpperCase()}${(item.nome[0] || '').toUpperCase()}`;
  const tot = totalePartecipanti(item);
  return (
    <Card
      className={cn(
        'border-2 border-l-4 rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer',
        item.archiviato ? 'border-l-muted-foreground/40 opacity-70' : 'border-l-amber-500',
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 bg-gradient-to-br from-amber-500 to-orange-600 shadow-md">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-base truncate text-foreground">{item.cognome} {item.nome}</h4>
            <p className="text-xs text-muted-foreground truncate flex items-center gap-1"><MapPin className="h-3 w-3" />{item.residente_a}</p>
          </div>
          <Badge className={cn(
            'border-0 rounded-full text-[10px] pointer-events-none',
            item.archiviato
              ? 'bg-muted text-muted-foreground'
              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
          )}>
            {item.archiviato ? '📦 Archiviata' : '🔨 Montaggio'}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-1">
          {(item.giorni_selezionati ?? []).map(g => (
            <span key={g} className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-medium">
              {GIORNI_MONTAGGIO.find(x => x.value === g)?.short ?? g}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-muted/40 rounded-lg p-2">
            <p className="text-muted-foreground">Persone</p>
            <p className="font-semibold flex items-center gap-1"><Users className="h-3 w-3" />{tot}</p>
          </div>
          <div className="bg-muted/40 rounded-lg p-2">
            <p className="text-muted-foreground">Notti</p>
            <p className="font-semibold flex items-center gap-1"><Moon className="h-3 w-3" />{item.num_notti}</p>
          </div>
          <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-2 text-amber-700 dark:text-amber-300">
            <p className="opacity-80">Totale</p>
            <p className="font-bold">{formatEuro(item.importo_totale_calcolato ?? 0)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MontaggioDetailDrawer({ item, open, onOpenChange }:
  { item: IscrizioneMontaggio | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const updateMut = useUpdateIscrizioneMontaggio();
  const deleteMut = useDeleteIscrizioneMontaggio();
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<IscrizioneMontaggio | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useMemo(() => { if (item) { setForm({ ...item }); setEditMode(false); } }, [item?.id]);

  if (!item || !form) return null;
  const tot = totalePartecipanti(form);
  const calcolo = calcolaTotaleMontaggio(form, form.giorni_selezionati ?? []);

  const update = <K extends keyof IscrizioneMontaggio>(k: K, v: IscrizioneMontaggio[K]) =>
    setForm(p => p ? { ...p, [k]: v } : p);

  const updateRecapito = (idx: number, field: 'nome' | 'telefono', val: string) => {
    const r = [...form.recapiti_telefonici];
    r[idx] = { ...r[idx], [field]: val };
    update('recapiti_telefonici', r);
  };
  const addRecapito = () => update('recapiti_telefonici', [...form.recapiti_telefonici, { nome: '', telefono: '' } as RecapitoTel]);
  const removeRecapito = (idx: number) => update('recapiti_telefonici', form.recapiti_telefonici.filter((_, i) => i !== idx));

  const toggleGiorno = (g: GiornoMontaggio) => {
    const cur = form.giorni_selezionati ?? [];
    update('giorni_selezionati', cur.includes(g) ? cur.filter(x => x !== g) : [...cur, g]);
  };

  const handleSave = () => {
    const ric = calcolaTotaleMontaggio(form, form.giorni_selezionati ?? []);
    const payload: IscrizioneMontaggio = {
      ...form,
      num_notti: ric.notti,
      importo_totale_calcolato: ric.totale,
    };
    const { id, created_at, ...updates } = payload;
    updateMut.mutate({ id, updates }, {
      onSuccess: () => { toast.success('Iscrizione aggiornata'); setEditMode(false); },
      onError: (e: any) => toast.error(e.message || 'Errore aggiornamento'),
    });
  };

  const handleArchive = () => {
    updateMut.mutate({ id: item.id, updates: { archiviato: !item.archiviato } }, {
      onSuccess: () => {
        toast.success(item.archiviato ? 'Iscrizione ripristinata' : 'Iscrizione archiviata');
        onOpenChange(false);
      },
      onError: (e: any) => toast.error(e.message || 'Errore'),
    });
  };

  const handleDelete = () => {
    deleteMut.mutate(item.id, {
      onSuccess: () => { toast.success('Iscrizione eliminata'); setConfirmDelete(false); onOpenChange(false); },
      onError: (e: any) => toast.error(e.message || 'Errore eliminazione'),
    });
  };

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[92vh]">
          <div className="overflow-y-auto px-5 pb-8">
            <DrawerHeader className="px-0 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold text-white bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg">
                  {(item.cognome[0] || '').toUpperCase()}{(item.nome[0] || '').toUpperCase()}
                </div>
                <div className="flex-1">
                  <DrawerTitle className="text-xl text-left">{item.cognome} {item.nome}</DrawerTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">Iscrizione del {formatDate(item.created_at)}</p>
                </div>
              </div>
            </DrawerHeader>

            {!editMode ? (
              <div className="space-y-4">
                <div className="bg-muted/30 rounded-xl p-3 space-y-2 text-sm">
                  <h4 className="font-semibold flex items-center gap-2"><Mail className="h-4 w-4" />Contatti</h4>
                  <p>{item.email}</p>
                  <div className="space-y-1">
                    {item.recapiti_telefonici.map((r, i) => (
                      <p key={i} className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-3 w-3" /><span className="font-medium text-foreground">{r.nome}:</span> {r.telefono}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="bg-muted/30 rounded-xl p-3 space-y-1 text-sm">
                  <h4 className="font-semibold flex items-center gap-2"><MapPin className="h-4 w-4" />Residenza</h4>
                  <p>{item.residente_a} — {item.via}</p>
                </div>

                <div className="bg-muted/30 rounded-xl p-3 space-y-2 text-sm">
                  <h4 className="font-semibold flex items-center gap-2"><Calendar className="h-4 w-4" />Giorni selezionati</h4>
                  <div className="flex flex-wrap gap-1">
                    {(item.giorni_selezionati ?? []).map(g => (
                      <span key={g} className="text-xs px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-medium">
                        {GIORNI_MONTAGGIO.find(x => x.value === g)?.label ?? g}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">Notti calcolate: <strong className="text-foreground">{item.num_notti}</strong></p>
                </div>

                <div className="bg-muted/30 rounded-xl p-3 space-y-1 text-sm">
                  <h4 className="font-semibold flex items-center gap-2"><Users className="h-4 w-4" />Partecipanti ({tot})</h4>
                  <p>Adulti: <strong>{item.num_adulti}</strong></p>
                  <p>Figli &gt; 10 anni: <strong>{nFigli(item)}</strong></p>
                  <p>4–10 anni: <strong>{item.num_4_10_anni}</strong></p>
                  <p>0–3 anni: <strong>{item.num_0_3_anni}</strong></p>
                </div>

                <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl p-3 space-y-2 text-sm">
                  <h4 className="font-semibold flex items-center gap-2">💶 Totale</h4>
                  {calcolo.righe.length > 0 && (
                    <div className="text-xs space-y-0.5 pl-2 text-muted-foreground">
                      {calcolo.righe.map((r, i) => (
                        <p key={i}>• {r.voce}: {r.persone} × {formatEuro(r.prezzoNotte)} × {r.notti}n = <strong className="text-foreground">{formatEuro(r.subtotale)}</strong></p>
                      ))}
                    </div>
                  )}
                  <p className="text-base font-bold pt-1 border-t border-amber-200/60 dark:border-amber-900/40">
                    Totale: {formatEuro(item.importo_totale_calcolato ?? calcolo.totale)}
                  </p>
                </div>

                <div className="bg-muted/30 rounded-xl p-3 space-y-1 text-sm">
                  <h4 className="font-semibold">Firma</h4>
                  <p>Tariffa accettata: <strong>{item.tariffa_accettata ? 'Sì' : 'No'}</strong></p>
                  <p>Firma: <strong>{item.firma_nome_cognome}</strong> — {formatDate(item.firma_data)}</p>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2">
                  <Button variant="outline" onClick={() => setEditMode(true)}><Pencil className="h-4 w-4 mr-2" />Modifica</Button>
                  <Button variant="outline" onClick={handleArchive}>
                    {item.archiviato ? <><ArchiveRestore className="h-4 w-4 mr-2" />Ripristina</> : <><Archive className="h-4 w-4 mr-2" />Archivia</>}
                  </Button>
                  <Button variant="outline" className="text-destructive" onClick={() => setConfirmDelete(true)}>
                    <Trash2 className="h-4 w-4 mr-2" />Elimina
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><Label>Cognome</Label><Input value={form.cognome} onChange={e => update('cognome', e.target.value)} /></div>
                  <div><Label>Nome</Label><Input value={form.nome} onChange={e => update('nome', e.target.value)} /></div>
                </div>
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => update('email', e.target.value)} /></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><Label>Residente a</Label><Input value={form.residente_a} onChange={e => update('residente_a', e.target.value)} /></div>
                  <div><Label>Via</Label><Input value={form.via} onChange={e => update('via', e.target.value)} /></div>
                </div>

                <div className="space-y-2">
                  <Label>Recapiti telefonici</Label>
                  {form.recapiti_telefonici.map((r, i) => (
                    <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                      <Input placeholder="Nome" value={r.nome} onChange={e => updateRecapito(i, 'nome', e.target.value)} />
                      <Input placeholder="Telefono" value={r.telefono} onChange={e => updateRecapito(i, 'telefono', e.target.value)} />
                      <Button type="button" size="icon" variant="outline" className="text-destructive" onClick={() => removeRecapito(i)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addRecapito}><Plus className="h-3 w-3 mr-1" />Aggiungi recapito</Button>
                </div>

                <div className="space-y-2">
                  <Label>Giorni selezionati</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {GIORNI_MONTAGGIO.map(g => (
                      <label key={g.value} className="flex items-center gap-2 bg-muted/30 rounded-xl p-2 cursor-pointer">
                        <Checkbox
                          checked={(form.giorni_selezionati ?? []).includes(g.value)}
                          onCheckedChange={() => toggleGiorno(g.value)}
                        />
                        <span className="text-sm">{g.short}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Adulti</Label><Input type="number" min={0} value={form.num_adulti} onChange={e => update('num_adulti', Math.max(0, parseInt(e.target.value) || 0))} /></div>
                  <div><Label>Figli &gt; 10</Label><Input type="number" min={0} value={form.num_figli_over10} onChange={e => update('num_figli_over10', Math.max(0, parseInt(e.target.value) || 0))} /></div>
                  <div><Label>4–10 anni</Label><Input type="number" min={0} value={form.num_4_10_anni} onChange={e => update('num_4_10_anni', Math.max(0, parseInt(e.target.value) || 0))} /></div>
                  <div><Label>0–3 anni</Label><Input type="number" min={0} value={form.num_0_3_anni} onChange={e => update('num_0_3_anni', Math.max(0, parseInt(e.target.value) || 0))} /></div>
                </div>

                <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-3 text-sm">
                  <p className="text-xs text-muted-foreground">Anteprima totale ricalcolato</p>
                  <p className="font-bold text-amber-700 dark:text-amber-300">{formatEuro(calcolo.totale)} ({calcolo.notti} notti)</p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Button variant="outline" onClick={() => { setForm({ ...item }); setEditMode(false); }}><X className="h-4 w-4 mr-2" />Annulla</Button>
                  <Button onClick={handleSave} disabled={updateMut.isPending}>
                    <Save className="h-4 w-4 mr-2" />{updateMut.isPending ? 'Salvataggio...' : 'Salva'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare l'iscrizione?</AlertDialogTitle>
            <AlertDialogDescription>L'operazione è irreversibile.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function AnagraficaMontaggioCampeggio() {
  const { data: items = [], isLoading } = useIscrizioniMontaggio();
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [selected, setSelected] = useState<IscrizioneMontaggio | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(i => {
      if (!showArchived && i.archiviato) return false;
      if (showArchived && !i.archiviato) return false;
      if (!q) return true;
      return (`${i.cognome} ${i.nome}`.toLowerCase().includes(q) || (i.email ?? '').toLowerCase().includes(q));
    });
  }, [items, search, showArchived]);

  const totale = filtered.reduce((s, i) => s + (i.importo_totale_calcolato ?? 0), 0);
  const totalePersone = filtered.reduce((s, i) => s + totalePartecipanti(i), 0);

  const exportCsv = () => {
    const rows = [
      ['Cognome', 'Nome', 'Email', 'Comune', 'Via', 'Telefoni', 'Giorni', 'Notti', 'Adulti', 'Figli >10', '4-10', '0-3', 'Totale persone', 'Importo €', 'Archiviata'],
      ...filtered.map(i => [
        i.cognome, i.nome, i.email, i.residente_a, i.via,
        (i.recapiti_telefonici ?? []).map(r => `${r.nome}: ${r.telefono}`).join(' | '),
        (i.giorni_selezionati ?? []).map(g => GIORNI_MONTAGGIO.find(x => x.value === g)?.short ?? g).join(', '),
        i.num_notti, i.num_adulti, nFigli(i), i.num_4_10_anni, i.num_0_3_anni,
        totalePartecipanti(i), (i.importo_totale_calcolato ?? 0).toFixed(2), i.archiviato ? 'Sì' : 'No',
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `montaggio-campeggio-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <MainLayout title="Anagrafica Montaggio Campeggio">
      <div className="space-y-5">
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 text-white rounded-2xl p-5 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm"><Hammer className="h-7 w-7" /></div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">Montaggio Campeggio</h2>
              <p className="text-white/85 text-sm">{filtered.length} iscrizioni · {totalePersone} persone · {formatEuro(totale)}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Cerca per nome, cognome o email…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Button variant={showArchived ? 'default' : 'outline'} onClick={() => setShowArchived(s => !s)}>
            <Archive className="h-4 w-4 mr-2" />{showArchived ? 'Mostra attive' : 'Mostra archiviate'}
          </Button>
          <Button variant="outline" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download className="h-4 w-4 mr-2" />Export CSV
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">
            {showArchived ? 'Nessuna iscrizione archiviata.' : 'Ancora nessuna iscrizione al montaggio campeggio.'}
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(i => (
              <MontaggioCard key={i.id} item={i} onClick={() => { setSelected(i); setDrawerOpen(true); }} />
            ))}
          </div>
        )}

        <MontaggioDetailDrawer item={selected} open={drawerOpen} onOpenChange={setDrawerOpen} />
      </div>
    </MainLayout>
  );
}
