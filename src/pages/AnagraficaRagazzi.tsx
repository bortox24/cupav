import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useRagazzi, useUpdateRagazzo, useAddIscrizione, useDeleteIscrizione, RagazzoCompleto, formatDataNascita } from '@/hooks/useRagazzi';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Loader2, Search, MapPin, Calendar, Users, GraduationCap, Phone, Mail, Pencil, Plus, Trash2, X, Save } from 'lucide-react';
import { toast } from 'sonner';

const CURRENT_YEAR = new Date().getFullYear();

const TURNI_OPTIONS = [
  '1^ Elementare', '2^ Elementare', '3^ Elementare', '4^ Elementare', '5^ Elementare',
  '1^ Media', '2^ Media', '3^ Media',
  '1^ Superiore', '2^ Superiore', '3^ Superiore', '4^ Superiore', '5^ Superiore',
];

function RagazzoCard({ ragazzo, onClick }: { ragazzo: RagazzoCompleto; onClick: () => void }) {
  const iscrizioneCorrente = ragazzo.iscrizioni.find((i) => i.anno === CURRENT_YEAR);

  return (
    <Card className="h-full cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardContent className="p-4 space-y-2">
        <p className="font-semibold text-base">{ragazzo.full_name}</p>
        {ragazzo.data_nascita && (
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {formatDataNascita(ragazzo.data_nascita)}
          </p>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={ragazzo.residente_altavilla ? 'default' : 'secondary'} className="text-xs">
            <MapPin className="h-3 w-3 mr-1" />
            {ragazzo.residente_altavilla ? 'Residente' : 'Non residente'}
          </Badge>
          {iscrizioneCorrente && (
            <Badge variant="outline" className="text-xs">
              <GraduationCap className="h-3 w-3 mr-1" />
              {CURRENT_YEAR}: {iscrizioneCorrente.turno}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function RagazzoDialog({ ragazzo, open, onOpenChange }: { ragazzo: RagazzoCompleto; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({ full_name: '', data_nascita: '', residente_altavilla: false, genitori: [] as { nome_cognome: string; ruolo: string; email: string; telefono: string }[] });

  const [addingIscrizione, setAddingIscrizione] = useState(false);
  const [newAnno, setNewAnno] = useState(String(CURRENT_YEAR));
  const [newTurno, setNewTurno] = useState('');

  const updateMutation = useUpdateRagazzo();
  const addIscrizioneMutation = useAddIscrizione();
  const deleteIscrizioneMutation = useDeleteIscrizione();

  const startEdit = () => {
    setEditData({
      full_name: ragazzo.full_name,
      data_nascita: ragazzo.data_nascita || '',
      residente_altavilla: ragazzo.residente_altavilla,
      genitori: ragazzo.genitori.map((g) => ({
        nome_cognome: g.nome_cognome,
        ruolo: g.ruolo,
        email: g.email || '',
        telefono: g.telefono || '',
      })),
    });
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const saveEdit = () => {
    updateMutation.mutate({
      id: ragazzo.id,
      full_name: editData.full_name,
      data_nascita: editData.data_nascita || null,
      residente_altavilla: editData.residente_altavilla,
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

  // Year options: from 2020 to current+2
  const yearOptions = Array.from({ length: CURRENT_YEAR - 2020 + 3 }, (_, i) => 2020 + i);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{ragazzo.full_name}</DialogTitle>
          <DialogDescription>Dettaglio anagrafica</DialogDescription>
        </DialogHeader>

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

            {/* Iscrizioni */}
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
                      <SelectContent>{yearOptions.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
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

            <Separator />
            <Button onClick={startEdit} className="w-full"><Pencil className="h-4 w-4 mr-2" /> Modifica dati</Button>
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
      </DialogContent>
    </Dialog>
  );
}

export default function AnagraficaRagazzi() {
  const { data: ragazzi, isLoading } = useRagazzi();
  const [search, setSearch] = useState('');
  const [selectedRagazzo, setSelectedRagazzo] = useState<RagazzoCompleto | null>(null);

  const filtered = ragazzi?.filter((r) =>
    r.full_name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  // Keep dialog ragazzo in sync with fresh data
  const dialogRagazzo = selectedRagazzo ? ragazzi?.find((r) => r.id === selectedRagazzo.id) || selectedRagazzo : null;

  return (
    <MainLayout title="Anagrafica Ragazzi">
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cerca per nome..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {search ? 'Nessun ragazzo trovato.' : 'Nessun ragazzo registrato.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r) => (
            <RagazzoCard key={r.id} ragazzo={r} onClick={() => setSelectedRagazzo(r)} />
          ))}
        </div>
      )}

      {dialogRagazzo && (
        <RagazzoDialog ragazzo={dialogRagazzo} open={!!selectedRagazzo} onOpenChange={(v) => { if (!v) setSelectedRagazzo(null); }} />
      )}
    </MainLayout>
  );
}
