import { useParams } from 'react-router-dom';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useMyTurnoPermissions, TURNI } from '@/hooks/useTurnoPermissions';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Loader2, ShieldAlert, Phone, Camera, AlertTriangle, Check, Search, MapPin, Mail, CalendarDays, Home, Pen, Filter, Users, ClipboardCheck, Download, LayoutGrid, X, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { it as itLocale } from 'date-fns/locale';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// ─── Helpers ───────────────────────────────────────────

function FarmacoLine({ nome, posologia }: { nome?: string | null; posologia?: string | null }) {
  if (!nome) return null;
  return (
    <p className="text-sm text-muted-foreground">
      💊 {nome}{posologia ? ` — ${posologia}` : ''}
    </p>
  );
}

// ─── Tent layout config ────────────────────────────────
// Each row: { row number, count of tents, grid columns where they start }
const TENT_ROWS: { riga: number; count: number; colStart: number }[] = [
  { riga: 1, count: 2, colStart: 3 }, // top right
  { riga: 2, count: 4, colStart: 1 },
  { riga: 3, count: 4, colStart: 1 },
  { riga: 4, count: 4, colStart: 1 },
  { riga: 5, count: 2, colStart: 1 }, // bottom left
];

type TendaData = {
  id?: string;
  turno: string;
  riga: number;
  numero: number;
  colore: string;
  assegnati: string[];
};

const COLORE_STYLES: Record<string, { border: string; bg: string; text: string; label: string }> = {
  blu: { border: 'border-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30', text: 'text-blue-700 dark:text-blue-300', label: 'Maschile' },
  rosa: { border: 'border-pink-400', bg: 'bg-pink-50 dark:bg-pink-950/30', text: 'text-pink-700 dark:text-pink-300', label: 'Femminile' },
  grigio: { border: 'border-muted-foreground/40', bg: 'bg-muted/30', text: 'text-muted-foreground', label: 'Animatori' },
};

// ─── Tent card ─────────────────────────────────────────

function TendaCard({ tenda, onClick }: { tenda: TendaData; onClick: () => void }) {
  const style = COLORE_STYLES[tenda.colore] || COLORE_STYLES.grigio;
  return (
    <Card
      className={`cursor-pointer transition-all duration-200 hover:scale-[1.03] active:scale-95 rounded-2xl border-2 ${style.border} ${style.bg} [-webkit-tap-highlight-color:transparent]`}
      onClick={onClick}
    >
      <CardContent className="p-3 min-h-[100px] flex flex-col">
        <div className="flex items-center justify-between mb-1.5">
          <span className={`text-lg font-bold ${style.text}`}>{tenda.numero}</span>
          <Badge variant="secondary" className="text-[10px] rounded-full px-1.5 py-0.5">
            {tenda.assegnati.length}/4
          </Badge>
        </div>
        <div className="flex-1 space-y-0.5">
          {tenda.assegnati.map((nome, i) => (
            <p key={i} className="text-xs truncate text-foreground">{nome}</p>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Tent assignment drawer ────────────────────────────

function TendaDrawer({
  tenda,
  open,
  onOpenChange,
  availableRagazzi,
  onSave,
  saving,
}: {
  tenda: TendaData | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  availableRagazzi: string[];
  onSave: (tenda: TendaData) => void;
  saving: boolean;
}) {
  const [colore, setColore] = useState('grigio');
  const [assegnati, setAssegnati] = useState<string[]>([]);

  useEffect(() => {
    if (tenda) {
      setColore(tenda.colore);
      setAssegnati([...tenda.assegnati]);
    }
  }, [tenda]);

  if (!tenda) return null;

  const handleAdd = (nome: string) => {
    if (assegnati.length >= 4) return;
    const updated = [...assegnati, nome];
    setAssegnati(updated);
    onSave({ ...tenda, colore, assegnati: updated });
  };

  const handleRemove = (idx: number) => {
    const updated = assegnati.filter((_, i) => i !== idx);
    setAssegnati(updated);
    onSave({ ...tenda, colore, assegnati: updated });
  };

  const handleColorChange = (c: string) => {
    setColore(c);
    onSave({ ...tenda, colore: c, assegnati });
  };

  const style = COLORE_STYLES[colore] || COLORE_STYLES.grigio;
  // Filter available: not in current tent's assegnati
  const selectable = availableRagazzi.filter(n => !assegnati.includes(n));

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <div className="overflow-y-auto px-5 pb-8">
          <DrawerHeader className="px-0 pb-4">
            <DrawerTitle className="text-xl text-left">
              Riga {tenda.riga} — Tenda {tenda.numero}
            </DrawerTitle>
          </DrawerHeader>

          {/* Color selector */}
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Colore tenda</p>
            <div className="flex gap-2">
              {Object.entries(COLORE_STYLES).map(([key, s]) => (
                <Button
                  key={key}
                  variant={colore === key ? 'default' : 'outline'}
                  size="sm"
                  className={`rounded-full gap-1.5 ${colore === key ? '' : `${s.border} ${s.text}`}`}
                  onClick={() => handleColorChange(key)}
                >
                  <div className={`w-3 h-3 rounded-full ${key === 'blu' ? 'bg-blue-500' : key === 'rosa' ? 'bg-pink-400' : 'bg-gray-400'}`} />
                  {s.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Current occupants */}
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Occupanti ({assegnati.length}/4)
            </p>
            {assegnati.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Nessun ragazzo assegnato</p>
            ) : (
              <div className="space-y-2">
                {assegnati.map((nome, idx) => (
                  <div key={idx} className={`flex items-center justify-between rounded-xl px-3 py-2.5 ${style.bg} border ${style.border}`}>
                    <span className="text-sm font-medium text-foreground">{nome}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-full hover:bg-destructive/10"
                      onClick={() => handleRemove(idx)}
                      disabled={saving}
                    >
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add ragazzo */}
          {assegnati.length < 4 && selectable.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Aggiungi ragazzo/a</p>
              <Select onValueChange={handleAdd}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Seleziona un ragazzo/a..." />
                </SelectTrigger>
                <SelectContent>
                  {selectable.map(nome => (
                    <SelectItem key={nome} value={nome}>{nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {assegnati.length >= 4 && (
            <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
              ⚠️ Tenda piena (max 4 posti)
            </p>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// ─── Detail card (existing) ────────────────────────────

function RagazzoCompactCard({ r, onClick }: { r: any; onClick: () => void }) {
  const initials = `${(r.ragazzo_nome?.[0] || '').toUpperCase()}${(r.ragazzo_cognome?.[0] || '').toUpperCase()}`;
  const phoneNumber = r.recapiti_telefonici?.replace(/[^0-9+]/g, '') || '';

  return (
    <Card
      className="border-0 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer hover:scale-[1.02] overflow-hidden bg-card rounded-2xl [-webkit-tap-highlight-color:transparent]"
      onClick={onClick}
    >
      <CardContent className="p-0">
        <div className={`px-4 py-3.5 flex items-center gap-3 ${r.ha_allergie ? 'bg-gradient-to-r from-red-500/10 to-orange-500/10' : 'bg-gradient-to-r from-primary/10 to-blue-500/10'}`}>
          <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-md ${r.ha_allergie ? 'bg-gradient-to-br from-red-500 to-orange-500' : 'bg-gradient-to-br from-primary to-blue-500'}`}>
            {initials}
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-[15px] leading-tight truncate text-foreground">
              {r.ragazzo_nome} {r.ragazzo_cognome}
            </h4>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {r.genitore_nome} {r.genitore_cognome}
            </p>
          </div>
        </div>
        <div className="px-4 py-3.5 space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Phone className="h-3.5 w-3.5 text-primary" />
            </div>
            <a
              href={`tel:${phoneNumber}`}
              onClick={(e) => e.stopPropagation()}
              className="font-medium text-primary hover:underline active:opacity-70 transition-opacity"
            >
              {r.recapiti_telefonici}
            </a>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {r.ha_allergie ? (
              <Badge className="text-[11px] gap-1 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-0 rounded-full px-2.5 py-1 pointer-events-none">
                <AlertTriangle className="h-3 w-3" /> Allergie
              </Badge>
            ) : (
              <Badge className="text-[11px] gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-0 rounded-full px-2.5 py-1 pointer-events-none">
                <Check className="h-3 w-3" /> OK
              </Badge>
            )}
            <Badge className={`text-[11px] gap-1 border-0 rounded-full px-2.5 py-1 pointer-events-none ${r.liberatoria_foto ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' : 'bg-muted text-muted-foreground'}`}>
              <Camera className="h-3 w-3" /> {r.liberatoria_foto ? 'Sì' : 'No'}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Detail drawer (existing) ──────────────────────────

function InfoRow({ icon, label, value, isLink }: { icon: React.ReactNode; label: string; value: string; isLink?: boolean }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        {isLink ? (
          <a href={`tel:${value.replace(/[^0-9+]/g, '')}`} className="text-sm font-medium text-primary">
            {value}
          </a>
        ) : (
          <p className="text-sm font-medium text-foreground">{value}</p>
        )}
      </div>
    </div>
  );
}

function RagazzoDetailDrawer({ r, open, onOpenChange }: { r: any; open: boolean; onOpenChange: (v: boolean) => void }) {
  if (!r) return null;
  const initials = `${(r.ragazzo_nome?.[0] || '').toUpperCase()}${(r.ragazzo_cognome?.[0] || '').toUpperCase()}`;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh]">
        <div className="overflow-y-auto px-5 pb-8">
          <DrawerHeader className="px-0 pb-4">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold text-white shadow-lg shrink-0 ${r.ha_allergie ? 'bg-gradient-to-br from-red-500 to-orange-500' : 'bg-gradient-to-br from-primary to-blue-500'}`}>
                {initials}
              </div>
              <div>
                <DrawerTitle className="text-xl text-left">{r.ragazzo_nome} {r.ragazzo_cognome}</DrawerTitle>
                <p className="text-sm text-muted-foreground mt-0.5">{r.genitore_qualita} — {r.genitore_nome} {r.genitore_cognome}</p>
              </div>
            </div>
          </DrawerHeader>
          <div className="flex items-center gap-2 flex-wrap mb-5">
            {r.ha_allergie ? (
              <Badge className="gap-1 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-0 rounded-full px-3 py-1.5 text-xs pointer-events-none">
                <AlertTriangle className="h-3.5 w-3.5" /> Allergie/Patologie
              </Badge>
            ) : (
              <Badge className="gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-0 rounded-full px-3 py-1.5 text-xs pointer-events-none">
                <Check className="h-3.5 w-3.5" /> Nessuna allergia
              </Badge>
            )}
            <Badge className={`gap-1 border-0 rounded-full px-3 py-1.5 text-xs pointer-events-none ${r.liberatoria_foto ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' : 'bg-muted text-muted-foreground'}`}>
              <Camera className="h-3.5 w-3.5" /> Foto {r.liberatoria_foto ? 'Sì' : 'No'}
            </Badge>
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Dati Ragazzo/a</h4>
            <div className="bg-muted/30 rounded-2xl px-3 divide-y divide-border">
              <InfoRow icon={<CalendarDays className="h-4 w-4 text-muted-foreground" />} label="Data di nascita" value={format(new Date(r.ragazzo_data_nascita), 'dd/MM/yyyy')} />
              <InfoRow icon={<MapPin className="h-4 w-4 text-muted-foreground" />} label="Luogo di nascita" value={r.ragazzo_luogo_nascita} />
              <InfoRow icon={<Home className="h-4 w-4 text-muted-foreground" />} label="Residente" value={`${r.ragazzo_residente} — ${r.ragazzo_indirizzo}`} />
            </div>
          </div>
          <div className="space-y-1 mt-5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Contatti</h4>
            <div className="bg-muted/30 rounded-2xl px-3 divide-y divide-border">
              <InfoRow icon={<Phone className="h-4 w-4 text-muted-foreground" />} label="Telefono" value={r.recapiti_telefonici} isLink />
              <InfoRow icon={<Mail className="h-4 w-4 text-muted-foreground" />} label="Email" value={r.email} />
            </div>
          </div>
          {r.ha_allergie && (
            <div className="space-y-1 mt-5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Allergie e Patologie</h4>
              <div className="bg-red-50 dark:bg-red-950/20 rounded-2xl px-4 py-3 space-y-2">
                {r.allergie_dettaglio && <p className="text-sm"><span className="font-medium">Allergie:</span> {r.allergie_dettaglio}</p>}
                {r.patologie_dettaglio && <p className="text-sm"><span className="font-medium">Patologie:</span> {r.patologie_dettaglio}</p>}
                <FarmacoLine nome={r.farmaco_1_nome} posologia={r.farmaco_1_posologia} />
                <FarmacoLine nome={r.farmaco_2_nome} posologia={r.farmaco_2_posologia} />
                <FarmacoLine nome={r.farmaco_3_nome} posologia={r.farmaco_3_posologia} />
              </div>
            </div>
          )}
          <div className="space-y-1 mt-5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Altro</h4>
            <div className="bg-muted/30 rounded-2xl px-3 divide-y divide-border">
              <InfoRow icon={<Pen className="h-4 w-4 text-muted-foreground" />} label="Firma" value={`${r.firma_nome} — ${format(new Date(r.firma_data), 'dd/MM/yyyy')}`} />
              {r.secondo_figlio && (
                <InfoRow icon={<Check className="h-4 w-4 text-muted-foreground" />} label="Secondo figlio" value={r.secondo_figlio} />
              )}
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// ─── Appello Card ──────────────────────────────────────

function AppelloCard({ r, isPresent, onToggle }: { r: any; isPresent: boolean; onToggle: () => void }) {
  return (
    <Card
      className={`cursor-pointer transition-all duration-200 active:scale-95 rounded-2xl border-2 [-webkit-tap-highlight-color:transparent] ${
        isPresent
          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 shadow-emerald-200/50 dark:shadow-emerald-900/30 shadow-md'
          : 'border-red-400 bg-red-50 dark:bg-red-950/30 shadow-red-200/50 dark:shadow-red-900/30 shadow-md'
      }`}
      onClick={onToggle}
    >
      <CardContent className="p-5 flex items-center justify-center min-h-[80px]">
        <p className={`text-lg font-bold text-center ${isPresent ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
          {r.ragazzo_nome} {r.ragazzo_cognome}
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ────────────────────────────────────

type TabType = 'dettagli' | 'appello' | 'tende' | 'download-lista';

export default function TurnoPage() {
  const { turnoSlug } = useParams<{ turnoSlug: string }>();
  const { user, isAdmin } = useAuth();
  const { data: myPerms = [], isLoading: permsLoading } = useMyTurnoPermissions();
  const queryClient = useQueryClient();
  const [selectedRagazzo, setSelectedRagazzo] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAllergie, setFilterAllergie] = useState<boolean | null>(null);
  const [filterFoto, setFilterFoto] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('dettagli');
  const [presentSet, setPresentSet] = useState<Set<string>>(new Set());
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedTenda, setSelectedTenda] = useState<TendaData | null>(null);
  const [tendaSaving, setTendaSaving] = useState(false);

  const turnoInfo = TURNI.find(t => t.slug === turnoSlug);
  const turnoValue = turnoInfo?.value ?? '';
  const turnoLabel = turnoInfo?.label ?? '';
  const hasAccess = isAdmin || myPerms.some(p => p.turno === turnoValue);

  // Load iscrizioni
  const { data: iscrizioni = [], isLoading: iscrizioniLoading } = useQuery({
    queryKey: ['turno-iscrizioni', turnoValue],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('iscrizioni')
        .select('*')
        .eq('turno', turnoValue)
        .order('ragazzo_cognome', { ascending: true })
        .order('ragazzo_nome', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user && hasAccess && !!turnoValue,
  });

  // Load tende
  const { data: tendeData = [], isLoading: tendeLoading } = useQuery({
    queryKey: ['tende', turnoValue],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tende' as any)
        .select('*')
        .eq('turno', turnoValue);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!user && hasAccess && !!turnoValue,
  });

  // Build tende map: key = "riga-numero"
  const tendeMap = useMemo(() => {
    const map = new Map<string, TendaData>();
    for (const t of tendeData) {
      map.set(`${t.riga}-${t.numero}`, {
        id: t.id,
        turno: t.turno,
        riga: t.riga,
        numero: t.numero,
        colore: t.colore,
        assegnati: Array.isArray(t.assegnati) ? t.assegnati : [],
      });
    }
    return map;
  }, [tendeData]);

  // All assigned names across all tents
  const allAssigned = useMemo(() => {
    const set = new Set<string>();
    tendeMap.forEach(t => t.assegnati.forEach(n => set.add(n)));
    return set;
  }, [tendeMap]);

  // Available ragazzi names (from iscrizioni, not yet assigned)
  const availableRagazzi = useMemo(() => {
    return iscrizioni
      .map((r: any) => `${r.ragazzo_nome} ${r.ragazzo_cognome}`)
      .filter(n => !allAssigned.has(n))
      .sort((a, b) => a.localeCompare(b, 'it'));
  }, [iscrizioni, allAssigned]);

  // Get tenda data for a specific row/number (or default)
  const getTenda = useCallback((riga: number, numero: number): TendaData => {
    return tendeMap.get(`${riga}-${numero}`) || {
      turno: turnoValue,
      riga,
      numero,
      colore: 'grigio',
      assegnati: [],
    };
  }, [tendeMap, turnoValue]);

  // Upsert tenda
  const handleSaveTenda = async (tenda: TendaData) => {
    setTendaSaving(true);
    try {
      if (tenda.id) {
        const { error } = await supabase
          .from('tende' as any)
          .update({ colore: tenda.colore, assegnati: tenda.assegnati, updated_at: new Date().toISOString() } as any)
          .eq('id', tenda.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('tende' as any)
          .insert({
            turno: tenda.turno,
            riga: tenda.riga,
            numero: tenda.numero,
            colore: tenda.colore,
            assegnati: tenda.assegnati,
          } as any);
        if (error) throw error;
      }
      queryClient.invalidateQueries({ queryKey: ['tende', turnoValue] });
    } catch (e: any) {
      toast({ title: 'Errore', description: e.message, variant: 'destructive' });
    } finally {
      setTendaSaving(false);
    }
  };

  // Load current user profile name
  const { data: profile } = useQuery({
    queryKey: ['my-profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('full_name').eq('id', user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  // Load appello logs
  const { data: appelloLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['appello-logs', turnoValue],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appello_logs' as any)
        .select('*')
        .eq('turno', turnoValue)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user && hasAccess && !!turnoValue,
  });

  // Filtered iscrizioni (for dettagli tab)
  const filteredIscrizioni = useMemo(() => {
    let result = [...iscrizioni];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((r: any) =>
        `${r.ragazzo_nome} ${r.ragazzo_cognome}`.toLowerCase().includes(q)
      );
    }
    if (filterAllergie !== null) {
      result = result.filter((r: any) => r.ha_allergie === filterAllergie);
    }
    if (filterFoto !== null) {
      result = result.filter((r: any) => r.liberatoria_foto === filterFoto);
    }
    result.sort((a: any, b: any) => {
      const cmp = (a.ragazzo_nome || '').localeCompare(b.ragazzo_nome || '', 'it');
      return cmp !== 0 ? cmp : (a.ragazzo_cognome || '').localeCompare(b.ragazzo_cognome || '', 'it');
    });
    return result;
  }, [iscrizioni, searchQuery, filterAllergie, filterFoto]);

  // Sorted iscrizioni for appello (by name)
  const sortedIscrizioni = useMemo(() => {
    return [...iscrizioni].sort((a: any, b: any) => {
      const cmp = (a.ragazzo_nome || '').localeCompare(b.ragazzo_nome || '', 'it');
      return cmp !== 0 ? cmp : (a.ragazzo_cognome || '').localeCompare(b.ragazzo_cognome || '', 'it');
    });
  }, [iscrizioni]);

  // Realtime iscrizioni
  useEffect(() => {
    if (!user || !turnoValue) return;
    const channel = supabase
      .channel(`iscrizioni-turno-${turnoSlug}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'iscrizioni' }, () => {
        queryClient.invalidateQueries({ queryKey: ['turno-iscrizioni', turnoValue] });
        queryClient.invalidateQueries({ queryKey: ['turno-counts'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, turnoValue, turnoSlug, queryClient]);

  // Realtime appello logs
  useEffect(() => {
    if (!user || !turnoValue) return;
    const channel = supabase
      .channel(`appello-logs-${turnoSlug}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'appello_logs' }, () => {
        queryClient.invalidateQueries({ queryKey: ['appello-logs', turnoValue] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, turnoValue, turnoSlug, queryClient]);

  // Realtime tende
  useEffect(() => {
    if (!user || !turnoValue) return;
    const channel = supabase
      .channel(`tende-${turnoSlug}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tende' }, () => {
        queryClient.invalidateQueries({ queryKey: ['tende', turnoValue] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, turnoValue, turnoSlug, queryClient]);

  // Toggle presence
  const togglePresence = useCallback((id: string) => {
    setPresentSet(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Conclude appello
  const handleConcludiAppello = async () => {
    if (!user || !profile) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('appello_logs' as any).insert({
        turno: turnoValue,
        effettuato_da: user.id,
        effettuato_da_nome: profile.full_name,
        presenti: presentSet.size,
        totale: iscrizioni.length,
      });
      if (error) throw error;
      setPresentSet(new Set());
      setShowConfirm(false);
      toast({ title: 'Appello registrato', description: `Presenti ${presentSet.size}/${iscrizioni.length}` });
      queryClient.invalidateQueries({ queryKey: ['appello-logs', turnoValue] });
    } catch (e: any) {
      toast({ title: 'Errore', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Download PDF
  const handleDownloadPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const { autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Lista ${turnoLabel}`, 14, 20);

    const rows = sortedIscrizioni.map((r: any) => [
      `${r.ragazzo_nome} ${r.ragazzo_cognome}`,
      `${r.genitore_nome} ${r.genitore_cognome}`,
      r.recapiti_telefonici || '',
    ]);

    autoTable(doc, {
      startY: 30,
      head: [['Nome e Cognome Ragazzo', 'Nome e Cognome Genitore', 'Telefono']],
      body: rows,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`lista-${turnoSlug}.pdf`);
  };

  // Tab click handler for download
  const handleTabClick = (tab: TabType) => {
    if (tab === 'download-lista') {
      handleDownloadPDF();
      return;
    }
    setActiveTab(tab);
  };

  // ─── Render guards ─────────

  if (!turnoInfo) {
    return (
      <MainLayout title="Turno non trovato">
        <p className="text-muted-foreground">Turno non valido.</p>
      </MainLayout>
    );
  }

  if (permsLoading) {
    return (
      <MainLayout title={turnoLabel}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!hasAccess) {
    return (
      <MainLayout title={turnoLabel}>
        <Card>
          <CardContent className="py-12 text-center">
            <ShieldAlert className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Non hai i permessi per visualizzare questo turno.</p>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={turnoLabel}>
      <div className="space-y-6">
        {/* Tab pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={activeTab === 'dettagli' ? 'default' : 'outline'}
            size="sm"
            className="rounded-full gap-1.5"
            onClick={() => handleTabClick('dettagli')}
          >
            <Users className="h-4 w-4" /> Dettagli ragazzi
          </Button>
          <Button
            variant={activeTab === 'appello' ? 'default' : 'outline'}
            size="sm"
            className="rounded-full gap-1.5"
            onClick={() => handleTabClick('appello')}
          >
            <ClipboardCheck className="h-4 w-4" /> Appello
          </Button>
          <Button
            variant={activeTab === 'tende' ? 'default' : 'outline'}
            size="sm"
            className="rounded-full gap-1.5"
            onClick={() => handleTabClick('tende')}
          >
            <LayoutGrid className="h-4 w-4" /> Tende
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full gap-1.5"
            onClick={() => handleTabClick('download-lista')}
          >
            <Download className="h-4 w-4" /> Download lista
          </Button>
        </div>

        {/* ─── Tab: Dettagli ragazzi ─── */}
        {activeTab === 'dettagli' && (
          <>
            <Card className="border-0 shadow-sm rounded-2xl bg-muted/30">
              <CardContent className="p-4 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cerca ragazzo/a..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 rounded-xl bg-background"
                  />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Button variant={filterAllergie === true ? 'default' : 'outline'} size="sm" className="rounded-full text-xs h-7 gap-1" onClick={() => setFilterAllergie(filterAllergie === true ? null : true)}>
                    <AlertTriangle className="h-3 w-3" /> Con allergie
                  </Button>
                  <Button variant={filterAllergie === false ? 'default' : 'outline'} size="sm" className="rounded-full text-xs h-7 gap-1" onClick={() => setFilterAllergie(filterAllergie === false ? null : false)}>
                    <Check className="h-3 w-3" /> Senza allergie
                  </Button>
                  <Button variant={filterFoto === true ? 'default' : 'outline'} size="sm" className="rounded-full text-xs h-7 gap-1" onClick={() => setFilterFoto(filterFoto === true ? null : true)}>
                    <Camera className="h-3 w-3" /> Foto Sì
                  </Button>
                  <Button variant={filterFoto === false ? 'default' : 'outline'} size="sm" className="rounded-full text-xs h-7 gap-1" onClick={() => setFilterFoto(filterFoto === false ? null : false)}>
                    <Camera className="h-3 w-3" /> Foto No
                  </Button>
                </div>
              </CardContent>
            </Card>

            {iscrizioniLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredIscrizioni.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">
                    {searchQuery ? 'Nessun risultato trovato.' : 'Nessun ragazzo iscritto per questo turno.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredIscrizioni.map((r: any) => (
                  <RagazzoCompactCard key={r.id} r={r} onClick={() => setSelectedRagazzo(r)} />
                ))}
              </div>
            )}

            <RagazzoDetailDrawer
              r={selectedRagazzo}
              open={!!selectedRagazzo}
              onOpenChange={(v) => { if (!v) setSelectedRagazzo(null); }}
            />
          </>
        )}

        {/* ─── Tab: Tende ─── */}
        {activeTab === 'tende' && (
          <>
            {tendeLoading || iscrizioniLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Legend */}
                <div className="flex items-center gap-4 flex-wrap">
                  {Object.entries(COLORE_STYLES).map(([key, s]) => (
                    <div key={key} className="flex items-center gap-1.5 text-xs">
                      <div className={`w-3 h-3 rounded-full ${key === 'blu' ? 'bg-blue-500' : key === 'rosa' ? 'bg-pink-400' : 'bg-gray-400'}`} />
                      <span className="text-muted-foreground">{s.label}</span>
                    </div>
                  ))}
                </div>

                {/* Tent grid */}
                <div className="space-y-3">
                  {TENT_ROWS.map(({ riga, count, colStart }) => (
                    <div key={riga} className="grid grid-cols-4 gap-3">
                      {/* Empty cells before */}
                      {Array.from({ length: colStart - 1 }).map((_, i) => (
                        <div key={`empty-before-${i}`} />
                      ))}
                      {/* Tents: numbered right-to-left, so tent "count" is leftmost, "1" is rightmost */}
                      {Array.from({ length: count }).map((_, i) => {
                        const numero = count - i; // right-to-left: first cell = highest number
                        const tenda = getTenda(riga, numero);
                        return (
                          <TendaCard
                            key={`${riga}-${numero}`}
                            tenda={tenda}
                            onClick={() => setSelectedTenda(tenda)}
                          />
                        );
                      })}
                      {/* Empty cells after */}
                      {Array.from({ length: 4 - (colStart - 1) - count }).map((_, i) => (
                        <div key={`empty-after-${i}`} />
                      ))}
                    </div>
                  ))}
                </div>

                {/* Stats */}
                <Card className="border-0 shadow-sm rounded-2xl bg-muted/30">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Ragazzi assegnati</span>
                      <Badge variant="secondary" className="rounded-full">
                        {allAssigned.size}/{iscrizioni.length}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <TendaDrawer
              tenda={selectedTenda}
              open={!!selectedTenda}
              onOpenChange={(v) => { if (!v) setSelectedTenda(null); }}
              availableRagazzi={availableRagazzi}
              onSave={handleSaveTenda}
              saving={tendaSaving}
            />
          </>
        )}

        {/* ─── Tab: Appello ─── */}
        {activeTab === 'appello' && (
          <>
            {iscrizioniLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : sortedIscrizioni.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">Nessun ragazzo iscritto per questo turno.</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Count indicator */}
                <div className="text-center">
                  <Badge variant="secondary" className="text-sm px-4 py-1.5 rounded-full">
                    Presenti {presentSet.size}/{sortedIscrizioni.length}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {sortedIscrizioni.map((r: any) => (
                    <AppelloCard
                      key={r.id}
                      r={r}
                      isPresent={presentSet.has(r.id)}
                      onToggle={() => togglePresence(r.id)}
                    />
                  ))}
                </div>

                <div className="flex justify-center pt-2">
                  <Button
                    size="lg"
                    className="rounded-full gap-2 px-8"
                    onClick={() => setShowConfirm(true)}
                  >
                    <ClipboardCheck className="h-5 w-5" /> Concludi appello
                  </Button>
                </div>
              </>
            )}

            {/* Appello logs */}
            <div className="space-y-3 pt-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Storico appelli</h3>
              {logsLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (appelloLogs as any[]).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nessun appello registrato.</p>
              ) : (
                <div className="space-y-2">
                  {(appelloLogs as any[]).map((log: any) => (
                    <Card key={log.id} className="border-0 shadow-sm rounded-xl bg-muted/30">
                      <CardContent className="p-3 flex items-center justify-between gap-2 flex-wrap">
                        <div className="text-sm">
                          <span className="font-medium">{log.effettuato_da_nome}</span>
                          <span className="text-muted-foreground ml-2">
                            {format(new Date(log.created_at), 'dd-MM-yyyy, HH.mm', { locale: itLocale })}
                          </span>
                        </div>
                        <Badge variant="secondary" className="rounded-full text-xs">
                          Presenti {log.presenti}/{log.totale}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Confirm dialog */}
            <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Conferma appello</AlertDialogTitle>
                  <AlertDialogDescription>
                    Stai per registrare l'appello con <strong>Presenti {presentSet.size}/{sortedIscrizioni.length}</strong>. Vuoi procedere?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={saving}>Annulla</AlertDialogCancel>
                  <AlertDialogAction onClick={handleConcludiAppello} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Conferma'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>
    </MainLayout>
  );
}
