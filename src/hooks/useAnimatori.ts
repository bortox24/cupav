import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export interface Animatore {
  id: string;
  full_name: string;
  email: string | null;
  telefono: string | null;
  data_nascita: string | null;
  note: string | null;
  archiviato: boolean;
  created_at: string;
  updated_at: string;
}

export interface AnimatoreTurno {
  id: string;
  animatore_id: string;
  turno: string;
  anno: number;
  assegnato_da: string | null;
  created_at: string;
}

export interface AnimatoreCompleto extends Animatore {
  turni: AnimatoreTurno[];
}

export function useAnimatori() {
  return useQuery({
    queryKey: ['animatori'],
    queryFn: async (): Promise<AnimatoreCompleto[]> => {
      const { data: animatori, error: aErr } = await supabase
        .from('animatori' as any)
        .select('*')
        .order('full_name');
      if (aErr) throw aErr;

      const { data: turni, error: tErr } = await supabase
        .from('animatori_turni' as any)
        .select('*')
        .order('anno', { ascending: false });
      if (tErr) throw tErr;

      return ((animatori ?? []) as any[]).map((a) => ({
        ...a,
        turni: ((turni ?? []) as any[]).filter((t) => t.animatore_id === a.id),
      }));
    },
  });
}

export function useAnimatoriByTurno(turno: string, anno?: number) {
  const currentYear = anno ?? new Date().getFullYear();
  return useQuery({
    queryKey: ['animatori-turno', turno, currentYear],
    queryFn: async () => {
      const { data: assignments, error: atErr } = await supabase
        .from('animatori_turni' as any)
        .select('*')
        .eq('turno', turno)
        .eq('anno', currentYear);
      if (atErr) throw atErr;

      if (!assignments || assignments.length === 0) return [];

      const ids = (assignments as any[]).map((a) => a.animatore_id);
      const { data: animatori, error: aErr } = await supabase
        .from('animatori' as any)
        .select('*')
        .in('id', ids);
      if (aErr) throw aErr;

      return ((animatori ?? []) as any[]).map((a) => ({
        ...a,
        turni: (assignments as any[]).filter((t) => t.animatore_id === a.id),
      })) as AnimatoreCompleto[];
    },
    enabled: !!turno,
  });
}

export function useAddAnimatore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { full_name: string; email?: string; telefono?: string; data_nascita?: string; note?: string }) => {
      const { error } = await supabase.from('animatori' as any).insert({
        full_name: data.full_name,
        email: data.email || null,
        telefono: data.telefono || null,
        data_nascita: data.data_nascita || null,
        note: data.note || null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['animatori'] }),
  });
}

export function useUpdateAnimatore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: string; full_name: string; email?: string | null; telefono?: string | null; data_nascita?: string | null; note?: string | null }) => {
      const { error } = await supabase
        .from('animatori' as any)
        .update({
          full_name: data.full_name,
          email: data.email || null,
          telefono: data.telefono || null,
          data_nascita: data.data_nascita || null,
          note: data.note || null,
        })
        .eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['animatori'] }),
  });
}

export function useArchiveAnimatore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, archiviato }: { id: string; archiviato: boolean }) => {
      const { error } = await supabase
        .from('animatori' as any)
        .update({ archiviato })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['animatori'] }),
  });
}

export function useDeleteAnimatore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('animatori' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['animatori'] }),
  });
}

export function useAssignAnimatoreTurno() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ animatore_id, turno, anno }: { animatore_id: string; turno: string; anno?: number }) => {
      const { error } = await supabase.from('animatori_turni' as any).insert({
        animatore_id,
        turno,
        anno: anno ?? new Date().getFullYear(),
        assegnato_da: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['animatori'] });
      qc.invalidateQueries({ queryKey: ['animatori-turno'] });
    },
  });
}

export function useRemoveAnimatoreTurno() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('animatori_turni' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['animatori'] });
      qc.invalidateQueries({ queryKey: ['animatori-turno'] });
    },
  });
}
