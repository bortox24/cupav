import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Ragazzo {
  id: string;
  full_name: string;
  data_nascita: string | null;
  residente_altavilla: boolean;
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
    // Update ragazzo data
    await supabase
      .from('ragazzi')
      .update({
        data_nascita: data.dataNascita,
        residente_altavilla: data.residenteAltavilla,
      })
      .eq('id', ragazzoId);
  } else {
    // Create new ragazzo
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

  // 2. Upsert genitori - delete existing and re-insert
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

  // 3. Upsert iscrizione for current year
  const anno = 2026;
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
