import { useState, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  useAnimatori, useAddAnimatore, useUpdateAnimatore, useArchiveAnimatore,
  useDeleteAnimatore, useAssignAnimatoreTurno, useRemoveAnimatoreTurno,
  AnimatoreCompleto, RUOLO_LABELS, RUOLO_COLORS,
} from '@/hooks/useAnimatori';
import { useAuth } from '@/lib/auth';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2, Search, Phone, Mail, Pencil, Plus, Trash2, X, Save,
  Archive, ArchiveRestore, GraduationCap, StickyNote, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

const CURRENT_YEAR = new Date().getFullYear();

const TURNI_OPTIONS = [
  '4° Elementare', '5° Elementare',
  '1° Media', '2° Media', '3° Media',
  'Turno famiglie',
];

function RuoloBadge({ ruolo }: { ruolo: string }) {
  return (
    <Badge className={`text-[11px] border-0 rounded-full px-2.5 py-0.5 pointer-events-none ${RUOLO_COLORS[ruolo] || 'bg-muted text-muted-foreground'}`}>
      {RUOLO_LABELS[ruolo] || ruolo}
    </Badge>
  );
}

function AnimatoreCard({ animatore, onClick }: { animatore: AnimatoreCompleto; onClick: () => void }) {
  const turniCorrente = animatore.turni.filter((t) => t.anno === CURRENT_YEAR);

  return (
    <Card
      className="h-full cursor-pointer group relative overflow-hidden border-0 bg-card shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
      onClick={onClick}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-primary/60 opacity-80 group-hover:opacity-100 transition-opacity" />
      <CardContent className="p-5 pt-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="font-bold text-lg tracking-tight leading-tight">{animatore.full_name}</p>
          <RuoloBadge ruolo={animatore.ruolo} />
        </div>
        {animatore.telefono && (
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5" />
            {animatore.telefono}
          </p>
        )}
        {animatore.email && (
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5" />
            {animatore.email}
          </p>
        )}
        {animatore.ha_allergie && (
          <Badge className="text-[11px] gap-1 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-0 rounded-full px-2.5 py-0.5 pointer-events-none">
            <AlertTriangle className="h-3 w-3" /> Allergie/Patologie
          </Badge>
        )}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          {turniCorrente.map((t) => (
            <Badge key={t.id} variant="outline" className="text-xs font-medium px-3 py-0.5 border-primary/30 text-primary bg-primary/5">
              <GraduationCap className="h-3 w-3 mr-1" />
              {CURRENT_YEAR}: {t.turno}
            </Badge>
          ))}
          {turniCorrente.length === 0 && (
            <Badge variant="secondary" className="text-xs font-medium px-3 py-0.5">
              Nessun turno assegnato
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AnimatoreDrawer({ animatore, open, onOpenChange }: { animatore: AnimatoreCompleto; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { isAdmin } = useAuth();
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    full_name: '', email: '', telefono: '', data_nascita: '', note: '', ruolo: 'animatore',
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAssignConfirm, setShowAssignConfirm] = useState(false);
  const [pendingTurno, setPendingTurno] = useState('');

  const updateMutation = useUpdateAnimatore();
  const archiveMutation = useArchiveAnimatore();
  const deleteMutation = useDeleteAnimatore();
  const assignTurnoMutation = useAssignAnimatoreTurno();
  const removeTurnoMutation = useRemoveAnimatoreTurno();

  const scrollRef = useRef<HTMLDivElement>(null);

  const startEdit = () => {
    setEditData({
      full_name: animatore.full_name,
      email: animatore.email || '',
      telefono: animatore.telefono || '',
      data_nascita: animatore.data_nascita || '',
      note: animatore.note || '',
      ruolo: animatore.ruolo || 'animatore',
    });
    setEditing(true);
    setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }, 0);
  };

  const saveEdit = () => {
    updateMutation.mutate({
      id: animatore.id,
      full_name: editData.full_name,
      email: editData.email || null,
      telefono: editData.telefono || null,
      data_nascita: editData.data_nascita || null,
      note: editData.note || null,
      ruolo: editData.ruolo,
    }, {
      onSuccess: () => { toast.success('Dati aggiornati'); setEditing(false); },
      onError: () => toast.error('Errore durante il salvataggio'),
    });
  };

  const handleAssignTurno = (turno: string) => {
    setPendingTurno(turno);
    setShowAssignConfirm(true);
  };

  const confirmAssignTurno = () => {
    assignTurnoMutation.mutate({ animatore_id: animatore.id, turno: pendingTurno }, {
      onSuccess: () => { toast.success(`${animatore.full_name} assegnato al turno ${pendingTurno}`); setShowAssignConfirm(false); },
      onError: () => { toast.error('Errore nell\'assegnazione'); setShowAssignConfirm(false); },
    });
  };

  const handleRemoveTurno = (id: string) => {
    removeTurnoMutation.mutate(id, {
      onSuccess: () => toast.success('Turno rimosso'),
      onError: () => toast.error('Errore'),
    });
  };

  const handleArchive = () => {
    archiveMutation.mutate({ id: animatore.id, archiviato: !animatore.archiviato }, {
      onSuccess: () => { toast.success(animatore.archiviato ? 'Ripristinato' : 'Archiviato'); onOpenChange(false); },
      onError: () => toast.error('Errore'),
    });
  };

  const handleDelete = () => {
    deleteMutation.mutate(animatore.id, {
      onSuccess: () => { toast.success('Eliminato'); onOpenChange(false); },
      onError: () => toast.error('Errore durante l\'eliminazione'),
    });
  };

  const assignedTurni = animatore.turni.filter((t) => t.anno === CURRENT_YEAR);
  const availableTurni = TURNI_OPTIONS.filter((t) => !assignedTurni.some((at) => at.turno === t));

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[92vh] min-h-0">
          <div ref={scrollRef} className="overflow-y-auto px-5 pb-8">
            <DrawerHeader className="px-0 pb-4">
              <div className="flex items-center gap-3">
                <div>
                  <DrawerTitle className="text-xl text-left">{animatore.full_name}</DrawerTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <RuoloBadge ruolo={animatore.ruolo} />
                    <p className="text-sm text-muted-foreground">Dettaglio staff</p>
                  </div>
                </div>
              </div>
            </DrawerHeader>

            {!editing ? (
              <div className="space-y-4">
                {/* Info */}
                <div className="space-y-1">
                  {animatore.data_nascita && (
                    <p className="text-sm"><span className="font-medium">Data di nascita:</span> {animatore.data_nascita}</p>
                  )}
                  {animatore.email && (
                    <p className="text-sm flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {animatore.email}</p>
                  )}
                  {animatore.telefono && (
                    <p className="text-sm flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {animatore.telefono}</p>
                  )}
                  {animatore.note && (
                    <p className="text-sm flex items-center gap-1.5"><StickyNote className="h-3.5 w-3.5" /> {animatore.note}</p>
                  )}
                </div>

                {/* Medical info */}
                {animatore.ha_allergie && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <p className="text-sm font-medium flex items-center gap-1 text-red-600 dark:text-red-400">
                        <AlertTriangle className="h-4 w-4" /> Allergie / Patologie
                      </p>
                      {animatore.allergie_dettaglio && (
                        <p className="text-sm text-muted-foreground">Allergie: {animatore.allergie_dettaglio}</p>
                      )}
                      {animatore.patologie_dettaglio && (
                        <p className="text-sm text-muted-foreground">Patologie: {animatore.patologie_dettaglio}</p>
                      )}
                      {animatore.farmaco_1_nome && (
                        <p className="text-sm text-muted-foreground">💊 {animatore.farmaco_1_nome}{animatore.farmaco_1_posologia ? ` — ${animatore.farmaco_1_posologia}` : ''}</p>
                      )}
                      {animatore.farmaco_2_nome && (
                        <p className="text-sm text-muted-foreground">💊 {animatore.farmaco_2_nome}{animatore.farmaco_2_posologia ? ` — ${animatore.farmaco_2_posologia}` : ''}</p>
                      )}
                      {animatore.farmaco_3_nome && (
                        <p className="text-sm text-muted-foreground">💊 {animatore.farmaco_3_nome}{animatore.farmaco_3_posologia ? ` — ${animatore.farmaco_3_posologia}` : ''}</p>
                      )}
                    </div>
                  </>
                )}

                <Separator />

                {/* Turni assegnati */}
                <div className="space-y-2">
                  <p className="text-sm font-medium flex items-center gap-1"><GraduationCap className="h-4 w-4" /> Turni assegnati ({CURRENT_YEAR})</p>
                  {assignedTurni.length === 0 && <p className="text-sm text-muted-foreground">Nessun turno assegnato</p>}
                  {assignedTurni.map((t) => (
                    <div key={t.id} className="flex items-center justify-between bg-primary/10 rounded-lg p-2">
                      <span className="text-sm font-semibold">{t.turno}</span>
                      {isAdmin && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-destructive/10" onClick={() => handleRemoveTurno(t.id)}>
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Assign new turno */}
                {isAdmin && availableTurni.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assegna a turno</p>
                    <Select onValueChange={handleAssignTurno}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Seleziona turno..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTurni.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Separator />

                {/* All turni (all years) */}
                {animatore.turni.filter((t) => t.anno !== CURRENT_YEAR).length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Turni anni precedenti</p>
                    {animatore.turni.filter((t) => t.anno !== CURRENT_YEAR).map((t) => (
                      <div key={t.id} className="text-sm bg-muted/30 rounded-lg p-2">
                        {t.anno}: {t.turno}
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                {isAdmin && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={startEdit}>
                      <Pencil className="h-3.5 w-3.5" /> Modifica
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={handleArchive}>
                      {animatore.archiviato ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                      {animatore.archiviato ? 'Ripristina' : 'Archivia'}
                    </Button>
                    <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => setShowDeleteConfirm(true)}>
                      <Trash2 className="h-3.5 w-3.5" /> Elimina
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              /* Edit mode */
              <div className="space-y-4">
                <div>
                  <Label>Nome completo</Label>
                  <Input value={editData.full_name} onChange={(e) => setEditData({ ...editData, full_name: e.target.value })} />
                </div>
                <div>
                  <Label>Ruolo</Label>
                  <Select value={editData.ruolo} onValueChange={(v) => setEditData({ ...editData, ruolo: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="animatore">Animatore</SelectItem>
                      <SelectItem value="cuoco">Cuoco</SelectItem>
                      <SelectItem value="responsabile_campo">Responsabile di campo</SelectItem>
                      <SelectItem value="responsabile_animatori">Responsabile animatori</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={editData.email} onChange={(e) => setEditData({ ...editData, email: e.target.value })} />
                </div>
                <div>
                  <Label>Telefono</Label>
                  <Input value={editData.telefono} onChange={(e) => setEditData({ ...editData, telefono: e.target.value })} />
                </div>
                <div>
                  <Label>Data di nascita</Label>
                  <Input type="date" value={editData.data_nascita} onChange={(e) => setEditData({ ...editData, data_nascita: e.target.value })} />
                </div>
                <div>
                  <Label>Note</Label>
                  <Textarea value={editData.note} onChange={(e) => setEditData({ ...editData, note: e.target.value })} rows={3} />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="gap-1.5" onClick={saveEdit} disabled={updateMutation.isPending}>
                    <Save className="h-3.5 w-3.5" /> Salva
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditing(false)}>
                    <X className="h-3.5 w-3.5" /> Annulla
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimina membro staff</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare <strong>{animatore.full_name}</strong>? Questa azione è irreversibile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Turno assignment confirmation */}
      <AlertDialog open={showAssignConfirm} onOpenChange={setShowAssignConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma assegnazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler assegnare <strong>{animatore.full_name}</strong> al turno <strong>{pendingTurno}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAssignTurno} disabled={assignTurnoMutation.isPending}>
              Conferma
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function AddAnimatoreDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [data, setData] = useState({ full_name: '', email: '', telefono: '', data_nascita: '', note: '', ruolo: 'animatore' });
  const addMutation = useAddAnimatore();

  const handleSubmit = () => {
    if (!data.full_name.trim()) { toast.error('Inserisci il nome'); return; }
    addMutation.mutate(data, {
      onSuccess: () => {
        toast.success('Membro staff aggiunto');
        setData({ full_name: '', email: '', telefono: '', data_nascita: '', note: '', ruolo: 'animatore' });
        onOpenChange(false);
      },
      onError: () => toast.error('Errore'),
    });
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh] min-h-0">
        <div className="overflow-y-auto px-5 pb-8">
          <DrawerHeader className="px-0 pb-4">
            <DrawerTitle className="text-xl text-left">Nuovo membro staff</DrawerTitle>
          </DrawerHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome completo *</Label>
              <Input value={data.full_name} onChange={(e) => setData({ ...data, full_name: e.target.value })} placeholder="Cognome Nome" />
            </div>
            <div>
              <Label>Ruolo</Label>
              <Select value={data.ruolo} onValueChange={(v) => setData({ ...data, ruolo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="animatore">Animatore</SelectItem>
                  <SelectItem value="cuoco">Cuoco</SelectItem>
                  <SelectItem value="responsabile_campo">Responsabile di campo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={data.email} onChange={(e) => setData({ ...data, email: e.target.value })} />
            </div>
            <div>
              <Label>Telefono</Label>
              <Input value={data.telefono} onChange={(e) => setData({ ...data, telefono: e.target.value })} />
            </div>
            <div>
              <Label>Data di nascita</Label>
              <Input type="date" value={data.data_nascita} onChange={(e) => setData({ ...data, data_nascita: e.target.value })} />
            </div>
            <div>
              <Label>Note</Label>
              <Textarea value={data.note} onChange={(e) => setData({ ...data, note: e.target.value })} rows={3} />
            </div>
            <Button className="w-full gap-1.5" onClick={handleSubmit} disabled={addMutation.isPending}>
              <Plus className="h-4 w-4" /> Aggiungi
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export default function AnagraficaAnimatori() {
  const { isAdmin } = useAuth();
  const { data: animatori = [], isLoading } = useAnimatori();
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [selectedAnimatore, setSelectedAnimatore] = useState<AnimatoreCompleto | null>(null);
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [roleFilter, setRoleFilter] = useState('all');
  const [turnoFilter, setTurnoFilter] = useState('all');

  const filtered = animatori
    .filter((a) => showArchived ? a.archiviato : !a.archiviato)
    .filter((a) => {
      if (roleFilter !== 'all' && a.ruolo !== roleFilter) return false;
      if (turnoFilter !== 'all') {
        const hasTurno = a.turni.some((t) => t.turno === turnoFilter && t.anno === CURRENT_YEAR);
        if (!hasTurno) return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return a.full_name.toLowerCase().includes(q) || (a.email || '').toLowerCase().includes(q);
    });

  return (
    <MainLayout title="Anagrafica Staff">
      <div className="space-y-6">
        {/* Toolbar */}
        <Card className="border-0 shadow-sm rounded-2xl bg-muted/30">
          <CardContent className="p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca per nome o email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-xl"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* Role filter */}
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[180px] rounded-xl">
                  <SelectValue placeholder="Filtro ruolo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i ruoli</SelectItem>
                  <SelectItem value="animatore">Animatore</SelectItem>
                  <SelectItem value="cuoco">Cuoco</SelectItem>
                  <SelectItem value="responsabile_campo">Resp. Campo</SelectItem>
                  <SelectItem value="responsabile_animatori">Resp. Animatori</SelectItem>
                </SelectContent>
              </Select>

              {/* Turno filter */}
              <Select value={turnoFilter} onValueChange={setTurnoFilter}>
                <SelectTrigger className="w-[180px] rounded-xl">
                  <SelectValue placeholder="Filtro turno" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i turni</SelectItem>
                  {TURNI_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2 ml-auto">
                <Switch checked={showArchived} onCheckedChange={setShowArchived} id="show-archived" />
                <Label htmlFor="show-archived" className="text-sm cursor-pointer">Archiviati</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Count + Add button */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{filtered.length} risultat{filtered.length === 1 ? 'o' : 'i'}</p>
          {isAdmin && (
            <Button size="sm" className="gap-1.5 rounded-xl" onClick={() => setShowAddDrawer(true)}>
              <Plus className="h-4 w-4" /> Nuovo
            </Button>
          )}
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Nessun membro staff trovato.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((a) => (
              <AnimatoreCard key={a.id} animatore={a} onClick={() => setSelectedAnimatore(a)} />
            ))}
          </div>
        )}
      </div>

      {selectedAnimatore && (
        <AnimatoreDrawer
          animatore={selectedAnimatore}
          open={!!selectedAnimatore}
          onOpenChange={(v) => { if (!v) setSelectedAnimatore(null); }}
        />
      )}

      <AddAnimatoreDrawer open={showAddDrawer} onOpenChange={setShowAddDrawer} />
    </MainLayout>
  );
}
