import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import type { TariffaFamiglia } from '@/lib/tariffeFamiglie';

export function useTariffeFamiglie() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('tariffe-famiglie-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tariffe_famiglie' }, () => {
        queryClient.invalidateQueries({ queryKey: ['tariffe-famiglie'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return useQuery({
    queryKey: ['tariffe-famiglie'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('tariffe_famiglie')
        .select('*')
        .order('categoria', { ascending: true });
      if (error) throw error;
      return (data ?? []) as TariffaFamiglia[];
    },
    staleTime: 60_000,
  });
}

export function useUpdateTariffaFamiglia() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ categoria, updates }: { categoria: number; updates: Partial<TariffaFamiglia> }) => {
      const { error } = await (supabase as any)
        .from('tariffe_famiglie')
        .update({ ...updates, updated_by: user?.id ?? null })
        .eq('categoria', categoria);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tariffe-famiglie'] });
      qc.invalidateQueries({ queryKey: ['iscrizioni-famiglie'] });
      qc.invalidateQueries({ queryKey: ['iscrizioni-con-pagamenti'] });
    },
  });
}
