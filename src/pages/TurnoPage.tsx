import { useParams } from 'react-router-dom';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useMyTurnoPermissions, TURNI } from '@/hooks/useTurnoPermissions';
import { useAnimatoriByTurno, AnimatoreCompleto, RUOLO_LABELS, RUOLO_COLORS, RUOLO_ORDER } from '@/hooks/useAnimatori';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Loader2, ShieldAlert, Phone, Camera, AlertTriangle, Check, Search, MapPin, Mail, CalendarDays, Home, Pen, Filter, Users, ClipboardCheck, Download, LayoutGrid, X, UserPlus, ChevronDown, CalendarHeart, Copy, Link as LinkIcon, Euro, Pencil, StickyNote, UserCheck, CircleDollarSign, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { it as itLocale } from 'date-fns/locale';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

// ─── Helpers ───────────────────────────────────────────

const toTitleCase = (s?: string | null) =>
  (s || '')
    .toLowerCase()
    .replace(/(^|[\s'’\-])(\p{L})/gu, (_, sep, ch) => sep + ch.toUpperCase());

// Format a birth date as dd/MM/yyyy. Accepts ISO (yyyy-MM-dd) or other parseable
// values; falls back to the original text if it isn't a valid date.
const formatDob = (v?: string | null): string => {
  if (!v) return '';
  const s = String(v).trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
  const d = new Date(s);
  if (!isNaN(d.getTime())) return format(d, 'dd/MM/yyyy');
  return s;
};

// Fields staff accounts are allowed to download
const ALLOWED_RAGAZZI_STAFF = ['cognome', 'nome', 'data_nascita'];
const ALLOWED_STAFF_STAFF = ['nome_cognome', 'data_nascita'];

const normalizeDuplicateName = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'it'))
    .join(' ');

function DuplicateBadge({ className }: { className?: string }) {
  return (
    <Badge className={`gap-1 bg-destructive text-destructive-foreground border-0 rounded-full px-2.5 py-1 text-[11px] pointer-events-none ${className ?? ''}`}>
      <AlertTriangle className="h-3 w-3" /> DOPPIONE
    </Badge>
  );
}

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
  blu: { border: 'border-blue-500', bg: 'bg-blue-100 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-300', label: 'Maschile' },
  rosa: { border: 'border-pink-500', bg: 'bg-pink-100 dark:bg-pink-950/40', text: 'text-pink-700 dark:text-pink-300', label: 'Femminile' },
  verde: { border: 'border-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', label: 'Animatori' },
  grigio: { border: 'border-slate-400', bg: 'bg-slate-100 dark:bg-slate-800/40', text: 'text-slate-500 dark:text-slate-400', label: 'Nessuno' },
};

// Colore -> classi SVG (riempimenti vivaci)
const TENDA_SVG_STYLES: Record<string, { fill: string; stroke: string; text: string; flag: string; dot: string }> = {
  blu: { fill: 'fill-blue-200 dark:fill-blue-900/60', stroke: 'stroke-blue-600', text: 'fill-blue-800 dark:fill-blue-200', flag: 'fill-blue-600', dot: 'bg-blue-600' },
  rosa: { fill: 'fill-pink-200 dark:fill-pink-900/60', stroke: 'stroke-pink-600', text: 'fill-pink-800 dark:fill-pink-200', flag: 'fill-pink-600', dot: 'bg-pink-600' },
  verde: { fill: 'fill-emerald-200 dark:fill-emerald-900/60', stroke: 'stroke-emerald-600', text: 'fill-emerald-800 dark:fill-emerald-200', flag: 'fill-emerald-600', dot: 'bg-emerald-600' },
  grigio: { fill: 'fill-slate-200 dark:fill-slate-800/60', stroke: 'stroke-slate-400', text: 'fill-slate-600 dark:fill-slate-300', flag: 'fill-slate-400', dot: 'bg-slate-400' },
};

// ─── Tent card ─────────────────────────────────────────

function TendaCard({ tenda, onClick }: { tenda: TendaData; onClick: () => void }) {
  const sty = TENDA_SVG_STYLES[tenda.colore] || TENDA_SVG_STYLES.grigio;
  const n = tenda.assegnati.length;

  return (
    <div
      className="cursor-pointer transition-all duration-200 hover:scale-[1.03] active:scale-95 [-webkit-tap-highlight-color:transparent]"
      onClick={onClick}
    >
      <svg viewBox="0 0 120 100" className={`w-full h-auto ${sty.fill} ${sty.stroke}`} preserveAspectRatio="xMidYMid meet">
        {/* Tent body */}
        <path d="M60 8 L110 50 L110 95 L10 95 L10 50 Z" strokeWidth="2.5" strokeLinejoin="round" />
        {/* Flag */}
        <path d="M60 8 L60 2" strokeWidth="2" fill="none" />
        <path d="M60 2 L70 5 L60 8" className={sty.flag} stroke="none" />

        {/* Number + count */}
        <text x="55" y="52" textAnchor="middle" className={sty.text} fontSize="18" fontWeight="bold">{tenda.numero}</text>
        <text x="60" y="72" textAnchor="middle" className="fill-muted-foreground" fontSize="11">({n}/4)</text>
      </svg>
    </div>
  );
}

// ─── Tent assignment drawer ────────────────────────────

function TendaDrawer({
  tenda,
  open,
  onOpenChange,
  availableRagazzi,
  availableStaff,
  onSave,
  saving,
}: {
  tenda: TendaData | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  availableRagazzi: string[];
  availableStaff: { id: string; full_name: string; cognome: string | null }[];
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

  const isStaffTent = colore === 'verde';

  const handleAdd = (nome: string) => {
    if (assegnati.length >= 4) return;
    const updated = [...assegnati, nome];
    setAssegnati(updated);
    onSave({ ...tenda, colore, assegnati: updated });
  };

  const handleAddStaff = (staffName: string) => {
    if (assegnati.length >= 4) return;
    const prefixed = `§${staffName}`;
    const updated = [...assegnati, prefixed];
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
    // "Nessuno" (grigio): tenda non assegnata -> svuota gli occupanti
    if (c === 'grigio') {
      setAssegnati([]);
      onSave({ ...tenda, colore: c, assegnati: [] });
      return;
    }
    onSave({ ...tenda, colore: c, assegnati });
  };

  const style = COLORE_STYLES[colore] || COLORE_STYLES.grigio;

  // For ragazzi tents: filter available ragazzi not already assigned
  const selectableRagazzi = availableRagazzi.filter(n => !assegnati.includes(n));

  // For staff tents: filter available staff not already assigned (check with § prefix)
  const assignedStaffNames = assegnati.filter(n => n.startsWith('§')).map(n => n.slice(1));
  const selectableStaff = availableStaff.filter(s => {
    return !assignedStaffNames.includes(s.full_name);
  });

  const displayName = (nome: string) => nome.startsWith('§') ? nome.slice(1) : nome;
  const isStaff = (nome: string) => nome.startsWith('§');

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
            <div className="flex gap-1 sm:gap-2">
              {Object.entries(COLORE_STYLES).map(([key, s]) => {
                const isSelected = colore === key;
                const selectedClass = key === 'blu'
                  ? 'bg-blue-600 text-white hover:bg-blue-700 hover:text-white border-blue-600'
                  : key === 'rosa'
                    ? 'bg-pink-600 text-white hover:bg-pink-700 hover:text-white border-pink-600'
                    : key === 'verde'
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white border-emerald-600'
                      : 'bg-slate-500 text-white hover:bg-slate-600 hover:text-white border-slate-500';
                const dotClass = key === 'blu' ? 'bg-blue-600' : key === 'rosa' ? 'bg-pink-600' : key === 'verde' ? 'bg-emerald-600' : 'bg-slate-400';
                return (
                  <Button
                    key={key}
                    variant="ghost"
                    size="sm"
                    className={`rounded-full gap-1 sm:gap-1.5 border flex-1 justify-center px-2 sm:px-3 text-xs sm:text-sm ${isSelected ? selectedClass : `${s.border} ${s.text} hover:bg-transparent hover:text-current`}`}
                    onClick={() => handleColorChange(key)}
                  >
                    <div className={`w-3 h-3 rounded-full ${dotClass} ${isSelected ? 'border border-white/50' : ''}`} />
                    {s.label}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Current occupants */}
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Occupanti ({assegnati.length}/4)
            </p>
            {assegnati.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Nessuno assegnato</p>
            ) : (
              <div className="space-y-2">
                {assegnati.map((nome, idx) => (
                  <div key={idx} className={`flex items-center justify-between rounded-xl px-3 py-2.5 ${style.bg} border ${style.border}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{displayName(nome)}</span>
                      {isStaff(nome) && (
                        <Badge className="text-[10px] bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300 border-0 rounded-full px-2 py-0.5 pointer-events-none">
                          Staff
                        </Badge>
                      )}
                    </div>
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

          {/* Add ragazzi (only for blu/rosa tents) */}
          {!isStaffTent && colore !== 'grigio' && assegnati.length < 4 && selectableRagazzi.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Aggiungi ragazzo/a</p>
              <Select onValueChange={handleAdd}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Seleziona un ragazzo/a..." />
                </SelectTrigger>
                <SelectContent>
                  {selectableRagazzi.map(nome => (
                    <SelectItem key={nome} value={nome}>{nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Add staff (only for grigio/animatori tents) */}
          {isStaffTent && assegnati.length < 4 && selectableStaff.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Aggiungi staff</p>
              <Select onValueChange={(val) => handleAddStaff(val)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Seleziona uno staff..." />
                </SelectTrigger>
                <SelectContent>
                  {selectableStaff.map(s => {
                    return <SelectItem key={s.id} value={s.full_name}>{s.full_name}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          {colore === 'grigio' && (
            <p className="text-sm text-muted-foreground italic">
              Tenda non assegnata: seleziona Maschile, Femminile o Animatori per aggiungere persone.
            </p>
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

function RagazzoCompactCard({ r, onClick, isDuplicate }: { r: any; onClick: () => void; isDuplicate?: boolean }) {
  const initials = `${(r.ragazzo_cognome?.[0] || '').toUpperCase()}${(r.ragazzo_nome?.[0] || '').toUpperCase()}`;
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
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-[15px] leading-tight truncate text-foreground">
              {toTitleCase(r.ragazzo_cognome)} {toTitleCase(r.ragazzo_nome)}
            </h4>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {toTitleCase(r.genitore_nome)} {toTitleCase(r.genitore_cognome)}
            </p>
          </div>
          {isDuplicate && <DuplicateBadge className="shrink-0" />}
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

function RagazzoDetailDrawer({ r, open, onOpenChange, isDuplicate, canEditNote, onSaveNote }: { r: any; open: boolean; onOpenChange: (v: boolean) => void; isDuplicate?: boolean; canEditNote?: boolean; onSaveNote?: (id: string, note: string) => Promise<void> }) {
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    setEditingNote(false);
    setNoteDraft(r?.note || '');
  }, [r?.id, r?.note]);

  if (!r) return null;
  const initials = `${(r.ragazzo_cognome?.[0] || '').toUpperCase()}${(r.ragazzo_nome?.[0] || '').toUpperCase()}`;

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
                <DrawerTitle className="text-xl text-left">{toTitleCase(r.ragazzo_cognome)} {toTitleCase(r.ragazzo_nome)}</DrawerTitle>
                <p className="text-sm text-muted-foreground mt-0.5">{r.genitore_qualita} — {toTitleCase(r.genitore_nome)} {toTitleCase(r.genitore_cognome)}</p>
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
            {isDuplicate && <DuplicateBadge />}
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
          <div className="space-y-1 mt-5">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <StickyNote className="h-3.5 w-3.5" /> Note
              </h4>
              {canEditNote && !editingNote && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 gap-1.5 text-xs"
                  onClick={() => { setNoteDraft(r.note || ''); setEditingNote(true); }}
                >
                  <Pencil className="h-3.5 w-3.5" /> Modifica
                </Button>
              )}
            </div>
            <div className="bg-muted/30 rounded-2xl px-4 py-3">
              {r.note ? (
                <p className="text-sm whitespace-pre-wrap">{r.note}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">Nessuna nota</p>
              )}
            </div>

            <Dialog open={editingNote} onOpenChange={(v) => { if (!savingNote) { setEditingNote(v); if (!v) setNoteDraft(r.note || ''); } }}>
              <DialogContent className="max-w-md rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-1.5">
                    <StickyNote className="h-4 w-4" /> Note
                  </DialogTitle>
                </DialogHeader>
                <Textarea
                  autoFocus
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="Scrivi una nota (es. richieste dei genitori alla partenza)..."
                  rows={6}
                  className="rounded-2xl resize-none"
                />
                <DialogFooter className="gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    disabled={savingNote}
                    onClick={() => { setEditingNote(false); setNoteDraft(r.note || ''); }}
                  >
                    Annulla
                  </Button>
                  <Button
                    size="sm"
                    className="rounded-xl gap-1.5"
                    disabled={savingNote}
                    onClick={async () => {
                      if (!onSaveNote) return;
                      setSavingNote(true);
                      try {
                        await onSaveNote(r.id, noteDraft.trim());
                        setEditingNote(false);
                      } finally {
                        setSavingNote(false);
                      }
                    }}
                  >
                    {savingNote ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Salva
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

      </DrawerContent>
    </Drawer>
  );
}

// ─── Staff compact card (stesso design dei ragazzi) ────

function StaffCompactCard({ a, onClick }: { a: AnimatoreCompleto; onClick: () => void }) {
  const parts = (a.full_name || '').trim().split(/\s+/);
  const initials = `${(parts[0]?.[0] || '').toUpperCase()}${(parts[1]?.[0] || '').toUpperCase()}`;
  const phoneNumber = a.telefono?.replace(/[^0-9+]/g, '') || '';

  return (
    <Card
      className="border-0 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer hover:scale-[1.02] overflow-hidden bg-card rounded-2xl [-webkit-tap-highlight-color:transparent]"
      onClick={onClick}
    >
      <CardContent className="p-0">
        <div className={`px-4 py-3.5 flex items-center gap-3 ${a.ha_allergie ? 'bg-gradient-to-r from-red-500/10 to-orange-500/10' : 'bg-gradient-to-r from-primary/10 to-blue-500/10'}`}>
          <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-md ${a.ha_allergie ? 'bg-gradient-to-br from-red-500 to-orange-500' : 'bg-gradient-to-br from-primary to-blue-500'}`}>
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-[15px] leading-tight truncate text-foreground">
              {a.full_name}
            </h4>
            <Badge className={`mt-1 text-[11px] border-0 rounded-full px-2.5 py-0.5 pointer-events-none ${RUOLO_COLORS[a.ruolo] || 'bg-muted text-muted-foreground'}`}>
              {RUOLO_LABELS[a.ruolo] || a.ruolo}
            </Badge>
          </div>
        </div>
        <div className="px-4 py-3.5 space-y-3">
          {a.telefono && (
            <div className="flex items-center gap-2 text-sm">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Phone className="h-3.5 w-3.5 text-primary" />
              </div>
              <a
                href={`tel:${phoneNumber}`}
                onClick={(e) => e.stopPropagation()}
                className="font-medium text-primary hover:underline active:opacity-70 transition-opacity"
              >
                {a.telefono}
              </a>
            </div>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            {a.ha_allergie ? (
              <Badge className="text-[11px] gap-1 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-0 rounded-full px-2.5 py-1 pointer-events-none">
                <AlertTriangle className="h-3 w-3" /> Allergie
              </Badge>
            ) : (
              <Badge className="text-[11px] gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-0 rounded-full px-2.5 py-1 pointer-events-none">
                <Check className="h-3 w-3" /> OK
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StaffDetailDrawer({ a, open, onOpenChange }: { a: AnimatoreCompleto | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  if (!a) return null;
  const parts = (a.full_name || '').trim().split(/\s+/);
  const initials = `${(parts[0]?.[0] || '').toUpperCase()}${(parts[1]?.[0] || '').toUpperCase()}`;
  const dob = formatDob(a.data_nascita);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh]">
        <div className="overflow-y-auto px-5 pb-8">
          <DrawerHeader className="px-0 pb-4">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold text-white shadow-lg shrink-0 ${a.ha_allergie ? 'bg-gradient-to-br from-red-500 to-orange-500' : 'bg-gradient-to-br from-primary to-blue-500'}`}>
                {initials}
              </div>
              <div>
                <DrawerTitle className="text-xl text-left">{a.full_name}</DrawerTitle>
                <p className="text-sm text-muted-foreground mt-0.5">{RUOLO_LABELS[a.ruolo] || a.ruolo}</p>
              </div>
            </div>
          </DrawerHeader>
          <div className="flex items-center gap-2 flex-wrap mb-5">
            {a.ha_allergie ? (
              <Badge className="gap-1 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-0 rounded-full px-3 py-1.5 text-xs pointer-events-none">
                <AlertTriangle className="h-3.5 w-3.5" /> Allergie/Patologie
              </Badge>
            ) : (
              <Badge className="gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-0 rounded-full px-3 py-1.5 text-xs pointer-events-none">
                <Check className="h-3.5 w-3.5" /> Nessuna allergia
              </Badge>
            )}
          </div>
          {(dob || a.telefono || a.email) && (
            <div className="space-y-1">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Dati e Contatti</h4>
              <div className="bg-muted/30 rounded-2xl px-3 divide-y divide-border">
                {dob && <InfoRow icon={<CalendarDays className="h-4 w-4 text-muted-foreground" />} label="Data di nascita" value={dob} />}
                {a.telefono && <InfoRow icon={<Phone className="h-4 w-4 text-muted-foreground" />} label="Telefono" value={a.telefono} isLink />}
                {a.email && <InfoRow icon={<Mail className="h-4 w-4 text-muted-foreground" />} label="Email" value={a.email} />}
              </div>
            </div>
          )}
          {a.ha_allergie && (
            <div className="space-y-1 mt-5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Allergie e Patologie</h4>
              <div className="bg-red-50 dark:bg-red-950/20 rounded-2xl px-4 py-3 space-y-2">
                {a.allergie_dettaglio && <p className="text-sm"><span className="font-medium">Allergie:</span> {a.allergie_dettaglio}</p>}
                {a.patologie_dettaglio && <p className="text-sm"><span className="font-medium">Patologie:</span> {a.patologie_dettaglio}</p>}
                <FarmacoLine nome={a.farmaco_1_nome} posologia={a.farmaco_1_posologia} />
                <FarmacoLine nome={a.farmaco_2_nome} posologia={a.farmaco_2_posologia} />
                <FarmacoLine nome={a.farmaco_3_nome} posologia={a.farmaco_3_posologia} />
              </div>
            </div>
          )}
          {a.note && (
            <div className="space-y-1 mt-5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Note</h4>
              <div className="bg-muted/30 rounded-2xl px-4 py-3">
                <p className="text-sm">{a.note}</p>
              </div>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// ─── Giornata genitori card & drawer ───────────────────

type GenitoreRow = {
  id: string;
  genitore_nome: string;
  genitore_cognome: string;
  genitore_email: string;
  figlio_nome: string;
  figlio_cognome: string;
  turno: string;
  partecipa: boolean;
  num_adulti: number;
  num_minori: number;
  contributo: number;
  arrivato: boolean;
  arrivato_da: string | null;
  arrivato_at: string | null;
  pagato: boolean;
  pagato_da: string | null;
  pagato_at: string | null;
};

function CheckinLog({ label, da, at }: { label: string; da: string | null; at: string | null }) {
  if (!da && !at) return null;
  let when = '';
  try {
    if (at) when = format(new Date(at), "d MMM 'ore' HH:mm", { locale: itLocale });
  } catch { /* ignore */ }
  return (
    <p className="text-[11px] text-muted-foreground leading-tight">
      {label} da <span className="font-medium text-foreground">{da || '—'}</span>{when ? ` · ${when}` : ''}
    </p>
  );
}

function GenitoreCard({ g, onClick, clickable, canCheckin, onToggleArrivato, onTogglePagato }: {
  g: GenitoreRow;
  onClick: () => void;
  clickable: boolean;
  canCheckin: boolean;
  onToggleArrivato: (g: GenitoreRow) => void;
  onTogglePagato: (g: GenitoreRow) => void;
}) {
  const initials = `${(g.figlio_cognome?.[0] || '').toUpperCase()}${(g.figlio_nome?.[0] || '').toUpperCase()}`;
  return (
    <Card
      className={`border-0 shadow-sm transition-all duration-300 overflow-hidden bg-card rounded-2xl [-webkit-tap-highlight-color:transparent] ${clickable ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02]' : ''}`}
    >
      <CardContent className="p-0">
        <div
          className={`px-4 py-3.5 flex items-center gap-3 ${g.partecipa ? 'bg-gradient-to-r from-rose-500/10 to-pink-500/10' : 'bg-gradient-to-r from-muted to-muted/40'}`}
          onClick={clickable ? onClick : undefined}
        >
          <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-md ${g.partecipa ? 'bg-gradient-to-br from-rose-500 to-pink-500' : 'bg-gradient-to-br from-slate-400 to-slate-500'}`}>
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-[15px] leading-tight truncate text-foreground">
              {toTitleCase(g.figlio_cognome)} {toTitleCase(g.figlio_nome)}
            </h4>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {toTitleCase(g.genitore_nome)} {toTitleCase(g.genitore_cognome)}
            </p>
          </div>
        </div>
        <div className="px-4 py-3.5 space-y-3">
          <div className="flex items-center gap-2 text-sm" onClick={clickable ? onClick : undefined}>
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Mail className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="font-medium text-foreground truncate">{g.genitore_email}</span>
          </div>
          {g.partecipa ? (
            <div className="flex items-center gap-2 flex-wrap" onClick={clickable ? onClick : undefined}>
              {g.num_adulti > 0 && (
                <Badge className="text-[11px] gap-1 bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border-0 rounded-full px-2.5 py-1 pointer-events-none">
                  <Users className="h-3 w-3" /> {g.num_adulti} adult{g.num_adulti === 1 ? 'o' : 'i'}
                </Badge>
              )}
              {g.num_minori > 0 && (
                <Badge className="text-[11px] gap-1 bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300 border-0 rounded-full px-2.5 py-1 pointer-events-none">
                  <Users className="h-3 w-3" /> {g.num_minori} minor{g.num_minori === 1 ? 'e' : 'i'}
                </Badge>
              )}
            </div>
          ) : (
            <Badge className="text-[11px] gap-1 bg-muted text-muted-foreground border-0 rounded-full px-2.5 py-1 pointer-events-none">
              <X className="h-3 w-3" /> Non partecipa
            </Badge>
          )}

          {/* Check-in */}
          <div className="pt-1 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                size="sm"
                disabled={!canCheckin}
                onClick={(e) => { e.stopPropagation(); onToggleArrivato(g); }}
                className={`rounded-xl gap-1.5 text-white border-0 disabled:opacity-100 ${g.arrivato ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-500 hover:bg-red-600'}`}
              >
                {g.arrivato ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
                {g.arrivato ? 'Arrivato' : 'Non arrivato'}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!canCheckin}
                onClick={(e) => { e.stopPropagation(); onTogglePagato(g); }}
                className={`rounded-xl gap-1.5 text-white border-0 disabled:opacity-100 ${g.pagato ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-500 hover:bg-red-600'}`}
              >
                <CircleDollarSign className="h-4 w-4" />
                {g.pagato ? 'Pagato' : 'Non pagato'}
              </Button>
            </div>
            {(g.arrivato || g.pagato) && (
              <div className="space-y-0.5">
                {g.arrivato && <CheckinLog label="Arrivo segnato" da={g.arrivato_da} at={g.arrivato_at} />}
                {g.pagato && <CheckinLog label="Pagamento segnato" da={g.pagato_da} at={g.pagato_at} />}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


function GenitoreDetailDrawer({ g, open, onOpenChange, showCosto }: { g: GenitoreRow | null; open: boolean; onOpenChange: (v: boolean) => void; showCosto: boolean }) {
  if (!g) return null;
  const initials = `${(g.figlio_cognome?.[0] || '').toUpperCase()}${(g.figlio_nome?.[0] || '').toUpperCase()}`;
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh]">
        <div className="overflow-y-auto px-5 pb-8">
          <DrawerHeader className="px-0 pb-4">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold text-white shadow-lg shrink-0 ${g.partecipa ? 'bg-gradient-to-br from-rose-500 to-pink-500' : 'bg-gradient-to-br from-slate-400 to-slate-500'}`}>
                {initials}
              </div>
              <div>
                <DrawerTitle className="text-xl text-left">{toTitleCase(g.figlio_cognome)} {toTitleCase(g.figlio_nome)}</DrawerTitle>
                <p className="text-sm text-muted-foreground mt-0.5">{toTitleCase(g.genitore_nome)} {toTitleCase(g.genitore_cognome)}</p>
              </div>
            </div>
          </DrawerHeader>
          <div className="space-y-1">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Dati</h4>
            <div className="bg-muted/30 rounded-2xl px-3 divide-y divide-border">
              <InfoRow icon={<Mail className="h-4 w-4 text-muted-foreground" />} label="Email genitore" value={g.genitore_email} />
              <InfoRow icon={<CalendarHeart className="h-4 w-4 text-muted-foreground" />} label="Partecipa sabato" value={g.partecipa ? 'Sì' : 'No'} />
            </div>
          </div>
          {g.partecipa && (
            <div className="space-y-1 mt-5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Partecipanti</h4>
              <div className="bg-muted/30 rounded-2xl px-3 divide-y divide-border">
                <InfoRow icon={<Users className="h-4 w-4 text-muted-foreground" />} label="Adulti (≥18)" value={String(g.num_adulti)} />
                <InfoRow icon={<Users className="h-4 w-4 text-muted-foreground" />} label="Minori di 18" value={String(g.num_minori)} />
              </div>
            </div>
          )}
          {g.partecipa && showCosto && (
            <div className="mt-5 flex items-center justify-between rounded-2xl bg-rose-50 dark:bg-rose-950/30 px-4 py-3.5">
              <span className="font-semibold text-foreground">Contributo da versare</span>
              <span className="text-xl font-bold text-rose-600">{g.contributo}€</span>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}





// ─── Appello Card ──────────────────────────────────────

function AppelloCard({ r, isPresent, onToggle, isDuplicate }: { r: any; isPresent: boolean; onToggle: () => void; isDuplicate?: boolean }) {
  return (
    <Card
      className={`cursor-pointer transition-all duration-200 active:scale-95 rounded-2xl border-2 [-webkit-tap-highlight-color:transparent] ${
        isPresent
          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 shadow-emerald-200/50 dark:shadow-emerald-900/30 shadow-md'
          : 'border-red-400 bg-red-50 dark:bg-red-950/30 shadow-red-200/50 dark:shadow-red-900/30 shadow-md'
      }`}
      onClick={onToggle}
    >
      <CardContent className="p-5 flex flex-col items-center justify-center gap-2 min-h-[92px]">
        <p className={`text-lg font-bold text-center ${isPresent ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
          {toTitleCase(r.ragazzo_cognome)} {toTitleCase(r.ragazzo_nome)}
        </p>
        {isDuplicate && <DuplicateBadge />}
      </CardContent>
    </Card>
  );
}

// ─── Main Component ────────────────────────────────────

type TabType = 'dettagli' | 'appello' | 'tende' | 'animatori' | 'download-lista' | 'giornata-genitori';

export default function TurnoPage() {
  const { turnoSlug } = useParams<{ turnoSlug: string }>();
  const { user, isAdmin, profile } = useAuth();
  const { data: myPerms = [], isLoading: permsLoading } = useMyTurnoPermissions();

  // Determine if the current user is a staff account (created from Anagrafica Staff)
  const { data: isStaffAccount = false } = useQuery({
    queryKey: ['is-staff-account', user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('is_staff_account');
      if (error) throw error;
      return !!data;
    },
    enabled: !!user,
  });
  // Staff accounts (non-admin) can only download a restricted set of fields
  const restrictFields = isStaffAccount && !isAdmin;

  // Ruolo dell'account staff corrente (animatore, cuoco, responsabile_*)
  const { data: staffRuolo = null } = useQuery({
    queryKey: ['my-staff-ruolo', user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('my_staff_ruolo');
      if (error) throw error;
      return (data as string | null) ?? null;
    },
    enabled: !!user && isStaffAccount && !isAdmin,
  });
  // Gli account staff con ruolo "animatore" vedono solo Appello, Tende e Download lista
  const isAnimatoreLimitato = isStaffAccount && !isAdmin && staffRuolo === 'animatore';
  const queryClient = useQueryClient();
  const [selectedRagazzo, setSelectedRagazzo] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAllergie, setFilterAllergie] = useState<boolean | null>(null);
  const [filterFoto, setFilterFoto] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('dettagli');
  const [presentSet, setPresentSet] = useState<Set<string>>(new Set());
  const [selectedStaff, setSelectedStaff] = useState<AnimatoreCompleto | null>(null);
  const [filterStaffAllergie, setFilterStaffAllergie] = useState<boolean | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedTenda, setSelectedTenda] = useState<TendaData | null>(null);
  const [tendaSaving, setTendaSaving] = useState(false);
  const [selectedGenitore, setSelectedGenitore] = useState<GenitoreRow | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [dlIncludeRagazzi, setDlIncludeRagazzi] = useState(true);
  const [dlIncludeStaff, setDlIncludeStaff] = useState(true);
  const [dlRagazziFields, setDlRagazziFields] = useState<Record<string, boolean>>({
    cognome: true, nome: true, data_nascita: false, genitore: true,
    telefono: true, email: false, residenza: false, indirizzo: false,
    allergie: false, foto: false, doppione: true,
  });
  const [dlStaffFields, setDlStaffFields] = useState<Record<string, boolean>>({
    nome_cognome: true, ruolo: true, telefono: true, email: true, data_nascita: false,
  });

  const turnoInfo = TURNI.find(t => t.slug === turnoSlug);
  const turnoValue = turnoInfo?.value ?? '';
  const turnoLabel = turnoInfo?.label ?? '';
  const hasAccess = isAdmin || myPerms.some(p => p.turno === turnoValue);

  // Giornata genitori: solo per 4ª e 5ª elementare
  const showGiornataGenitori = turnoSlug === '4-elementare' || turnoSlug === '5-elementare';
  // Permessi: gli animatori vedono solo le card e KPI base (no costi, no apertura)
  const ggCanOpen = !isAnimatoreLimitato;
  const ggCanSeeMoney = !isAnimatoreLimitato;
  const giornataLink = `${window.location.origin}/giornata-genitori`;

  // Load giornata genitori per questo turno
  const { data: genitoriRows = [], isLoading: genitoriLoading } = useQuery({
    queryKey: ['giornata-genitori', turnoValue],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('giornata_genitori' as any)
        .select('*')
        .eq('turno', turnoValue)
        .order('figlio_cognome', { ascending: true })
        .order('figlio_nome', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as GenitoreRow[];
    },
    enabled: !!user && hasAccess && showGiornataGenitori && !!turnoValue,
  });

  const ggStats = useMemo(() => {
    let adulti = 0, minori = 0, soldi = 0;
    for (const g of genitoriRows) {
      if (!g.partecipa) continue;
      adulti += g.num_adulti || 0;
      minori += g.num_minori || 0;
      soldi += g.contributo || 0;
    }
    return { adulti, minori, persone: adulti + minori, soldi };
  }, [genitoriRows]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(giornataLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast({ title: 'Impossibile copiare', description: 'Copia il link manualmente.', variant: 'destructive' });
    }
  };

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
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const duplicateIscrizioneIds = useMemo(() => {
    const groups = new Map<string, string[]>();

    iscrizioni.forEach((r: any) => {
      const key = normalizeDuplicateName(`${r.ragazzo_nome ?? ''} ${r.ragazzo_cognome ?? ''}`);
      if (!key) return;
      groups.set(key, [...(groups.get(key) ?? []), r.id]);
    });

    const duplicates = new Set<string>();
    groups.forEach((ids) => {
      if (ids.length > 1) ids.forEach((id) => duplicates.add(id));
    });
    return duplicates;
  }, [iscrizioni]);

  // Load animatori for this turno
  const { data: animatoriTurno = [], isLoading: animatoriLoading } = useAnimatoriByTurno(turnoValue);

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

  // Count only ragazzi (exclude staff prefixed with §) for stats
  const ragazziAssignedCount = useMemo(() => {
    let count = 0;
    tendeMap.forEach(t => t.assegnati.forEach(n => { if (!n.startsWith('§')) count++; }));
    return count;
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
      const { data: upserted, error } = await supabase
        .from('tende' as any)
        .upsert({
          ...(tenda.id ? { id: tenda.id } : {}),
          turno: tenda.turno,
          riga: tenda.riga,
          numero: tenda.numero,
          colore: tenda.colore,
          assegnati: tenda.assegnati,
          updated_at: new Date().toISOString(),
        } as any, { onConflict: 'turno,riga,numero' })
        .select()
        .single();
      if (error) throw error;
      // Update selectedTenda with the returned id so subsequent saves use update path
      if (upserted) {
        setSelectedTenda({
          id: (upserted as any).id,
          turno: (upserted as any).turno,
          riga: (upserted as any).riga,
          numero: (upserted as any).numero,
          colore: (upserted as any).colore,
          assegnati: Array.isArray((upserted as any).assegnati) ? (upserted as any).assegnati : [],
        });
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
        `${r.ragazzo_cognome} ${r.ragazzo_nome}`.toLowerCase().includes(q)
      );
    }
    if (filterAllergie !== null) {
      result = result.filter((r: any) => r.ha_allergie === filterAllergie);
    }
    if (filterFoto !== null) {
      result = result.filter((r: any) => r.liberatoria_foto === filterFoto);
    }
    result.sort((a: any, b: any) => {
      const cmp = (a.ragazzo_cognome || '').localeCompare(b.ragazzo_cognome || '', 'it');
      return cmp !== 0 ? cmp : (a.ragazzo_nome || '').localeCompare(b.ragazzo_nome || '', 'it');
    });
    return result;
  }, [iscrizioni, searchQuery, filterAllergie, filterFoto]);

  // Sorted iscrizioni for appello (by name)
  const sortedIscrizioni = useMemo(() => {
    return [...iscrizioni].sort((a: any, b: any) => {
      const cmp = (a.ragazzo_cognome || '').localeCompare(b.ragazzo_cognome || '', 'it');
      return cmp !== 0 ? cmp : (a.ragazzo_nome || '').localeCompare(b.ragazzo_nome || '', 'it');
    });
  }, [iscrizioni]);

  useEffect(() => {
    const validIds = new Set(iscrizioni.map((r: any) => r.id));
    setPresentSet(prev => {
      const cleaned = new Set([...prev].filter(id => validIds.has(id)));
      return cleaned.size === prev.size ? prev : cleaned;
    });
  }, [iscrizioni]);

  // Realtime iscrizioni
  useEffect(() => {
    if (!user || !turnoValue) return;
    const channel = supabase
      .channel(`iscrizioni-turno-${turnoSlug}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'iscrizioni' }, async () => {
        queryClient.invalidateQueries({ queryKey: ['turno-iscrizioni', turnoValue] });
        queryClient.invalidateQueries({ queryKey: ['turno-counts'] });
        queryClient.invalidateQueries({ queryKey: ['iscrizioni-con-pagamenti'] });
        await queryClient.refetchQueries({ queryKey: ['turno-iscrizioni', turnoValue] });
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

  // Field definitions for the customizable PDF list
  const RAGAZZI_FIELD_DEFS: { key: string; label: string; get: (r: any) => string }[] = [
    { key: 'cognome', label: 'Cognome', get: (r) => r.ragazzo_cognome || '' },
    { key: 'nome', label: 'Nome', get: (r) => r.ragazzo_nome || '' },
    { key: 'data_nascita', label: 'Data di nascita', get: (r) => formatDob(r.ragazzo_data_nascita) },
    { key: 'genitore', label: 'Genitore', get: (r) => `${r.genitore_nome || ''} ${r.genitore_cognome || ''}`.trim() },
    { key: 'telefono', label: 'Telefono', get: (r) => r.recapiti_telefonici || '' },
    { key: 'email', label: 'Email', get: (r) => r.email || '' },
    { key: 'residenza', label: 'Residenza', get: (r) => r.ragazzo_residente || '' },
    { key: 'indirizzo', label: 'Indirizzo', get: (r) => r.ragazzo_indirizzo || '' },
    { key: 'allergie', label: 'Allergie/Patologie', get: (r) => (r.ha_allergie ? (r.allergie_dettaglio || r.patologie_dettaglio || 'Sì') : '') },
    { key: 'foto', label: 'Consenso foto', get: (r) => (r.liberatoria_foto ? 'Sì' : 'No') },
    { key: 'doppione', label: 'Segnalazione', get: (r) => (duplicateIscrizioneIds.has(r.id) ? 'DOPPIONE' : '') },
  ];

  const STAFF_FIELD_DEFS: { key: string; label: string; get: (a: AnimatoreCompleto) => string }[] = [
    { key: 'nome_cognome', label: 'Nome e Cognome', get: (a) => a.full_name },
    { key: 'ruolo', label: 'Ruolo', get: (a) => RUOLO_LABELS[a.ruolo] || a.ruolo },
    { key: 'telefono', label: 'Telefono', get: (a) => a.telefono || '' },
    { key: 'email', label: 'Email', get: (a) => a.email || '' },
    { key: 'data_nascita', label: 'Data di nascita', get: (a) => formatDob(a.data_nascita) },
  ];

  // Field defs visible/selectable depending on account type
  const visibleRagazziDefs = restrictFields
    ? RAGAZZI_FIELD_DEFS.filter((f) => ALLOWED_RAGAZZI_STAFF.includes(f.key))
    : RAGAZZI_FIELD_DEFS;
  const visibleStaffDefs = restrictFields
    ? STAFF_FIELD_DEFS.filter((f) => ALLOWED_STAFF_STAFF.includes(f.key))
    : STAFF_FIELD_DEFS;

  // For staff accounts, force selection to allowed fields only
  useEffect(() => {
    if (!restrictFields) return;
    setDlRagazziFields((prev) => {
      const next: Record<string, boolean> = {};
      RAGAZZI_FIELD_DEFS.forEach((f) => {
        next[f.key] = ALLOWED_RAGAZZI_STAFF.includes(f.key) ? (prev[f.key] ?? true) : false;
      });
      return next;
    });
    setDlStaffFields((prev) => {
      const next: Record<string, boolean> = {};
      STAFF_FIELD_DEFS.forEach((f) => {
        next[f.key] = ALLOWED_STAFF_STAFF.includes(f.key) ? (prev[f.key] ?? true) : false;
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restrictFields]);


  // Download PDF with sections — A4 portrait, columns adapt to selected fields
  const handleDownloadPDF = async () => {
    if (!dlIncludeRagazzi && !dlIncludeStaff) return;

    const { jsPDF } = await import('jspdf');
    const { autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    let currentY = 20;
    let sectionsRendered = 0;

    if (dlIncludeRagazzi) {
      const cols = RAGAZZI_FIELD_DEFS.filter((f) => dlRagazziFields[f.key] && (!restrictFields || ALLOWED_RAGAZZI_STAFF.includes(f.key)));
      if (cols.length > 0) {
        doc.setFontSize(16);
        doc.text(`Ragazzi — ${turnoLabel}`, 14, currentY);

        const rows = sortedIscrizioni.map((r: any) => cols.map((c) => c.get(r)));

        autoTable(doc, {
          startY: currentY + 10,
          head: [cols.map((c) => c.label)],
          body: rows,
          styles: { fontSize: 10, overflow: 'linebreak', cellWidth: 'auto' },
          headStyles: { fillColor: [59, 130, 246] },
          margin: { left: 14, right: 14 },
          tableWidth: 'auto',
        });

        currentY = (doc as any).lastAutoTable?.finalY ?? currentY + 30;
        sectionsRendered++;
      }
    }

    if (dlIncludeStaff) {
      const cols = STAFF_FIELD_DEFS.filter((f) => dlStaffFields[f.key] && (!restrictFields || ALLOWED_STAFF_STAFF.includes(f.key)));
      if (cols.length > 0) {
        if (sectionsRendered > 0) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(16);
        doc.text(`Staff — ${turnoLabel}`, 14, currentY);

        const sortedStaff = [...animatoriTurno].sort((a, b) => {
          const r = (RUOLO_ORDER[a.ruolo] || 99) - (RUOLO_ORDER[b.ruolo] || 99);
          if (r !== 0) return r;
          return a.full_name.toLowerCase().localeCompare(b.full_name.toLowerCase());
        });
        const staffRows = sortedStaff.map((a: AnimatoreCompleto) => cols.map((c) => c.get(a)));

        autoTable(doc, {
          startY: currentY + 10,
          head: [cols.map((c) => c.label)],
          body: staffRows,
          styles: { fontSize: 10, overflow: 'linebreak', cellWidth: 'auto' },
          headStyles: { fillColor: [59, 130, 246] },
          margin: { left: 14, right: 14 },
          tableWidth: 'auto',
        });
      }
    }

    doc.save(`lista-${turnoSlug}.pdf`);
  };


  const handleTabClick = (tab: TabType) => {
    setActiveTab(tab);
  };

  // Per gli account staff "animatore": se la tab attiva non è consentita, riportala su Appello
  useEffect(() => {
    if (isAnimatoreLimitato && (activeTab === 'dettagli' || activeTab === 'animatori')) {
      setActiveTab('appello');
    }
  }, [isAnimatoreLimitato, activeTab]);

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
          {!isAnimatoreLimitato && (
            <Button
              variant={activeTab === 'dettagli' ? 'default' : 'outline'}
              size="sm"
              className="rounded-full gap-1.5"
              onClick={() => handleTabClick('dettagli')}
            >
              <Users className="h-4 w-4" /> Dettagli ragazzi
            </Button>
          )}
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
          {!isAnimatoreLimitato && (
            <Button
              variant={activeTab === 'animatori' ? 'default' : 'outline'}
              size="sm"
              className="rounded-full gap-1.5"
              onClick={() => handleTabClick('animatori')}
            >
              <UserPlus className="h-4 w-4" /> Staff
            </Button>
          )}
          <Button
            variant={activeTab === 'download-lista' ? 'default' : 'outline'}
            size="sm"
            className="rounded-full gap-1.5"
            onClick={() => handleTabClick('download-lista')}
          >
            <Download className="h-4 w-4" /> Download lista
          </Button>
          {showGiornataGenitori && (
            <Button
              variant={activeTab === 'giornata-genitori' ? 'default' : 'outline'}
              size="sm"
              className="rounded-full gap-1.5"
              onClick={() => handleTabClick('giornata-genitori')}
            >
              <CalendarHeart className="h-4 w-4" /> Giornata genitori
            </Button>
          )}
        </div>

        {/* ─── Tab: Dettagli ragazzi ─── */}
        {!isAnimatoreLimitato && activeTab === 'dettagli' && (
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
                  <RagazzoCompactCard key={r.id} r={r} isDuplicate={duplicateIscrizioneIds.has(r.id)} onClick={() => setSelectedRagazzo(r)} />
                ))}
              </div>
            )}

            <RagazzoDetailDrawer
              r={selectedRagazzo}
              isDuplicate={selectedRagazzo ? duplicateIscrizioneIds.has(selectedRagazzo.id) : false}
              open={!!selectedRagazzo}
              onOpenChange={(v) => { if (!v) setSelectedRagazzo(null); }}
              canEditNote={!isAnimatoreLimitato}
              onSaveNote={async (id, note) => {
                const { error } = await supabase.from('iscrizioni').update({ note }).eq('id', id);
                if (error) {
                  toast({ title: 'Errore', description: 'Impossibile salvare la nota.', variant: 'destructive' });
                  throw error;
                }
                setSelectedRagazzo((prev: any) => (prev && prev.id === id ? { ...prev, note } : prev));
                queryClient.invalidateQueries({ queryKey: ['turno-iscrizioni', turnoValue] });
                await queryClient.refetchQueries({ queryKey: ['turno-iscrizioni', turnoValue] });
                toast({ title: 'Nota salvata' });
              }}
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
                      <div className={`w-3 h-3 rounded-full ${key === 'blu' ? 'bg-blue-600' : key === 'rosa' ? 'bg-pink-600' : key === 'verde' ? 'bg-emerald-600' : 'bg-slate-400'}`} />
                      <span className="text-muted-foreground">{s.label}</span>
                    </div>
                  ))}
                </div>

                {/* Tent grid */}
                <div className="space-y-0 sm:space-y-1 max-w-md sm:max-w-lg lg:max-w-xl mx-auto">
                  {TENT_ROWS.map(({ riga, count, colStart }) => (
                    <div key={riga} className="grid grid-cols-4 gap-0.5 sm:gap-1 lg:gap-2 items-end">
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
                        {ragazziAssignedCount}/{iscrizioni.length}
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
              availableStaff={animatoriTurno.map(a => ({ id: a.id, full_name: a.full_name, cognome: a.cognome }))}
              onSave={handleSaveTenda}
              saving={tendaSaving}
            />
          </>
        )}

        {/* ─── Tab: Animatori ─── */}
        {!isAnimatoreLimitato && activeTab === 'animatori' && (
          <>
            {animatoriLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : animatoriTurno.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <UserPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nessuno staff assegnato a questo turno.</p>
                  <p className="text-sm text-muted-foreground mt-1">Vai su Anagrafica Staff per assegnare il personale.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <Card className="border-0 shadow-sm rounded-2xl bg-muted/30">
                  <CardContent className="p-4 flex items-center gap-2 flex-wrap">
                    <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Button variant={filterStaffAllergie === true ? 'default' : 'outline'} size="sm" className="rounded-full text-xs h-7 gap-1" onClick={() => setFilterStaffAllergie(filterStaffAllergie === true ? null : true)}>
                      <AlertTriangle className="h-3 w-3" /> Con allergie
                    </Button>
                    <Button variant={filterStaffAllergie === false ? 'default' : 'outline'} size="sm" className="rounded-full text-xs h-7 gap-1" onClick={() => setFilterStaffAllergie(filterStaffAllergie === false ? null : false)}>
                      <Check className="h-3 w-3" /> Senza allergie
                    </Button>
                  </CardContent>
                </Card>

                {(() => {
                  const sorted = [...animatoriTurno]
                    .filter((a) => filterStaffAllergie === null || a.ha_allergie === filterStaffAllergie)
                    .sort((a, b) => {
                      const r = (RUOLO_ORDER[a.ruolo] || 99) - (RUOLO_ORDER[b.ruolo] || 99);
                      if (r !== 0) return r;
                      return a.full_name.toLowerCase().localeCompare(b.full_name.toLowerCase());
                    });
                  if (sorted.length === 0) {
                    return (
                      <Card>
                        <CardContent className="py-8 text-center">
                          <p className="text-muted-foreground">Nessun risultato per questo filtro.</p>
                        </CardContent>
                      </Card>
                    );
                  }
                  return (
                    <>
                      <div className="text-sm text-muted-foreground">
                        {sorted.length} staff{filterStaffAllergie !== null ? ' filtrat' + (sorted.length === 1 ? 'o' : 'i') : ' assegnat' + (sorted.length === 1 ? 'o' : 'i')}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {sorted.map((a: AnimatoreCompleto) => (
                          <StaffCompactCard key={a.id} a={a} onClick={() => setSelectedStaff(a)} />
                        ))}
                      </div>
                    </>
                  );
                })()}

                <StaffDetailDrawer
                  a={selectedStaff}
                  open={!!selectedStaff}
                  onOpenChange={(v) => { if (!v) setSelectedStaff(null); }}
                />
              </div>
            )}
          </>
        )}

        {/* ─── Tab: Download lista ─── */}
        {activeTab === 'download-lista' && (
          <Card className="border-0 shadow-sm rounded-2xl">
            <CardContent className="p-6 space-y-6">
              <div>
                <p className="text-sm text-muted-foreground mb-3">Seleziona quali sezioni includere nel PDF:</p>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dlIncludeRagazzi}
                      onChange={(e) => setDlIncludeRagazzi(e.target.checked)}
                      className="h-5 w-5 rounded border-2 border-primary accent-primary"
                    />
                    <p className="font-medium text-foreground">Ragazzi</p>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dlIncludeStaff}
                      onChange={(e) => setDlIncludeStaff(e.target.checked)}
                      className="h-5 w-5 rounded border-2 border-primary accent-primary"
                    />
                    <p className="font-medium text-foreground">Staff</p>
                  </label>
                </div>
              </div>

              {dlIncludeRagazzi && (
                <div className="rounded-xl border p-4 space-y-3">
                  <p className="text-sm font-semibold text-foreground">Colonne lista Ragazzi</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {visibleRagazziDefs.map((f) => (
                      <label key={f.key} className="flex items-center gap-2 cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          checked={!!dlRagazziFields[f.key]}
                          onChange={(e) => setDlRagazziFields((p) => ({ ...p, [f.key]: e.target.checked }))}
                          className="h-4 w-4 rounded border-2 border-primary accent-primary"
                        />
                        {f.label}
                      </label>
                    ))}
                  </div>
                  {visibleRagazziDefs.filter((f) => dlRagazziFields[f.key]).length === 0 && (
                    <p className="text-xs text-destructive">Seleziona almeno una colonna.</p>
                  )}
                </div>
              )}

              {dlIncludeStaff && (
                <div className="rounded-xl border p-4 space-y-3">
                  <p className="text-sm font-semibold text-foreground">Colonne lista Staff</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {visibleStaffDefs.map((f) => (
                      <label key={f.key} className="flex items-center gap-2 cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          checked={!!dlStaffFields[f.key]}
                          onChange={(e) => setDlStaffFields((p) => ({ ...p, [f.key]: e.target.checked }))}
                          className="h-4 w-4 rounded border-2 border-primary accent-primary"
                        />
                        {f.label}
                      </label>
                    ))}
                  </div>
                  {visibleStaffDefs.filter((f) => dlStaffFields[f.key]).length === 0 && (
                    <p className="text-xs text-destructive">Seleziona almeno una colonna.</p>
                  )}
                </div>
              )}

              <p className="text-xs text-muted-foreground">Il PDF è in formato A4 verticale: le colonne si adattano automaticamente al numero di campi selezionati.</p>

              <Button
                className="rounded-full gap-2"
                disabled={
                  (!dlIncludeRagazzi && !dlIncludeStaff) ||
                  (dlIncludeRagazzi && visibleRagazziDefs.filter((f) => dlRagazziFields[f.key]).length === 0) ||
                  (dlIncludeStaff && visibleStaffDefs.filter((f) => dlStaffFields[f.key]).length === 0)
                }
                onClick={handleDownloadPDF}
              >
                <Download className="h-4 w-4" /> Scarica PDF
              </Button>
            </CardContent>
          </Card>
        )}



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
                      isDuplicate={duplicateIscrizioneIds.has(r.id)}
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

        {/* ─── Tab: Giornata genitori ─── */}
        {showGiornataGenitori && activeTab === 'giornata-genitori' && (
          <div className="space-y-6">
            {/* Link condivisibile */}
            <Card className="border-0 shadow-sm rounded-2xl bg-muted/30">
              <CardContent className="p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <LinkIcon className="h-3.5 w-3.5" /> Link modulo da condividere
                </p>
                <div className="flex items-center gap-2">
                  <Input readOnly value={giornataLink} className="rounded-xl bg-background text-sm" onFocus={(e) => e.target.select()} />
                  <Button size="sm" className="rounded-xl gap-1.5 shrink-0" onClick={handleCopyLink}>
                    {linkCopied ? <><Check className="h-4 w-4" /> Copiato</> : <><Copy className="h-4 w-4" /> Copia</>}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* KPI */}
            <div className={`grid grid-cols-2 gap-3 ${ggCanSeeMoney ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
              <Card className="border-0 shadow-sm rounded-2xl">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-rose-600">{ggStats.adulti}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Adulti</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm rounded-2xl">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-pink-600">{ggStats.minori}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Minori</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm rounded-2xl">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-foreground">{ggStats.persone}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Persone totali</p>
                </CardContent>
              </Card>
              {ggCanSeeMoney && (
                <Card className="border-0 shadow-sm rounded-2xl bg-rose-50 dark:bg-rose-950/30">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-rose-600 flex items-center justify-center gap-1">
                      {ggStats.soldi}<Euro className="h-5 w-5" />
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">Totale raccolto</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Cards */}
            {genitoriLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : genitoriRows.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <CalendarHeart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nessuna adesione ricevuta per questo turno.</p>
                  <p className="text-sm text-muted-foreground mt-1">Condividi il link del modulo con i genitori.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {genitoriRows.map((g) => (
                  <GenitoreCard
                    key={g.id}
                    g={g}
                    clickable={ggCanOpen}
                    onClick={() => setSelectedGenitore(g)}
                  />
                ))}
              </div>
            )}

            {ggCanOpen && (
              <GenitoreDetailDrawer
                g={selectedGenitore}
                open={!!selectedGenitore}
                onOpenChange={(v) => { if (!v) setSelectedGenitore(null); }}
                showCosto={ggCanSeeMoney}
              />
            )}
          </div>
        )}
      </div>

    </MainLayout>
  );
}
