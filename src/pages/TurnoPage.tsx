import { useParams } from 'react-router-dom';
import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useMyTurnoPermissions, TURNI } from '@/hooks/useTurnoPermissions';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Loader2, ShieldAlert, Phone, Camera, AlertTriangle, Check, Search, MapPin, Mail, CalendarDays, Home, Pen, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

function FarmacoLine({ nome, posologia }: { nome?: string | null; posologia?: string | null }) {
  if (!nome) return null;
  return (
    <p className="text-sm text-muted-foreground">
      💊 {nome}{posologia ? ` — ${posologia}` : ''}
    </p>
  );
}

function RagazzoCompactCard({ r, onClick }: { r: any; onClick: () => void }) {
  const initials = `${(r.ragazzo_nome?.[0] || '').toUpperCase()}${(r.ragazzo_cognome?.[0] || '').toUpperCase()}`;
  const phoneNumber = r.recapiti_telefonici?.replace(/[^0-9+]/g, '') || '';

  return (
    <Card 
      className="border-0 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer hover:scale-[1.02] overflow-hidden bg-card rounded-2xl"
      onClick={onClick}
    >
      <CardContent className="p-0">
        {/* Colored header with initials */}
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

        {/* Body */}
        <div className="px-4 py-3.5 space-y-3">
          {/* Phone - only number is clickable */}
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

          {/* Badges row */}
          <div className="flex items-center gap-2 flex-wrap">
            {r.ha_allergie ? (
              <Badge className="text-[11px] gap-1 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-0 rounded-full px-2.5 py-1">
                <AlertTriangle className="h-3 w-3" /> Allergie
              </Badge>
            ) : (
              <Badge className="text-[11px] gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-0 rounded-full px-2.5 py-1">
                <Check className="h-3 w-3" /> OK
              </Badge>
            )}
            <Badge className={`text-[11px] gap-1 border-0 rounded-full px-2.5 py-1 ${r.liberatoria_foto ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' : 'bg-muted text-muted-foreground'}`}>
              <Camera className="h-3 w-3" /> {r.liberatoria_foto ? 'Sì' : 'No'}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Detail info row component
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
            {/* Avatar + Name header */}
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

          {/* Quick badges */}
          <div className="flex items-center gap-2 flex-wrap mb-5">
            {r.ha_allergie ? (
              <Badge className="gap-1 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-0 rounded-full px-3 py-1.5 text-xs">
                <AlertTriangle className="h-3.5 w-3.5" /> Allergie/Patologie
              </Badge>
            ) : (
              <Badge className="gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-0 rounded-full px-3 py-1.5 text-xs">
                <Check className="h-3.5 w-3.5" /> Nessuna allergia
              </Badge>
            )}
            <Badge className={`gap-1 border-0 rounded-full px-3 py-1.5 text-xs ${r.liberatoria_foto ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' : 'bg-muted text-muted-foreground'}`}>
              <Camera className="h-3.5 w-3.5" /> Foto {r.liberatoria_foto ? 'Sì' : 'No'}
            </Badge>
          </div>

          {/* Info sections */}
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
                {r.allergie_dettaglio && (
                  <p className="text-sm"><span className="font-medium">Allergie:</span> {r.allergie_dettaglio}</p>
                )}
                {r.patologie_dettaglio && (
                  <p className="text-sm"><span className="font-medium">Patologie:</span> {r.patologie_dettaglio}</p>
                )}
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

export default function TurnoPage() {
  const { turnoSlug } = useParams<{ turnoSlug: string }>();
  const { user, isAdmin } = useAuth();
  const { data: myPerms = [], isLoading: permsLoading } = useMyTurnoPermissions();
  const queryClient = useQueryClient();
  const [selectedRagazzo, setSelectedRagazzo] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAllergie, setFilterAllergie] = useState<boolean | null>(null);
  const [filterFoto, setFilterFoto] = useState<boolean | null>(null);

  // Find turno info from slug
  const turnoInfo = TURNI.find(t => t.slug === turnoSlug);
  const turnoValue = turnoInfo?.value ?? '';
  const turnoLabel = turnoInfo?.label ?? '';

  const hasAccess = isAdmin || myPerms.some(p => p.turno === turnoValue);

  // Load iscrizioni for this turno
  const { data: iscrizioni = [], isLoading: iscrizioniLoading } = useQuery({
    queryKey: ['turno-iscrizioni', turnoValue],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('iscrizioni')
        .select('*')
        .eq('turno', turnoValue)
        .order('ragazzo_cognome', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user && hasAccess && !!turnoValue,
  });

  // Filter + sort
  const filteredIscrizioni = useMemo(() => {
    let result = iscrizioni;
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
    return result;
  }, [iscrizioni, searchQuery, filterAllergie, filterFoto]);

  // Realtime
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
        {/* Search & Filters section */}
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
              <Button
                variant={filterAllergie === true ? 'default' : 'outline'}
                size="sm"
                className="rounded-full text-xs h-7 gap-1"
                onClick={() => setFilterAllergie(filterAllergie === true ? null : true)}
              >
                <AlertTriangle className="h-3 w-3" /> Con allergie
              </Button>
              <Button
                variant={filterAllergie === false ? 'default' : 'outline'}
                size="sm"
                className="rounded-full text-xs h-7 gap-1"
                onClick={() => setFilterAllergie(filterAllergie === false ? null : false)}
              >
                <Check className="h-3 w-3" /> Senza allergie
              </Button>
              <Button
                variant={filterFoto === true ? 'default' : 'outline'}
                size="sm"
                className="rounded-full text-xs h-7 gap-1"
                onClick={() => setFilterFoto(filterFoto === true ? null : true)}
              >
                <Camera className="h-3 w-3" /> Foto Sì
              </Button>
              <Button
                variant={filterFoto === false ? 'default' : 'outline'}
                size="sm"
                className="rounded-full text-xs h-7 gap-1"
                onClick={() => setFilterFoto(filterFoto === false ? null : false)}
              >
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
      </div>
    </MainLayout>
  );
}
