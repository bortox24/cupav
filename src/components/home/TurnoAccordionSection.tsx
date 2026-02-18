import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useMyTurnoPermissions, TURNI } from '@/hooks/useTurnoPermissions';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Lock, Users } from 'lucide-react';
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

        {/* Allergie */}
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

export default function TurnoAccordionSection() {
  const { user, isAdmin } = useAuth();
  const { data: myPerms = [], isLoading: permsLoading } = useMyTurnoPermissions();
  const queryClient = useQueryClient();

  // Counts for all turni (independent of permissions)
  const { data: counts = {} } = useQuery({
    queryKey: ['turno-counts'],
    queryFn: async () => {
      const result: Record<string, number> = {};
      for (const t of TURNI) {
        const { count, error } = await supabase
          .from('iscrizioni')
          .select('id', { count: 'exact', head: true })
          .eq('turno', t.value);
        if (!error) result[t.value] = count ?? 0;
      }
      return result;
    },
    enabled: !!user,
  });

  const hasTurnoAccess = (turnoValue: string) => {
    if (isAdmin) return true;
    return myPerms.some(p => p.turno === turnoValue);
  };

  const accessibleTurni = TURNI.filter(t => hasTurnoAccess(t.value)).map(t => t.value);

  // Load iscrizioni only for accessible turni
  const { data: iscrizioni = [], isLoading: iscrizioniLoading } = useQuery({
    queryKey: ['turno-iscrizioni', accessibleTurni],
    queryFn: async () => {
      if (accessibleTurni.length === 0) return [];
      const { data, error } = await supabase
        .from('iscrizioni')
        .select('*')
        .in('turno', accessibleTurni)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user && !permsLoading,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('iscrizioni-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'iscrizioni' }, () => {
        queryClient.invalidateQueries({ queryKey: ['turno-iscrizioni'] });
        queryClient.invalidateQueries({ queryKey: ['turno-counts'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  if (!user) return null;

  if (permsLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const openValues = TURNI.filter(t => hasTurnoAccess(t.value)).map(t => t.value);

  return (
    <div>
      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" />
        Iscrizioni per turno
      </h3>
      <Accordion type="multiple" defaultValue={openValues} className="space-y-2">
        {TURNI.map(turno => {
          const hasAccess = hasTurnoAccess(turno.value);
          const count = counts[turno.value] ?? 0;
          const turnoIscrizioni = iscrizioni.filter((i: any) => i.turno === turno.value);

          if (!hasAccess) {
            return (
              <div key={turno.value} className="border rounded-lg px-4 py-4 opacity-70">
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{turno.label}</span>
                  <Badge variant="secondary" className="text-xs">{count} ragazzi iscritti</Badge>
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Non hai i permessi per visualizzare questo turno.
                </p>
              </div>
            );
          }

          return (
            <AccordionItem key={turno.value} value={turno.value} className="border rounded-lg px-4">
              <AccordionTrigger>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{turno.label}</span>
                  <Badge variant="secondary" className="text-xs">{count} ragazzi iscritti</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                {iscrizioniLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : turnoIscrizioni.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    Nessun ragazzo iscritto per questo turno.
                  </p>
                ) : (
                  <div className="grid gap-3">
                    {turnoIscrizioni.map((r: any) => (
                      <RagazzoCard key={r.id} r={r} />
                    ))}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
