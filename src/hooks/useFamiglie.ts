import { useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type RecapitoTel = { nome: string; telefono: string };

export interface IscrizioneFamiglia {
  id: string;
  created_at: string;
  email: string;
  nome: string;
  cognome: string;
  residente_a: string;
  via: string;
  recapiti_telefonici: RecapitoTel[];
  tipo_periodo: '7_giorni' | '10_giorni' | '15_giorni' | 'personalizzato';
  data_inizio: string;
  data_fine: string;
  num_adulti: number;
  figlio_1_over10: boolean;
  figlio_2_over10: boolean;
  figlio_3_over10: boolean;
  num_4_10_anni: number;
  num_0_3_anni: number;
  num_animali: number;
  acconto_versato: number;
  regolamento_accettato: boolean;
  firma_data: string;
  firma_nome_cognome: string;
  turno: string;
  archiviato: boolean;
}

export const TIPO_PERIODO_LABEL: Record<IscrizioneFamiglia['tipo_periodo'], string> = {
  '7_giorni': '7 giorni (08/08–15/08)',
  '10_giorni': '10 giorni (08/08–19/08)',
  '15_giorni': '15 giorni (08/08–22/08)',
  'personalizzato': 'Periodo personalizzato',
};

export function useIscrizioniFamiglie() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('iscrizioni-famiglie-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'iscrizioni_famiglie' }, () => {
        queryClient.invalidateQueries({ queryKey: ['iscrizioni-famiglie'] });
        queryClient.invalidateQueries({ queryKey: ['iscrizioni-con-pagamenti'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return useQuery({
    queryKey: ['iscrizioni-famiglie'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('iscrizioni_famiglie')
        .select('*')
        .order('cognome', { ascending: true })
        .order('nome', { ascending: true });
      if (error) throw error;
      return (data ?? []) as IscrizioneFamiglia[];
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
}

export function useUpdateIscrizioneFamiglia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<IscrizioneFamiglia> }) => {
      const { error } = await (supabase as any).from('iscrizioni_famiglie').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['iscrizioni-famiglie'] });
      qc.invalidateQueries({ queryKey: ['iscrizioni-con-pagamenti'] });
    },
  });
}

export function useDeleteIscrizioneFamiglia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('iscrizioni_famiglie').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['iscrizioni-famiglie'] });
      qc.invalidateQueries({ queryKey: ['iscrizioni-con-pagamenti'] });
    },
  });
}
