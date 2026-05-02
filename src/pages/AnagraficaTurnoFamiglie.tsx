import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useIscrizioniFamiglie, useUpdateIscrizioneFamiglia, useDeleteIscrizioneFamiglia, IscrizioneFamiglia, TIPO_PERIODO_LABEL, RecapitoTel } from '@/hooks/useFamiglie';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Search, Users, Phone, Mail, MapPin, Calendar, Download, Tent, Pencil, Archive, ArchiveRestore, Trash2, Save, X, ChevronDown, Plus, Check, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { it as itLocale } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { InviaComunicazioneFamigliaWizard } from '@/components/InviaComunicazioneFamigliaWizard';
import { useTariffeFamiglie } from '@/hooks/useTariffeFamiglie';
import { calcolaTotaleFamiglia, calcolaGiorni, formatEuro, type TariffaFamiglia } from '@/lib/tariffeFamiglie';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

async function logFamigliaAction(params: {
  iscrizioneId: string; userId: string; userName: string;
  tipo: string; dettaglio?: string; successo?: boolean;
}) {
  await (supabase.from('anagrafica_invio_logs' as any) as any).insert({
    iscrizione_famiglia_id: params.iscrizioneId,
    inviato_da: params.userId,
    inviato_da_nome: params.userName,
    successo: params.successo ?? true,
    tipo: params.tipo,
    dettaglio: params.dettaglio || null,
  });
}

function buildDiff(prev: IscrizioneFamiglia, next: IscrizioneFamiglia): string {
  const labels: Partial<Record<keyof IscrizioneFamiglia, string>> = {
    cognome: 'Cognome', nome: 'Nome', email: 'Email', residente_a: 'Residenza', via: 'Via',
    tipo_periodo: 'Tipo periodo', data_inizio: 'Data inizio', data_fine: 'Data fine',
    num_adulti: 'Adulti', num_4_10_anni: '4-10 anni', num_0_3_anni: '0-3 anni',
    num_animali: 'Animali', acconto_versato: 'Acconto',
    figlio_1_over10: 'Figlio 1 >10', figlio_2_over10: 'Figlio 2 >10', figlio_3_over10: 'Figlio 3 >10',
    categoria_tariffa: 'Categoria tariffa', importo_totale_calcolato: 'Totale calcolato',
  };
  const changes: string[] = [];
  (Object.keys(labels) as (keyof IscrizioneFamiglia)[]).forEach((k) => {
    if (String(prev[k] ?? '') !== String(next[k] ?? '')) {
      changes.push(`${labels[k]}: "${prev[k] ?? ''}" → "${next[k] ?? ''}"`);
    }
  });
  const prevR = JSON.stringify(prev.recapiti_telefonici ?? []);
  const nextR = JSON.stringify(next.recapiti_telefonici ?? []);
  if (prevR !== nextR) changes.push('Recapiti telefonici aggiornati');
  return changes.join(' · ');
}

function formatDate(d: string) {
  try { return format(new Date(d), 'dd/MM/yyyy', { locale: itLocale }); } catch { return d; }
}

function totalePartecipanti(i: IscrizioneFamiglia) {
  return i.num_adulti + (i.figlio_1_over10 ? 1 : 0) + (i.figlio_2_over10 ? 1 : 0) + (i.figlio_3_over10 ? 1 : 0) + i.num_4_10_anni + i.num_0_3_anni;
}

interface PagamentoInfo {
  importo_dovuto: number | null;
  importo_pagato: number;
  stato: string;
}

function FamigliaCard({ item, pagamento, onClick }: { item: IscrizioneFamiglia; pagamento?: PagamentoInfo; onClick: () => void }) {
  const initials = `${(item.cognome[0] || '').toUpperCase()}${(item.nome[0] || '').toUpperCase()}`;
  const tot = totalePartecipanti(item);
  const totaleCalc = item.importo_totale_calcolato ?? 0;
  const dovuto = pagamento?.importo_dovuto ?? totaleCalc;
  const pagato = pagamento?.importo_pagato ?? 0;
  const residuo = Math.max(0, dovuto - pagato);
  const stato = pagato <= 0 ? 'da_pagare' : (residuo <= 0 ? 'pagato' : 'parziale');
  const statoColor =
    stato === 'pagato' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
    : stato === 'parziale' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
    : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300';
  const noCategoria = !item.categoria_tariffa;
  return (
    <Card className={`border-2 border-l-4 ${item.archiviato ? 'border-l-muted-foreground/40 opacity-70' : 'border-l-orange-500'} rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer`} onClick={onClick}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 bg-gradient-to-br from-orange-500 to-amber-600 shadow-md">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-base truncate text-foreground">{item.cognome} {item.nome}</h4>
            <p className="text-xs text-muted-foreground truncate flex items-center gap-1"><MapPin className="h-3 w-3" />{item.residente_a}</p>
          </div>
          <Badge className={`${item.archiviato ? 'bg-muted text-muted-foreground' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'} border-0 rounded-full text-[10px] pointer-events-none`}>
            {item.archiviato ? '📦 Archiviata' : '🏕️ Famiglie'}
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-muted/40 rounded-lg p-2">
            <p className="text-muted-foreground">Periodo</p>
            <p className="font-semibold text-foreground truncate">{TIPO_PERIODO_LABEL[item.tipo_periodo]}</p>
          </div>
          <div className="bg-muted/40 rounded-lg p-2">
            <p className="text-muted-foreground">Partecipanti</p>
            <p className="font-semibold text-foreground flex items-center gap-1"><Users className="h-3 w-3" />{tot} {item.num_animali > 0 ? `+ 🐾${item.num_animali}` : ''}</p>
          </div>
        </div>
        {noCategoria ? (
          <div className="rounded-lg px-2 py-1.5 text-[11px] bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
            ⚠️ Categoria tariffa non impostata
          </div>
        ) : (
          <div className={`rounded-lg px-2 py-1.5 text-[11px] font-semibold flex items-center justify-between gap-2 ${statoColor}`}>
            <span>Tot. {formatEuro(dovuto)}</span>
            <span className="opacity-80">Acc. {formatEuro(pagato)}</span>
            <span>Res. {formatEuro(residuo)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FamigliaDetailDrawer({ item, open, onOpenChange }: { item: IscrizioneFamiglia | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const updateMut = useUpdateIscrizioneFamiglia();
  const deleteMut = useDeleteIscrizioneFamiglia();
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const { data: tariffe = [] } = useTariffeFamiglie();
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<IscrizioneFamiglia | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [comunicazioneOpen, setComunicazioneOpen] = useState(false);

  // Sync form when item changes
  useMemo(() => {
    if (item) { setForm({ ...item }); setEditMode(false); }
  }, [item?.id]);

  // Fetch logs
  const { data: invioLogs = [] } = useQuery({
    queryKey: ['anagrafica-invio-logs-famiglia', item?.id],
    queryFn: async () => {
      if (!item?.id) return [];
      const { data, error } = await (supabase as any)
        .from('anagrafica_invio_logs')
        .select('*')
        .eq('iscrizione_famiglia_id', item.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: open && !!item?.id,
  });

  if (!item || !form) return null;
  const tot = totalePartecipanti(form);
  const userName = profile?.full_name || profile?.email || '';

  const tariffaCorrente: TariffaFamiglia | null =
    form.categoria_tariffa ? tariffe.find(t => t.categoria === form.categoria_tariffa) ?? null : null;
  const calcolo = calcolaTotaleFamiglia(form, tariffaCorrente);

  const update = <K extends keyof IscrizioneFamiglia>(k: K, v: IscrizioneFamiglia[K]) => setForm(p => p ? { ...p, [k]: v } : p);

  const updateRecapito = (idx: number, field: 'nome' | 'telefono', val: string) => {
    const r = [...form.recapiti_telefonici];
    r[idx] = { ...r[idx], [field]: val };
    update('recapiti_telefonici', r);
  };
  const addRecapito = () => update('recapiti_telefonici', [...form.recapiti_telefonici, { nome: '', telefono: '' } as RecapitoTel]);
  const removeRecapito = (idx: number) => update('recapiti_telefonici', form.recapiti_telefonici.filter((_, i) => i !== idx));

  const invalidateLogs = () => queryClient.invalidateQueries({ queryKey: ['anagrafica-invio-logs-famiglia', item.id] });

  const handleSave = () => {
    // Ricalcola totale con tariffa corrente
    const t = form.categoria_tariffa ? tariffe.find(x => x.categoria === form.categoria_tariffa) ?? null : null;
    const ric = calcolaTotaleFamiglia(form, t);
    const formWithCalc: IscrizioneFamiglia = { ...form, importo_totale_calcolato: t ? ric.totale : null };
    const { id, created_at, ...updates } = formWithCalc;
    const diff = buildDiff(item, formWithCalc);
    updateMut.mutate({ id, updates }, {
      onSuccess: async () => {
        // Propaga importo_dovuto su pagamenti_famiglie
        if (t) {
          const { data: existingPag } = await (supabase as any)
            .from('pagamenti_famiglie').select('id, importo_pagato').eq('iscrizione_id', id).maybeSingle();
          if (existingPag) {
            await (supabase as any).from('pagamenti_famiglie').update({
              importo_dovuto: ric.totale, updated_by: user?.id ?? null,
            }).eq('id', existingPag.id);
          } else {
            await (supabase as any).from('pagamenti_famiglie').insert({
              iscrizione_id: id, importo_dovuto: ric.totale, updated_by: user?.id ?? null,
            });
          }
          queryClient.invalidateQueries({ queryKey: ['iscrizioni-con-pagamenti'] });
        }
        toast.success('Iscrizione aggiornata');
        setEditMode(false);
        if (user && diff) {
          await logFamigliaAction({
            iscrizioneId: item.id, userId: user.id, userName,
            tipo: 'modifica_dati', dettaglio: diff,
          });
          invalidateLogs();
        }
      },
      onError: (e: any) => toast.error(e.message || 'Errore aggiornamento'),
    });
  };

  const handleArchive = () => {
    const willArchive = !item.archiviato;
    updateMut.mutate({ id: item.id, updates: { archiviato: willArchive } }, {
      onSuccess: async () => {
        toast.success(item.archiviato ? 'Iscrizione ripristinata' : 'Iscrizione archiviata');
        if (user) {
          await logFamigliaAction({
            iscrizioneId: item.id, userId: user.id, userName,
            tipo: willArchive ? 'archiviazione' : 'ripristino',
            dettaglio: willArchive ? 'Iscrizione archiviata' : 'Iscrizione ripristinata',
          });
          invalidateLogs();
        }
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
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold text-white bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg">
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
                  <h4 className="font-semibold text-foreground flex items-center gap-2"><Mail className="h-4 w-4" />Contatti</h4>
                  <p>{item.email}</p>
                  <div className="space-y-1">
                    {item.recapiti_telefonici.map((r, i) => (
                      <p key={i} className="flex items-center gap-2 text-muted-foreground"><Phone className="h-3 w-3" /><span className="font-medium text-foreground">{r.nome}:</span> {r.telefono}</p>
                    ))}
                  </div>
                </div>
                <div className="bg-muted/30 rounded-xl p-3 space-y-1 text-sm">
                  <h4 className="font-semibold text-foreground flex items-center gap-2"><MapPin className="h-4 w-4" />Residenza</h4>
                  <p>{item.residente_a} — {item.via}</p>
                </div>
                <div className="bg-muted/30 rounded-xl p-3 space-y-1 text-sm">
                  <h4 className="font-semibold text-foreground flex items-center gap-2"><Calendar className="h-4 w-4" />Periodo richiesto</h4>
                  <p><strong>{TIPO_PERIODO_LABEL[item.tipo_periodo]}</strong></p>
                  <p className="text-muted-foreground">Dal {formatDate(item.data_inizio)} al {formatDate(item.data_fine)}</p>
                </div>
                <div className="bg-muted/30 rounded-xl p-3 space-y-1 text-sm">
                  <h4 className="font-semibold text-foreground flex items-center gap-2"><Users className="h-4 w-4" />Partecipanti ({tot})</h4>
                  <p>Adulti: <strong>{item.num_adulti}</strong></p>
                  <p>Figli &gt; 10 anni: <strong>{[item.figlio_1_over10, item.figlio_2_over10, item.figlio_3_over10].filter(Boolean).length}</strong></p>
                  <p>4–10 anni: <strong>{item.num_4_10_anni}</strong></p>
                  <p>0–3 anni: <strong>{item.num_0_3_anni}</strong></p>
                  <p>Animali: <strong>{item.num_animali}</strong></p>
                </div>
                <div className="bg-muted/30 rounded-xl p-3 space-y-1 text-sm">
                  <h4 className="font-semibold text-foreground">Acconto e firma</h4>
                  <p>Acconto versato: <strong>€ {item.acconto_versato}</strong></p>
                  <p>Regolamento accettato: <strong>{item.regolamento_accettato ? 'Sì' : 'No'}</strong></p>
                  <p>Firma: <strong>{item.firma_nome_cognome}</strong> — {formatDate(item.firma_data)}</p>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/20 border border-orange-200 dark:border-orange-900/50 rounded-xl p-3 space-y-2 text-sm">
                  <h4 className="font-semibold text-foreground flex items-center gap-2">💶 Tariffa & totale</h4>
                  {item.categoria_tariffa ? (
                    <>
                      <p>Categoria: <strong>{item.categoria_tariffa}</strong> — <span className="text-muted-foreground">{tariffaCorrente?.descrizione ?? '-'}</span></p>
                      <p>Giorni: <strong>{calcolo.giorni}</strong></p>
                      {calcolo.righe.length > 0 && (
                        <div className="text-xs space-y-0.5 pl-2 text-muted-foreground">
                          {calcolo.righe.map((r, i) => (
                            <p key={i}>• {r.voce}: {r.persone} × {formatEuro(r.prezzoGiorno)} × {r.giorni}gg = <strong className="text-foreground">{formatEuro(r.subtotale)}</strong></p>
                          ))}
                        </div>
                      )}
                      <p className="text-base font-bold text-foreground pt-1 border-t border-orange-200/60 dark:border-orange-900/40">
                        Totale dovuto: {formatEuro(item.importo_totale_calcolato ?? calcolo.totale)}
                      </p>
                    </>
                  ) : (
                    <p className="text-amber-700 dark:text-amber-400">⚠️ Categoria tariffaria non impostata. Premi "Modifica" per assegnarla.</p>
                  )}
                </div>

                <Button
                  onClick={() => setComunicazioneOpen(true)}
                  variant="default"
                  className="w-full h-11 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-sm"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Invia comunicazione
                </Button>

                <div className="grid grid-cols-3 gap-2 pt-2">
                  <Button variant="outline" className="flex items-center" onClick={() => setEditMode(true)}>
                    <Pencil className="h-4 w-4 mr-2" />Modifica
                  </Button>
                  <Button variant="outline" onClick={handleArchive} disabled={updateMut.isPending}>
                    {item.archiviato ? <ArchiveRestore className="h-4 w-4 mr-2" /> : <Archive className="h-4 w-4 mr-2" />}
                    {item.archiviato ? 'Ripristina' : 'Archivia'}
                  </Button>
                  <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
                    <Trash2 className="h-4 w-4 mr-2" />Elimina
                  </Button>
                </div>

                {/* Sezione Log */}
                <Separator />
                <Collapsible defaultOpen>
                  <CollapsibleTrigger className="flex items-center gap-1 text-sm font-medium w-full hover:text-primary transition-colors">
                    📋 Log attività ({invioLogs.length})
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    {invioLogs.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nessuna attività registrata</p>
                    ) : (
                      <div className="space-y-1.5">
                        {(invioLogs as any[]).map((log: any) => (
                          <div key={log.id} className="space-y-0.5">
                            <div className="flex items-center gap-1.5 text-xs bg-muted/40 rounded-lg px-2 py-1.5 min-w-0">
                              {log.successo ? (
                                <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                              ) : (
                                <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                              )}
                              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full text-white shrink-0 ${
                                log.tipo === 'modifica_dati' ? 'bg-amber-500' :
                                log.tipo === 'archiviazione' ? 'bg-slate-500' :
                                log.tipo === 'ripristino' ? 'bg-teal-500' :
                                log.tipo === 'invio_comunicazione_custom' ? 'bg-red-500' :
                                'bg-blue-500'
                              }`}>
                                {log.tipo === 'modifica_dati' ? 'Modifica' :
                                 log.tipo === 'archiviazione' ? 'Archiviata' :
                                 log.tipo === 'ripristino' ? 'Ripristinata' :
                                 log.tipo === 'invio_comunicazione_custom' ? 'Comunicazione' :
                                 'Azione'}
                              </span>
                              <span className="font-medium truncate">{log.inviato_da_nome}</span>
                              <span className="text-muted-foreground text-[10px] shrink-0 whitespace-nowrap">
                                {format(new Date(log.created_at), 'dd-MM-yy, HH:mm')}
                              </span>
                            </div>
                            {log.dettaglio && (
                              <p className="text-[10px] text-muted-foreground ml-7 break-words">{log.dettaglio}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Cognome</Label><Input value={form.cognome} onChange={e => update('cognome', e.target.value)} /></div>
                  <div><Label>Nome</Label><Input value={form.nome} onChange={e => update('nome', e.target.value)} /></div>
                </div>
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => update('email', e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Residente a</Label><Input value={form.residente_a} onChange={e => update('residente_a', e.target.value)} /></div>
                  <div><Label>Via e numero</Label><Input value={form.via} onChange={e => update('via', e.target.value)} /></div>
                </div>

                <div className="bg-muted/30 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Recapiti telefonici</Label>
                    <Button type="button" variant="ghost" size="sm" onClick={addRecapito}><Plus className="h-3 w-3 mr-1" />Aggiungi</Button>
                  </div>
                  {form.recapiti_telefonici.map((r, i) => (
                    <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                      <Input placeholder="Nome" value={r.nome} onChange={e => updateRecapito(i, 'nome', e.target.value)} />
                      <Input placeholder="Telefono" value={r.telefono} onChange={e => updateRecapito(i, 'telefono', e.target.value)} />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeRecapito(i)}><X className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Data inizio</Label><Input type="date" value={form.data_inizio} onChange={e => update('data_inizio', e.target.value)} /></div>
                  <div><Label>Data fine</Label><Input type="date" value={form.data_fine} onChange={e => update('data_fine', e.target.value)} /></div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Adulti</Label><Input type="number" min={0} value={form.num_adulti} onChange={e => update('num_adulti', parseInt(e.target.value) || 0)} /></div>
                  <div><Label>4–10 anni</Label><Input type="number" min={0} value={form.num_4_10_anni} onChange={e => update('num_4_10_anni', parseInt(e.target.value) || 0)} /></div>
                  <div><Label>0–3 anni</Label><Input type="number" min={0} value={form.num_0_3_anni} onChange={e => update('num_0_3_anni', parseInt(e.target.value) || 0)} /></div>
                </div>

                <div className="bg-muted/30 rounded-xl p-3 space-y-2">
                  <Label>Figli &gt; 10 anni</Label>
                  <div className="flex gap-3 text-sm">
                    {([1, 2, 3] as const).map(n => {
                      const key = `figlio_${n}_over10` as 'figlio_1_over10' | 'figlio_2_over10' | 'figlio_3_over10';
                      return (
                        <label key={n} className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={form[key]} onChange={e => update(key, e.target.checked)} className="h-4 w-4" />
                          Figlio {n}
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Animali</Label><Input type="number" min={0} value={form.num_animali} onChange={e => update('num_animali', parseInt(e.target.value) || 0)} /></div>
                  <div><Label>Acconto versato (€)</Label><Input type="number" min={0} step="0.01" value={form.acconto_versato} onChange={e => update('acconto_versato', parseFloat(e.target.value) || 0)} /></div>
                </div>

                <div className="space-y-2">
                  <Label>Categoria tariffaria</Label>
                  <Select
                    value={form.categoria_tariffa ? String(form.categoria_tariffa) : ''}
                    onValueChange={(v) => update('categoria_tariffa', parseInt(v) as any)}
                  >
                    <SelectTrigger><SelectValue placeholder="Seleziona categoria..." /></SelectTrigger>
                    <SelectContent>
                      {tariffe.map(t => (
                        <SelectItem key={t.categoria} value={String(t.categoria)}>
                          {t.categoria}. {t.descrizione}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/20 border border-orange-200 dark:border-orange-900/50 rounded-xl p-3 space-y-2 text-sm">
                  <h4 className="font-semibold text-foreground">💶 Anteprima totale</h4>
                  {!tariffaCorrente ? (
                    <p className="text-amber-700 dark:text-amber-400 text-xs">Seleziona una categoria per calcolare il totale.</p>
                  ) : calcolo.giorni === 0 ? (
                    <p className="text-amber-700 dark:text-amber-400 text-xs">Imposta date valide per calcolare il totale.</p>
                  ) : (
                    <>
                      <p className="text-xs text-muted-foreground">Giorni: <strong className="text-foreground">{calcolo.giorni}</strong></p>
                      <div className="text-xs space-y-0.5 text-muted-foreground">
                        {calcolo.righe.map((r, i) => (
                          <p key={i}>• {r.voce}: {r.persone} × {formatEuro(r.prezzoGiorno)} × {r.giorni}gg = <strong className="text-foreground">{formatEuro(r.subtotale)}</strong></p>
                        ))}
                      </div>
                      <p className="text-base font-bold text-foreground pt-1 border-t border-orange-200/60 dark:border-orange-900/40">
                        Totale dovuto: {formatEuro(calcolo.totale)}
                      </p>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Button variant="outline" onClick={() => { setForm({ ...item }); setEditMode(false); }}>
                    <X className="h-4 w-4 mr-2" />Annulla
                  </Button>
                  <Button onClick={handleSave} disabled={updateMut.isPending}>
                    {updateMut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Salva modifiche
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
            <AlertDialogTitle>Eliminare definitivamente questa iscrizione?</AlertDialogTitle>
            <AlertDialogDescription>
              L'operazione è irreversibile. Verrà rimossa l'iscrizione di <strong>{item.cognome} {item.nome}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Elimina definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <InviaComunicazioneFamigliaWizard
        iscrizione={item}
        open={comunicazioneOpen}
        onOpenChange={setComunicazioneOpen}
      />
    </>
  );
}

function exportCSV(items: IscrizioneFamiglia[]) {
  const header = ['Cognome', 'Nome', 'Email', 'Residenza', 'Via', 'Recapiti', 'Periodo', 'Dal', 'Al', 'Adulti', 'Figli>10', '4-10', '0-3', 'Animali', 'Acconto', 'Data firma'];
  const rows = items.map(i => [
    i.cognome, i.nome, i.email, i.residente_a, i.via,
    i.recapiti_telefonici.map(r => `${r.nome}: ${r.telefono}`).join(' | '),
    TIPO_PERIODO_LABEL[i.tipo_periodo],
    formatDate(i.data_inizio), formatDate(i.data_fine),
    i.num_adulti,
    [i.figlio_1_over10, i.figlio_2_over10, i.figlio_3_over10].filter(Boolean).length,
    i.num_4_10_anni, i.num_0_3_anni, i.num_animali,
    i.acconto_versato, formatDate(i.firma_data),
  ]);
  const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `anagrafica_turno_famiglie_${format(new Date(), 'yyyyMMdd')}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

export default function AnagraficaTurnoFamiglie() {
  const { data: items = [], isLoading } = useIscrizioniFamiglie();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<IscrizioneFamiglia | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [archiviatiOpen, setArchiviatiOpen] = useState(false);

  const matches = (i: IscrizioneFamiglia) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return `${i.cognome} ${i.nome}`.toLowerCase().includes(q) ||
      i.email.toLowerCase().includes(q) ||
      i.residente_a.toLowerCase().includes(q);
  };

  const attivi = useMemo(() => items.filter(i => !i.archiviato && matches(i)), [items, search]);
  const archiviati = useMemo(() => items.filter(i => i.archiviato && matches(i)), [items, search]);

  return (
    <MainLayout title="Anagrafica Turno Famiglie">
      <div className="space-y-6">
        <Card className="border-0 shadow-sm rounded-2xl bg-gradient-to-r from-orange-100 to-amber-100 dark:from-orange-950/30 dark:to-amber-950/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-md">
              <Tent className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-foreground">Turno Famiglie</h2>
              <p className="text-sm text-muted-foreground">{attivi.length} attiv{attivi.length === 1 ? 'a' : 'e'} · {archiviati.length} archiviat{archiviati.length === 1 ? 'a' : 'e'}</p>
            </div>
            <Button variant="outline" onClick={() => exportCSV(attivi)} disabled={attivi.length === 0}>
              <Download className="h-4 w-4 mr-2" />Esporta CSV
            </Button>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm rounded-2xl bg-muted/30">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Cerca per nome, cognome, email o residenza..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-xl bg-background" />
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : attivi.length === 0 && archiviati.length === 0 ? (
          <Card><CardContent className="py-8 text-center"><Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" /><p className="text-muted-foreground">Nessuna iscrizione presente.</p></CardContent></Card>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {attivi.map(item => (
                <FamigliaCard key={item.id} item={item} onClick={() => { setSelected(item); setDrawerOpen(true); }} />
              ))}
            </div>

            {archiviati.length > 0 && (
              <Collapsible open={archiviatiOpen} onOpenChange={setArchiviatiOpen} className="mt-8">
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    <span className="flex items-center gap-2"><Archive className="h-4 w-4" />Archiviate ({archiviati.length})</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${archiviatiOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {archiviati.map(item => (
                      <FamigliaCard key={item.id} item={item} onClick={() => { setSelected(item); setDrawerOpen(true); }} />
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </>
        )}
      </div>

      <FamigliaDetailDrawer item={selected} open={drawerOpen} onOpenChange={setDrawerOpen} />
    </MainLayout>
  );
}
