import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useMyTurnoPermissions, TURNI } from '@/hooks/useTurnoPermissions';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, ShieldAlert, Phone, User, Camera, AlertTriangle, Check } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

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
      className="border-0 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer hover:scale-[1.02] overflow-hidden bg-card"
      onClick={onClick}
    >
      <CardContent className="p-0">
        {/* Colored header strip with initials */}
        <div className={`px-4 py-3 flex items-center gap-3 ${r.ha_allergie ? 'bg-gradient-to-r from-red-500/10 to-orange-500/10' : 'bg-gradient-to-r from-primary/10 to-blue-500/10'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 ${r.ha_allergie ? 'bg-gradient-to-br from-red-500 to-orange-500' : 'bg-gradient-to-br from-primary to-blue-500'}`}>
            {initials}
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-sm leading-tight truncate text-foreground">
              {r.ragazzo_nome} {r.ragazzo_cognome}
            </h4>
            <p className="text-xs text-muted-foreground truncate">
              {r.genitore_nome} {r.genitore_cognome}
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="px-4 py-3 space-y-2.5">
          {/* Phone - clickable */}
          <a
            href={`tel:${phoneNumber}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2 text-sm font-medium text-primary hover:underline active:opacity-70 transition-opacity"
          >
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Phone className="h-3.5 w-3.5 text-primary" />
            </div>
            {r.recapiti_telefonici}
          </a>

          {/* Badges row */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {r.ha_allergie ? (
              <Badge className="text-[11px] gap-1 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-0 rounded-full px-2.5">
                <AlertTriangle className="h-3 w-3" /> Allergie
              </Badge>
            ) : (
              <Badge className="text-[11px] gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-0 rounded-full px-2.5">
                <Check className="h-3 w-3" /> OK
              </Badge>
            )}
            <Badge className={`text-[11px] gap-1 border-0 rounded-full px-2.5 ${r.liberatoria_foto ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' : 'bg-muted text-muted-foreground'}`}>
              <Camera className="h-3 w-3" /> {r.liberatoria_foto ? 'Sì' : 'No'}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RagazzoDetailDialog({ r, open, onOpenChange }: { r: any; open: boolean; onOpenChange: (v: boolean) => void }) {
  if (!r) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">{r.ragazzo_nome} {r.ragazzo_cognome}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div>
              <span className="font-medium text-foreground">Data di nascita</span>
              <p className="text-muted-foreground">{format(new Date(r.ragazzo_data_nascita), 'dd/MM/yyyy')}</p>
            </div>
            <div>
              <span className="font-medium text-foreground">Luogo di nascita</span>
              <p className="text-muted-foreground">{r.ragazzo_luogo_nascita}</p>
            </div>
            <div>
              <span className="font-medium text-foreground">Residente</span>
              <p className="text-muted-foreground">{r.ragazzo_residente}</p>
            </div>
            <div>
              <span className="font-medium text-foreground">Indirizzo</span>
              <p className="text-muted-foreground">{r.ragazzo_indirizzo}</p>
            </div>
            <div>
              <span className="font-medium text-foreground">Telefono</span>
              <p className="text-muted-foreground">{r.recapiti_telefonici}</p>
            </div>
            <div>
              <span className="font-medium text-foreground">Email</span>
              <p className="text-muted-foreground">{r.email}</p>
            </div>
          </div>

          <div className="border-t pt-3">
            <h4 className="font-semibold text-sm mb-2">Genitore / Tutore</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div>
                <span className="font-medium text-foreground">Qualità</span>
                <p className="text-muted-foreground capitalize">{r.genitore_qualita}</p>
              </div>
              <div>
                <span className="font-medium text-foreground">Nome e Cognome</span>
                <p className="text-muted-foreground">{r.genitore_nome} {r.genitore_cognome}</p>
              </div>
            </div>
          </div>

          <div className="border-t pt-3">
            <h4 className="font-semibold text-sm mb-2">Allergie e Patologie</h4>
            {r.ha_allergie ? (
              <div className="space-y-2">
                <Badge variant="destructive" className="text-xs">⚠️ ALLERGIE/PATOLOGIE</Badge>
                {r.allergie_dettaglio && (
                  <p className="text-sm text-destructive">Allergie/Intolleranze: {r.allergie_dettaglio}</p>
                )}
                {r.patologie_dettaglio && (
                  <p className="text-sm text-destructive">Patologie: {r.patologie_dettaglio}</p>
                )}
                <FarmacoLine nome={r.farmaco_1_nome} posologia={r.farmaco_1_posologia} />
                <FarmacoLine nome={r.farmaco_2_nome} posologia={r.farmaco_2_posologia} />
                <FarmacoLine nome={r.farmaco_3_nome} posologia={r.farmaco_3_posologia} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nessuna allergia o patologia segnalata.</p>
            )}
          </div>

          <div className="border-t pt-3">
            <h4 className="font-semibold text-sm mb-2">Altro</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div>
                <span className="font-medium text-foreground">Liberatoria foto</span>
                <p className="text-muted-foreground">{r.liberatoria_foto ? 'Sì' : 'No'}</p>
              </div>
              <div>
                <span className="font-medium text-foreground">Firma</span>
                <p className="text-muted-foreground">{r.firma_nome} — {format(new Date(r.firma_data), 'dd/MM/yyyy')}</p>
              </div>
              {r.secondo_figlio && (
                <div className="col-span-2">
                  <span className="font-medium text-foreground">Secondo figlio</span>
                  <p className="text-muted-foreground">{r.secondo_figlio}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function TurnoPage() {
  const { turnoSlug } = useParams<{ turnoSlug: string }>();
  const { user, isAdmin } = useAuth();
  const { data: myPerms = [], isLoading: permsLoading } = useMyTurnoPermissions();
  const queryClient = useQueryClient();
  const [selectedRagazzo, setSelectedRagazzo] = useState<any>(null);

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
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Badge variant="secondary">{iscrizioni.length} ragazzi iscritti</Badge>
        </div>

        {iscrizioniLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : iscrizioni.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">Nessun ragazzo iscritto per questo turno.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {iscrizioni.map((r: any) => (
              <RagazzoCompactCard key={r.id} r={r} onClick={() => setSelectedRagazzo(r)} />
            ))}
          </div>
        )}

        <RagazzoDetailDialog
          r={selectedRagazzo}
          open={!!selectedRagazzo}
          onOpenChange={(v) => { if (!v) setSelectedRagazzo(null); }}
        />
      </div>
    </MainLayout>
  );
}
