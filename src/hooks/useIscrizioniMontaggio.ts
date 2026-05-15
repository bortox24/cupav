import { useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { GiornoMontaggio } from '@/lib/tariffeMontaggio';

export type RecapitoTel = { nome: string; telefono: string };

export interface IscrizioneMontaggio {
  id: string;
  created_at: string;
  email: string;
  nome: string;
  cognome: string;
  residente_a: string;
  via: string;
  recapiti_telefonici: RecapitoTel[];
  giorni_selezionati: GiornoMontaggio[];
  num_adulti: number;
  num_figli_over10: number;
  num_4_10_anni: number;
  num_0_3_anni: number;
  num_notti: number;
  importo_totale_calcolato: number | null;
  firma_nome_cognome: string;
  firma_data: string;
  tariffa_accettata: boolean;
  archiviato: boolean;
  turno: string;
}

export function useIscrizioniMontaggio() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('iscrizioni-montaggio-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'iscrizioni_montaggio' }, () => {
        queryClient.invalidateQueries({ queryKey: ['iscrizioni-montaggio'] });
        queryClient.invalidateQueries({ queryKey: ['turno-montaggio-count'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return useQuery({
    queryKey: ['iscrizioni-montaggio'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('iscrizioni_montaggio')
        .select('*')
        .order('cognome', { ascending: true })
        .order('nome', { ascending: true });
      if (error) throw error;
      return (data ?? []) as IscrizioneMontaggio[];
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
}

export function useUpdateIscrizioneMontaggio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<IscrizioneMontaggio> }) => {
      const { error } = await (supabase as any).from('iscrizioni_montaggio').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['iscrizioni-montaggio'] }),
  });
}

export function useDeleteIscrizioneMontaggio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('iscrizioni_montaggio').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['iscrizioni-montaggio'] }),
  });
}
