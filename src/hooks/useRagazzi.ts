import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Ragazzo {
  id: string;
  full_name: string;
  data_nascita: string | null;
  residente_altavilla: boolean;
  archiviato: boolean;
  ha_allergie: boolean;
  allergie_dettaglio: string | null;
  patologie_dettaglio: string | null;
  farmaco_1_nome: string | null;
  farmaco_1_posologia: string | null;
  farmaco_2_nome: string | null;
  farmaco_2_posologia: string | null;
  farmaco_3_nome: string | null;
  farmaco_3_posologia: string | null;
  created_at: string;
  updated_at: string;
}

export interface RagazzoGenitore {
  id: string;
  ragazzo_id: string;
  nome_cognome: string;
  ruolo: string;
  email: string | null;
  telefono: string | null;
}

export interface RagazzoIscrizione {
  id: string;
  ragazzo_id: string;
  anno: number;
  turno: string;
  created_at: string;
}

export interface RagazzoCompleto extends Ragazzo {
  genitori: RagazzoGenitore[];
  iscrizioni: RagazzoIscrizione[];
}

export function formatDataNascita(dateStr: string | null): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

export function useRagazzi() {
  return useQuery({
    queryKey: ['ragazzi'],
    queryFn: async (): Promise<RagazzoCompleto[]> => {
      const { data: ragazzi, error: rErr } = await supabase
        .from('ragazzi')
        .select('*')
        .order('full_name');
      if (rErr) throw rErr;

      const { data: genitori, error: gErr } = await supabase
        .from('ragazzi_genitori')
        .select('*');
      if (gErr) throw gErr;

      const { data: iscrizioni, error: iErr } = await supabase
        .from('ragazzi_iscrizioni')
        .select('*')
        .order('anno', { ascending: false });
      if (iErr) throw iErr;

      return (ragazzi as Ragazzo[]).map((r) => ({
        ...r,
        genitori: (genitori as RagazzoGenitore[]).filter((g) => g.ragazzo_id === r.id),
        iscrizioni: (iscrizioni as RagazzoIscrizione[]).filter((i) => i.ragazzo_id === r.id),
      }));
    },
  });
}

export function useUpdateRagazzo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      id: string;
      full_name: string;
      data_nascita: string | null;
      residente_altavilla: boolean;
      ha_allergie: boolean;
      allergie_dettaglio: string | null;
      patologie_dettaglio: string | null;
      farmaco_1_nome: string | null;
      farmaco_1_posologia: string | null;
      farmaco_2_nome: string | null;
      farmaco_2_posologia: string | null;
      farmaco_3_nome: string | null;
      farmaco_3_posologia: string | null;
      genitori: { nome_cognome: string; ruolo: string; email: string | null; telefono: string | null }[];
    }) => {
      const { error: rErr } = await supabase
        .from('ragazzi')
        .update({
          full_name: data.full_name,
          data_nascita: data.data_nascita,
          residente_altavilla: data.residente_altavilla,
          ha_allergie: data.ha_allergie,
          allergie_dettaglio: data.allergie_dettaglio,
          patologie_dettaglio: data.patologie_dettaglio,
          farmaco_1_nome: data.farmaco_1_nome,
          farmaco_1_posologia: data.farmaco_1_posologia,
          farmaco_2_nome: data.farmaco_2_nome,
          farmaco_2_posologia: data.farmaco_2_posologia,
          farmaco_3_nome: data.farmaco_3_nome,
          farmaco_3_posologia: data.farmaco_3_posologia,
        })
        .eq('id', data.id);
      if (rErr) throw rErr;

      await supabase.from('ragazzi_genitori').delete().eq('ragazzo_id', data.id);
      if (data.genitori.length > 0) {
        const { error: gErr } = await supabase.from('ragazzi_genitori').insert(
          data.genitori.map((g) => ({ ...g, ragazzo_id: data.id }))
        );
        if (gErr) throw gErr;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ragazzi'] }),
  });
}

export function useArchiveRagazzo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, archiviato }: { id: string; archiviato: boolean }) => {
      const { error } = await supabase
        .from('ragazzi')
        .update({ archiviato } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ragazzi'] }),
  });
}

export function useDeleteRagazzo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Delete children first
      await supabase.from('ragazzi_iscrizioni').delete().eq('ragazzo_id', id);
      await supabase.from('ragazzi_genitori').delete().eq('ragazzo_id', id);
      const { error } = await supabase.from('ragazzi').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ragazzi'] }),
  });
}

export function useAddIscrizione() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { ragazzo_id: string; anno: number; turno: string }) => {
      const { error } = await supabase.from('ragazzi_iscrizioni').insert(data);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ragazzi'] }),
  });
}

export function useDeleteIscrizione() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ragazzi_iscrizioni').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ragazzi'] }),
  });
}

// Submit preiscrizione from public form (works as anon)
export async function submitPreiscrizione(data: {
  fullName: string;
  dataNascita: string;
  turno: string;
  residenteAltavilla: boolean;
  genitore1: { nomeCognome: string; ruolo: string; email: string; telefono: string };
  genitore2?: { nomeCognome: string; ruolo: string; email: string; telefono: string };
}) {
  // 1. Check if ragazzo already exists
  const { data: existing } = await supabase
    .from('ragazzi')
    .select('id')
    .eq('full_name', data.fullName)
    .maybeSingle();

  let ragazzoId: string;

  if (existing) {
    ragazzoId = existing.id;
    await supabase
      .from('ragazzi')
      .update({
        data_nascita: data.dataNascita,
        residente_altavilla: data.residenteAltavilla,
      })
      .eq('id', ragazzoId);
  } else {
    const { data: newRagazzo, error } = await supabase
      .from('ragazzi')
      .insert({
        full_name: data.fullName,
        data_nascita: data.dataNascita,
        residente_altavilla: data.residenteAltavilla,
      })
      .select('id')
      .single();
    if (error) throw error;
    ragazzoId = newRagazzo.id;
  }

  if (existing) {
    await supabase.from('ragazzi_genitori').delete().eq('ragazzo_id', ragazzoId);
  }

  const genitoriToInsert = [
    {
      ragazzo_id: ragazzoId,
      nome_cognome: data.genitore1.nomeCognome,
      ruolo: data.genitore1.ruolo,
      email: data.genitore1.email,
      telefono: data.genitore1.telefono,
    },
  ];

  if (data.genitore2?.nomeCognome) {
    genitoriToInsert.push({
      ragazzo_id: ragazzoId,
      nome_cognome: data.genitore2.nomeCognome,
      ruolo: data.genitore2.ruolo,
      email: data.genitore2.email,
      telefono: data.genitore2.telefono,
    });
  }

  const { error: gErr } = await supabase.from('ragazzi_genitori').insert(genitoriToInsert);
  if (gErr) throw gErr;

  const anno = new Date().getFullYear();
  const { data: existingIscrizione } = await supabase
    .from('ragazzi_iscrizioni')
    .select('id')
    .eq('ragazzo_id', ragazzoId)
    .eq('anno', anno)
    .maybeSingle();

  if (existingIscrizione) {
    await supabase
      .from('ragazzi_iscrizioni')
      .update({ turno: data.turno })
      .eq('id', existingIscrizione.id);
  } else {
    const { error: iErr } = await supabase.from('ragazzi_iscrizioni').insert({
      ragazzo_id: ragazzoId,
      anno,
      turno: data.turno,
    });
    if (iErr) throw iErr;
  }
}
