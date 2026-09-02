import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const COSTO_FESTA_ADULTO = 15;
export const COSTO_FESTA_RAGAZZO = 10;
export const COSTO_FESTA_STAFF = 10;

export interface AllergiaRiga {
  nome: string;
  quantita: number;
}

export interface FestaCampeggio {
  id: string;
  created_at: string;
  updated_at: string;
  nome: string;
  cognome: string;
  email: string;
  telefono: string | null;
  num_adulti: number;
  num_ragazzi: number;
  num_staff: number;
  contributo: number;
  arrivato: boolean;
  arrivato_da: string | null;
  arrivato_at: string | null;
  pagato: boolean;
  pagato_da: string | null;
  pagato_at: string | null;
  firma_nome_cognome: string;
  firma_data: string;
  ha_allergie: boolean;
  allergie: AllergiaRiga[] | null;
}

export function parseAllergie(value: unknown): AllergiaRiga[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((r: any) => ({ nome: String(r?.nome ?? '').trim(), quantita: Number(r?.quantita ?? 0) }))
    .filter(r => r.nome && r.quantita > 0);
}

export function totalePersoneAllergiche(value: unknown): number {
  return parseAllergie(value).reduce((s, r) => s + r.quantita, 0);
}

export function calcolaContributoFesta(numAdulti: number, numRagazzi: number, numStaff: number) {
  return numAdulti * COSTO_FESTA_ADULTO + numRagazzi * COSTO_FESTA_RAGAZZO + numStaff * COSTO_FESTA_STAFF;
}

export function useFestaCampeggio() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('festa-campeggio-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'festa_campeggio' }, () => {
        queryClient.invalidateQueries({ queryKey: ['festa-campeggio'] });
        queryClient.invalidateQueries({ queryKey: ['festa-campeggio-count'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return useQuery({
    queryKey: ['festa-campeggio'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('festa_campeggio')
        .select('*')
        .order('cognome', { ascending: true })
        .order('nome', { ascending: true });
      if (error) throw error;
      return (data ?? []) as FestaCampeggio[];
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
}

export function useCreateFestaCampeggio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<FestaCampeggio>) => {
      const { data, error } = await (supabase as any)
        .from('festa_campeggio')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as FestaCampeggio;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['festa-campeggio'] });
      queryClient.invalidateQueries({ queryKey: ['festa-campeggio-count'] });
    },
  });
}

export function useUpdateFestaCampeggio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<FestaCampeggio> }) => {
      const { error } = await (supabase as any).from('festa_campeggio').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['festa-campeggio'] }),
  });
}

export function useDeleteFestaCampeggio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('festa_campeggio').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['festa-campeggio'] });
      queryClient.invalidateQueries({ queryKey: ['festa-campeggio-count'] });
    },
  });
}
