import { useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useMyTurnoPermissions, TURNI } from '@/hooks/useTurnoPermissions';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShieldAlert } from 'lucide-react';
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

function RagazzoCard({ r }: { r: any }) {
  return (
    <Card className="border">
      <CardContent className="p-4 space-y-2">
        <h4 className="font-bold text-base">
          {r.ragazzo_nome} {r.ragazzo_cognome}
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-muted-foreground">
          <p>📅 Nato il: {format(new Date(r.ragazzo_data_nascita), 'dd/MM/yyyy')}</p>
          <p>🏠 Comune: {r.ragazzo_residente}</p>
          <p>📞 Tel: {r.recapiti_telefonici}</p>
          <p>👤 {r.genitore_qualita}: {r.genitore_nome} {r.genitore_cognome}</p>
          <p>📧 {r.email}</p>
        </div>

        {r.ha_allergie ? (
          <div className="space-y-1 mt-2">
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
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-300 text-xs">
            ✅ Nessuna allergia
          </Badge>
        )}

        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-1">
          <span>{r.liberatoria_foto ? '📸 Sì' : '📸 No'}</span>
          <span>Iscritto il: {format(new Date(r.created_at), 'dd/MM/yyyy', { locale: it })}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TurnoPage() {
  const { turnoSlug } = useParams<{ turnoSlug: string }>();
  const { user, isAdmin } = useAuth();
  const { data: myPerms = [], isLoading: permsLoading } = useMyTurnoPermissions();
  const queryClient = useQueryClient();

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
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user && hasAccess && !!turnoValue,
  });

  // Count
  const { data: count = 0 } = useQuery({
    queryKey: ['turno-count', turnoValue],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('iscrizioni')
        .select('id', { count: 'exact', head: true })
        .eq('turno', turnoValue);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user && !!turnoValue,
  });

  // Realtime
  useEffect(() => {
    if (!user || !turnoValue) return;
    const channel = supabase
      .channel(`iscrizioni-turno-${turnoSlug}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'iscrizioni' }, () => {
        queryClient.invalidateQueries({ queryKey: ['turno-iscrizioni', turnoValue] });
        queryClient.invalidateQueries({ queryKey: ['turno-count', turnoValue] });
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
          <Badge variant="secondary">{count} ragazzi iscritti</Badge>
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
          <div className="grid gap-3">
            {iscrizioni.map((r: any) => (
              <RagazzoCard key={r.id} r={r} />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
