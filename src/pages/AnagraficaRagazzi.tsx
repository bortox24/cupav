import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useRagazzi, useUpdateRagazzo, useAddIscrizione, useDeleteIscrizione, useArchiveRagazzo, useDeleteRagazzo, RagazzoCompleto, formatDataNascita } from '@/hooks/useRagazzi';
import { useAuth } from '@/lib/auth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { Loader2, Search, MapPin, Calendar, Users, GraduationCap, Phone, Mail, Pencil, Plus, Trash2, X, Save, Archive, ChevronDown, ArchiveRestore, Sparkles, AlertTriangle, Pill, Send, Check, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

const CURRENT_YEAR = new Date().getFullYear();

const TURNI_OPTIONS = [
  '4^ Elementare', '5^ Elementare',
  '1^ Media', '2^ Media', '3^ Media',
  'Turno famiglie',
];

const YEAR_OPTIONS = Array.from({ length: 2040 - 2020 + 1 }, (_, i) => 2020 + i);

function RagazzoCard({ ragazzo, onClick }: { ragazzo: RagazzoCompleto; onClick: () => void }) {
  const iscrizioneCorrente = ragazzo.iscrizioni.find((i) => i.anno === CURRENT_YEAR);
  const [localNumero, setLocalNumero] = useState<string>(ragazzo.numero != null ? String(ragazzo.numero) : '');

  const handleBlur = async () => {
    const val = localNumero.trim() === '' ? null : parseInt(localNumero, 10);
    if (val === ragazzo.numero) return;
    const { error } = await supabase.from('ragazzi').update({ numero: val } as any).eq('id', ragazzo.id);
    if (error) toast.error('Errore salvataggio numero');
  };

  return (
    <Card
      className="h-full cursor-pointer group relative overflow-hidden border-0 bg-card shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
      onClick={onClick}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-primary/60 opacity-80 group-hover:opacity-100 transition-opacity" />
      <CardContent className="p-5 pt-5 space-y-3">
        <div className="flex items-start justify-between">
          <p className="font-bold text-lg tracking-tight leading-tight">{ragazzo.full_name}</p>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={localNumero}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '');
              setLocalNumero(v);
            }}
            onBlur={handleBlur}
            className="w-10 h-10 rounded-md border border-input bg-background text-center text-sm font-bold focus:outline-none focus:ring-2 focus:ring-ring shrink-0"
            placeholder="#"
          />
        </div>
        {ragazzo.data_nascita && (
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {formatDataNascita(ragazzo.data_nascita)}
          </p>
        )}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <Badge
            variant={ragazzo.residente_altavilla ? 'default' : 'secondary'}
            className="text-xs font-medium px-3 py-0.5 shadow-sm"
          >
            <MapPin className="h-3 w-3 mr-1" />
            {ragazzo.residente_altavilla ? 'Residente' : 'Non residente'}
          </Badge>
          {iscrizioneCorrente && (
            <Badge variant="outline" className="text-xs font-medium px-3 py-0.5 border-primary/30 text-primary bg-primary/5">
              <GraduationCap className="h-3 w-3 mr-1" />
              {CURRENT_YEAR}: {iscrizioneCorrente.turno}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function RagazzoDrawer({ ragazzo, open, onOpenChange }: { ragazzo: RagazzoCompleto; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    full_name: '', data_nascita: '', residente_altavilla: false,
    ha_allergie: false, allergie_dettaglio: '', patologie_dettaglio: '',
    farmaco_1_nome: '', farmaco_1_posologia: '',
    farmaco_2_nome: '', farmaco_2_posologia: '',
    farmaco_3_nome: '', farmaco_3_posologia: '',
    genitori: [] as { nome_cognome: string; ruolo: string; email: string; telefono: string }[],
  });

  const [addingIscrizione, setAddingIscrizione] = useState(false);
  const [newAnno, setNewAnno] = useState(String(CURRENT_YEAR));
  const [newTurno, setNewTurno] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [sendingWebhook, setSendingWebhook] = useState(false);
  const [confirmInvio, setConfirmInvio] = useState(false);

  const updateMutation = useUpdateRagazzo();
  const addIscrizioneMutation = useAddIscrizione();
  const deleteIscrizioneMutation = useDeleteIscrizione();
  const archiveMutation = useArchiveRagazzo();
  const deleteMutation = useDeleteRagazzo();

  // Fetch invio logs for this ragazzo
  const { data: invioLogs = [] } = useQuery({
    queryKey: ['anagrafica-invio-logs', ragazzo.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('anagrafica_invio_logs' as any)
        .select('*')
        .eq('ragazzo_id', ragazzo.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: open,
  });

  const startEdit = () => {
    setEditData({
      full_name: ragazzo.full_name,
      data_nascita: ragazzo.data_nascita || '',
      residente_altavilla: ragazzo.residente_altavilla,
      ha_allergie: ragazzo.ha_allergie,
      allergie_dettaglio: ragazzo.allergie_dettaglio || '',
      patologie_dettaglio: ragazzo.patologie_dettaglio || '',
      farmaco_1_nome: ragazzo.farmaco_1_nome || '',
      farmaco_1_posologia: ragazzo.farmaco_1_posologia || '',
      farmaco_2_nome: ragazzo.farmaco_2_nome || '',
      farmaco_2_posologia: ragazzo.farmaco_2_posologia || '',
      farmaco_3_nome: ragazzo.farmaco_3_nome || '',
      farmaco_3_posologia: ragazzo.farmaco_3_posologia || '',
      genitori: ragazzo.genitori.map((g) => ({
        nome_cognome: g.nome_cognome,
        ruolo: g.ruolo,
        email: g.email || '',
        telefono: g.telefono || '',
      })),
    });
    setEditing(true);
  };

  const cancelEdit = () => { setEditing(false); setAddingIscrizione(false); };

  const saveEdit = () => {
    updateMutation.mutate({
      id: ragazzo.id,
      full_name: editData.full_name,
      data_nascita: editData.data_nascita || null,
      residente_altavilla: editData.residente_altavilla,
      ha_allergie: editData.ha_allergie,
      allergie_dettaglio: editData.allergie_dettaglio || null,
      patologie_dettaglio: editData.patologie_dettaglio || null,
      farmaco_1_nome: editData.farmaco_1_nome || null,
      farmaco_1_posologia: editData.farmaco_1_posologia || null,
      farmaco_2_nome: editData.farmaco_2_nome || null,
      farmaco_2_posologia: editData.farmaco_2_posologia || null,
      farmaco_3_nome: editData.farmaco_3_nome || null,
      farmaco_3_posologia: editData.farmaco_3_posologia || null,
      genitori: editData.genitori.filter((g) => g.nome_cognome.trim()),
    }, {
      onSuccess: () => { toast.success('Dati aggiornati'); setEditing(false); },
      onError: () => toast.error('Errore durante il salvataggio'),
    });
  };

  const handleAddIscrizione = () => {
    if (!newTurno) { toast.error('Seleziona un turno'); return; }
    addIscrizioneMutation.mutate({ ragazzo_id: ragazzo.id, anno: Number(newAnno), turno: newTurno }, {
      onSuccess: () => { toast.success('Iscrizione aggiunta'); setAddingIscrizione(false); setNewTurno(''); },
      onError: () => toast.error('Errore'),
    });
  };

  const handleDeleteIscrizione = (id: string) => {
    deleteIscrizioneMutation.mutate(id, {
      onSuccess: () => toast.success('Iscrizione eliminata'),
      onError: () => toast.error('Errore'),
    });
  };

  const handleArchive = () => {
    archiveMutation.mutate({ id: ragazzo.id, archiviato: !ragazzo.archiviato }, {
      onSuccess: () => { toast.success(ragazzo.archiviato ? 'Ragazzo/a ripristinato/a' : 'Ragazzo/a archiviato/a'); onOpenChange(false); },
      onError: () => toast.error('Errore'),
    });
  };

  const handleDelete = () => {
    deleteMutation.mutate(ragazzo.id, {
      onSuccess: () => { toast.success('Ragazzo/a eliminato/a'); onOpenChange(false); },
      onError: () => toast.error('Errore durante l\'eliminazione'),
    });
  };

  const handleInviaIscrizione = async () => {
    if (!user || !profile) { toast.error('Utente non autenticato'); return; }
    setSendingWebhook(true);
    let successo = false;
    try {
      // Get webhook URL from webhook_config with description "Invio iscrizione anagrafica"
      const { data: webhookRows } = await supabase
        .from('webhook_config')
        .select('webhook_url')
        .ilike('descrizione', '%invio iscrizione%')
        .limit(1);
      
      const webhookUrl = webhookRows?.[0]?.webhook_url;
      if (!webhookUrl) {
        toast.error('Nessun webhook configurato con descrizione "Invio iscrizione"');
        setSendingWebhook(false);
        return;
      }

      // Call the webhook POST
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ragazzo_id: ragazzo.id,
          full_name: ragazzo.full_name,
          data_nascita: ragazzo.data_nascita,
          residente_altavilla: ragazzo.residente_altavilla,
          ha_allergie: ragazzo.ha_allergie,
          allergie_dettaglio: ragazzo.allergie_dettaglio,
          patologie_dettaglio: ragazzo.patologie_dettaglio,
          genitori: ragazzo.genitori,
          iscrizioni: ragazzo.iscrizioni,
          farmaco_1_nome: ragazzo.farmaco_1_nome,
          farmaco_1_posologia: ragazzo.farmaco_1_posologia,
          farmaco_2_nome: ragazzo.farmaco_2_nome,
          farmaco_2_posologia: ragazzo.farmaco_2_posologia,
          farmaco_3_nome: ragazzo.farmaco_3_nome,
          farmaco_3_posologia: ragazzo.farmaco_3_posologia,
        }),
      });
      successo = res.ok;
      if (successo) {
        toast.success('Iscrizione inviata con successo!');
      } else {
        toast.error('Errore nell\'invio dell\'iscrizione');
      }
    } catch {
      toast.error('Errore di rete nell\'invio');
    }

    // Log the attempt
    await supabase.from('anagrafica_invio_logs' as any).insert({
      ragazzo_id: ragazzo.id,
      inviato_da: user.id,
      inviato_da_nome: profile.full_name || profile.email,
      successo,
    });
    queryClient.invalidateQueries({ queryKey: ['anagrafica-invio-logs', ragazzo.id] });
    setSendingWebhook(false);
  };

  const updateGenitore = (idx: number, field: string, value: string) => {
    setEditData((prev) => {
      const genitori = [...prev.genitori];
      genitori[idx] = { ...genitori[idx], [field]: value };
      return { ...prev, genitori };
    });
  };

  const addGenitore = () => {
    setEditData((prev) => ({ ...prev, genitori: [...prev.genitori, { nome_cognome: '', ruolo: 'Madre', email: '', telefono: '' }] }));
  };

  const removeGenitore = (idx: number) => {
    setEditData((prev) => ({ ...prev, genitori: prev.genitori.filter((_, i) => i !== idx) }));
  };

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[92vh]">
          <div className="overflow-y-auto px-5 pb-8">
            <DrawerHeader className="px-0 pb-4">
              <DrawerTitle className="text-xl text-left">{ragazzo.full_name}</DrawerTitle>
              <p className="text-sm text-muted-foreground text-left">Dettaglio anagrafica</p>
            </DrawerHeader>

            {!editing ? (
              <div className="space-y-4">
                {/* Dati ragazzo */}
                <div className="space-y-1">
                  <p className="text-sm"><span className="font-medium">Data di nascita:</span> {formatDataNascita(ragazzo.data_nascita)}</p>
                  <div className="flex items-center gap-1">
                    <Badge variant={ragazzo.residente_altavilla ? 'default' : 'secondary'} className="text-xs">
                      <MapPin className="h-3 w-3 mr-1" />
                      {ragazzo.residente_altavilla ? 'Residente' : 'Non residente'}
                    </Badge>
                  </div>
                </div>

                <Separator />

                {/* Genitori */}
                <div className="space-y-2">
                  <p className="text-sm font-medium flex items-center gap-1"><Users className="h-4 w-4" /> Genitori</p>
                  {ragazzo.genitori.length === 0 && <p className="text-sm text-muted-foreground">Nessun genitore registrato</p>}
                  {ragazzo.genitori.map((g) => (
                    <div key={g.id} className="text-sm bg-muted/50 rounded-lg p-2.5 space-y-1">
                      <p className="font-medium">{g.nome_cognome} <span className="text-muted-foreground font-normal">({g.ruolo})</span></p>
                      {g.email && <p className="text-muted-foreground flex items-center gap-1 text-xs"><Mail className="h-3 w-3" /> {g.email}</p>}
                      {g.telefono && <p className="text-muted-foreground flex items-center gap-1 text-xs"><Phone className="h-3 w-3" /> {g.telefono}</p>}
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Iscrizioni - read only */}
                <div className="space-y-2">
                  <p className="text-sm font-medium flex items-center gap-1"><GraduationCap className="h-4 w-4" /> Iscrizioni</p>
                  {ragazzo.iscrizioni.length === 0 && <p className="text-sm text-muted-foreground">Nessuna iscrizione</p>}
                  {ragazzo.iscrizioni.map((i) => (
                    <div key={i.id} className={`text-sm rounded-lg p-2 ${i.anno === CURRENT_YEAR ? 'bg-primary/10 font-semibold' : 'bg-muted/30'}`}>
                      <span>{i.anno}: {i.turno}</span>
                    </div>
                  ))}
                </div>

                {/* Dati medici */}
                {(ragazzo.ha_allergie || ragazzo.allergie_dettaglio || ragazzo.patologie_dettaglio || ragazzo.farmaco_1_nome) && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <p className="text-sm font-medium flex items-center gap-1"><AlertTriangle className="h-4 w-4 text-red-500" /> Allergie / Patologie / Farmaci</p>
                      <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-3 space-y-1.5 text-sm">
                        {ragazzo.allergie_dettaglio && (
                          <p><span className="font-medium">Allergie:</span> {ragazzo.allergie_dettaglio}</p>
                        )}
                        {ragazzo.patologie_dettaglio && (
                          <p><span className="font-medium">Patologie:</span> {ragazzo.patologie_dettaglio}</p>
                        )}
                        {ragazzo.farmaco_1_nome && (
                          <p className="flex items-center gap-1"><Pill className="h-3 w-3" /> {ragazzo.farmaco_1_nome}{ragazzo.farmaco_1_posologia ? ` — ${ragazzo.farmaco_1_posologia}` : ''}</p>
                        )}
                        {ragazzo.farmaco_2_nome && (
                          <p className="flex items-center gap-1"><Pill className="h-3 w-3" /> {ragazzo.farmaco_2_nome}{ragazzo.farmaco_2_posologia ? ` — ${ragazzo.farmaco_2_posologia}` : ''}</p>
                        )}
                        {ragazzo.farmaco_3_nome && (
                          <p className="flex items-center gap-1"><Pill className="h-3 w-3" /> {ragazzo.farmaco_3_nome}{ragazzo.farmaco_3_posologia ? ` — ${ragazzo.farmaco_3_posologia}` : ''}</p>
                        )}
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                {/* Buttons */}
                <div className="flex flex-col gap-2">
                  <Button onClick={() => setConfirmInvio(true)} disabled={sendingWebhook} variant="default" className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white">
                    {sendingWebhook ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                    Invia iscrizione
                  </Button>
                  <Button onClick={startEdit} className="w-full"><Pencil className="h-4 w-4 mr-2" /> Modifica dati</Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={async () => {
                      toast.info('Arricchimento dati in corso...');
                      const { data, error } = await supabase.functions.invoke('enrich-anagrafica', {
                        body: { ragazzo_id: ragazzo.id },
                      });
                      if (error) {
                        toast.error('Errore: ' + error.message);
                      } else if (data?.enriched) {
                        toast.success('Dati arricchiti con successo!');
                        onOpenChange(false);
                      } else {
                        toast.info(data?.message || 'Nessun dato da arricchire');
                      }
                    }}
                  >
                    <Sparkles className="h-4 w-4 mr-2" /> Arricchisci dati
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={handleArchive} disabled={archiveMutation.isPending}>
                      {ragazzo.archiviato ? <ArchiveRestore className="h-4 w-4 mr-2" /> : <Archive className="h-4 w-4 mr-2" />}
                      {ragazzo.archiviato ? 'Ripristina' : 'Archivia'}
                    </Button>
                    <Button variant="destructive" className="flex-1" onClick={() => setShowDeleteConfirm(true)}>
                      <Trash2 className="h-4 w-4 mr-2" /> Elimina
                    </Button>
                  </div>
                </div>

                {/* Log section */}
                <Separator />
                <div className="space-y-2">
                  <p className="text-sm font-medium flex items-center gap-1">📋 Log invii</p>
                  {invioLogs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nessun invio effettuato</p>
                  ) : (
                    <div className="space-y-1.5">
                      {(invioLogs as any[]).map((log: any) => (
                        <div key={log.id} className="flex items-center gap-2 text-sm bg-muted/40 rounded-lg px-3 py-2">
                          {log.successo ? (
                            <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <span className="font-medium">{log.inviato_da_nome}</span>
                            <span className="text-muted-foreground ml-2 text-xs">
                              {format(new Date(log.created_at), 'dd-MM-yyyy, HH:mm')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Edit mode */
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome e cognome</Label>
                  <Input value={editData.full_name} onChange={(e) => setEditData((p) => ({ ...p, full_name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Data di nascita</Label>
                  <Input type="date" value={editData.data_nascita} onChange={(e) => setEditData((p) => ({ ...p, data_nascita: e.target.value }))} />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={editData.residente_altavilla} onCheckedChange={(v) => setEditData((p) => ({ ...p, residente_altavilla: v }))} />
                  <Label>Residente ad Altavilla</Label>
                </div>

                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Genitori</Label>
                    <Button variant="outline" size="sm" onClick={addGenitore}><Plus className="h-3 w-3 mr-1" /> Aggiungi</Button>
                  </div>
                  {editData.genitori.map((g, idx) => (
                    <div key={idx} className="bg-muted/50 rounded-lg p-3 space-y-2 relative">
                      <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => removeGenitore(idx)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                      <Input placeholder="Nome e cognome" value={g.nome_cognome} onChange={(e) => updateGenitore(idx, 'nome_cognome', e.target.value)} />
                      <Select value={g.ruolo} onValueChange={(v) => updateGenitore(idx, 'ruolo', v)}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Madre">Madre</SelectItem>
                          <SelectItem value="Padre">Padre</SelectItem>
                          <SelectItem value="Tutore">Tutore</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input placeholder="Email" value={g.email} onChange={(e) => updateGenitore(idx, 'email', e.target.value)} />
                      <Input placeholder="Telefono" value={g.telefono} onChange={(e) => updateGenitore(idx, 'telefono', e.target.value)} />
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Medical fields */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Switch checked={editData.ha_allergie} onCheckedChange={(v) => setEditData((p) => ({ ...p, ha_allergie: v }))} />
                    <Label className="flex items-center gap-1"><AlertTriangle className="h-4 w-4 text-red-500" /> Ha allergie/patologie</Label>
                  </div>
                  {editData.ha_allergie && (
                    <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-3 space-y-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Dettaglio allergie</Label>
                        <Input value={editData.allergie_dettaglio} onChange={(e) => setEditData((p) => ({ ...p, allergie_dettaglio: e.target.value }))} placeholder="Es. polvere, polline..." />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Dettaglio patologie</Label>
                        <Input value={editData.patologie_dettaglio} onChange={(e) => setEditData((p) => ({ ...p, patologie_dettaglio: e.target.value }))} placeholder="Es. asma, stanchezza..." />
                      </div>
                      <Separator />
                      <Label className="text-xs flex items-center gap-1"><Pill className="h-3 w-3" /> Farmaci</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="Farmaco 1" value={editData.farmaco_1_nome} onChange={(e) => setEditData((p) => ({ ...p, farmaco_1_nome: e.target.value }))} />
                        <Input placeholder="Posologia 1" value={editData.farmaco_1_posologia} onChange={(e) => setEditData((p) => ({ ...p, farmaco_1_posologia: e.target.value }))} />
                        <Input placeholder="Farmaco 2" value={editData.farmaco_2_nome} onChange={(e) => setEditData((p) => ({ ...p, farmaco_2_nome: e.target.value }))} />
                        <Input placeholder="Posologia 2" value={editData.farmaco_2_posologia} onChange={(e) => setEditData((p) => ({ ...p, farmaco_2_posologia: e.target.value }))} />
                        <Input placeholder="Farmaco 3" value={editData.farmaco_3_nome} onChange={(e) => setEditData((p) => ({ ...p, farmaco_3_nome: e.target.value }))} />
                        <Input placeholder="Posologia 3" value={editData.farmaco_3_posologia} onChange={(e) => setEditData((p) => ({ ...p, farmaco_3_posologia: e.target.value }))} />
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Iscrizioni - editable in edit mode */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium flex items-center gap-1"><GraduationCap className="h-4 w-4" /> Iscrizioni</p>
                    <Button variant="outline" size="sm" onClick={() => setAddingIscrizione(true)}>
                      <Plus className="h-3 w-3 mr-1" /> Aggiungi
                    </Button>
                  </div>

                  {addingIscrizione && (
                    <div className="flex items-end gap-2 bg-muted/50 rounded-lg p-2.5">
                      <div className="flex-1">
                        <Label className="text-xs">Anno</Label>
                        <Select value={newAnno} onValueChange={setNewAnno}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>{YEAR_OPTIONS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs">Turno</Label>
                        <Select value={newTurno} onValueChange={setNewTurno}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleziona..." /></SelectTrigger>
                          <SelectContent>{TURNI_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <Button size="sm" className="h-8" onClick={handleAddIscrizione} disabled={addIscrizioneMutation.isPending}>
                        <Save className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8" onClick={() => setAddingIscrizione(false)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}

                  {ragazzo.iscrizioni.length === 0 && <p className="text-sm text-muted-foreground">Nessuna iscrizione</p>}
                  {ragazzo.iscrizioni.map((i) => (
                    <div key={i.id} className={`flex items-center justify-between text-sm rounded-lg p-2 ${i.anno === CURRENT_YEAR ? 'bg-primary/10 font-semibold' : 'bg-muted/30'}`}>
                      <span>{i.anno}: {i.turno}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteIscrizione(i.id)} disabled={deleteIscrizioneMutation.isPending}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button onClick={saveEdit} className="flex-1" disabled={updateMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" /> Salva
                  </Button>
                  <Button variant="outline" onClick={cancelEdit} className="flex-1">
                    <X className="h-4 w-4 mr-2" /> Annulla
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare <strong>{ragazzo.full_name}</strong>? Questa azione è irreversibile e cancellerà tutti i dati associati (genitori e iscrizioni).
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

      <AlertDialog open={confirmInvio} onOpenChange={setConfirmInvio}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma invio iscrizione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler inviare l'iscrizione di <strong>{ragazzo.full_name}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setConfirmInvio(false); handleInviaIscrizione(); }}>
              Conferma invio
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function AnagraficaRagazzi() {
  const { data: ragazzi, isLoading } = useRagazzi();
  const [search, setSearch] = useState('');
  const [filterTurno, setFilterTurno] = useState<string>('all');
  const [selectedRagazzo, setSelectedRagazzo] = useState<RagazzoCompleto | null>(null);
  const [archiviatiOpen, setArchiviatiOpen] = useState(false);
  const [enrichingAll, setEnrichingAll] = useState(false);

  const matchesSearch = (r: RagazzoCompleto) => {
    const q = search.toLowerCase();
    if (!q) return true;
    if (r.full_name.toLowerCase().includes(q)) return true;
    if (r.genitori.some((g) => g.nome_cognome.toLowerCase().includes(q))) return true;
    return false;
  };

  const matchesTurno = (r: RagazzoCompleto) => {
    if (filterTurno === 'all') return true;
    return r.iscrizioni.some((i) => i.anno === CURRENT_YEAR && i.turno === filterTurno);
  };

  const attivi = ragazzi?.filter((r) => !r.archiviato && matchesSearch(r) && matchesTurno(r)) || [];
  const archiviati = ragazzi?.filter((r) => r.archiviato && matchesSearch(r) && matchesTurno(r)) || [];

  const preIscrizioniCount = ragazzi
    ? ragazzi.filter((r) => !r.archiviato && r.iscrizioni.some((i) =>
        i.anno === CURRENT_YEAR && (filterTurno === 'all' || i.turno === filterTurno)
      )).length
    : 0;

  const counterLabel = filterTurno === 'all'
    ? `Pre-iscrizioni ${CURRENT_YEAR}`
    : `Pre-iscrizioni ${CURRENT_YEAR} — ${filterTurno}`;

  const dialogRagazzo = selectedRagazzo ? ragazzi?.find((r) => r.id === selectedRagazzo.id) || selectedRagazzo : null;

  return (
    <MainLayout title="Anagrafica Ragazzi">
      <div className="inline-flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/20 px-4 py-2 mb-4">
        <Users className="h-4 w-4 text-primary" />
        <span className="text-sm text-primary">
          <span className="font-bold text-lg leading-none mr-1">{preIscrizioniCount}</span>
          {counterLabel}
        </span>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cerca per nome ragazzo o genitore..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterTurno} onValueChange={setFilterTurno}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filtra per turno" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i turni</SelectItem>
            {TURNI_OPTIONS.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          className="gap-2"
          disabled={enrichingAll}
          onClick={async () => {
            if (!ragazzi || ragazzi.length === 0) return;
            setEnrichingAll(true);
            let enriched = 0;
            let errors = 0;
            for (const r of ragazzi.filter(r => !r.archiviato)) {
              try {
                const { data, error } = await supabase.functions.invoke('enrich-anagrafica', {
                  body: { ragazzo_id: r.id },
                });
                if (error) { errors++; } else if (data?.enriched) { enriched++; }
              } catch { errors++; }
            }
            setEnrichingAll(false);
            toast.success(`Arricchimento completato: ${enriched} aggiornati, ${errors} errori`);
          }}
        >
          {enrichingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Arricchisci tutti
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : attivi.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {search ? 'Nessun ragazzo trovato.' : 'Nessun ragazzo registrato.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {attivi.map((r) => (
            <RagazzoCard key={r.id} ragazzo={r} onClick={() => setSelectedRagazzo(r)} />
          ))}
        </div>
      )}

      {/* Sezione archiviati */}
      {archiviati.length > 0 && (
        <Collapsible open={archiviatiOpen} onOpenChange={setArchiviatiOpen} className="mt-8">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between text-muted-foreground">
              <span className="flex items-center gap-2">
                <Archive className="h-4 w-4" />
                Archiviati ({archiviati.length})
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${archiviatiOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {archiviati.map((r) => (
                <RagazzoCard key={r.id} ragazzo={r} onClick={() => setSelectedRagazzo(r)} />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {dialogRagazzo && (
        <RagazzoDrawer ragazzo={dialogRagazzo} open={!!selectedRagazzo} onOpenChange={(v) => { if (!v) setSelectedRagazzo(null); }} />
      )}
    </MainLayout>
  );
}
