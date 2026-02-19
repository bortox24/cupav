import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

export type PaymentStatus = 'da_pagare' | 'parziale' | 'pagato';

export interface Pagamento {
  id: string;
  iscrizione_id: string;
  stato: PaymentStatus;
  note: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface IscrizioneConPagamento {
  id: string;
  ragazzo_nome: string;
  ragazzo_cognome: string;
  genitore_nome: string;
  genitore_cognome: string;
  turno: string;
  email: string;
  recapiti_telefonici: string;
  stato_pagamento: PaymentStatus;
  note_pagamento: string | null;
  pagamento_id: string | null;
}

export function useIscrizioniConPagamenti() {
  return useQuery({
    queryKey: ['iscrizioni-con-pagamenti'],
    queryFn: async () => {
      // Fetch iscrizioni
      const { data: iscrizioni, error: iscErr } = await supabase
        .from('iscrizioni')
        .select('id, ragazzo_nome, ragazzo_cognome, genitore_nome, genitore_cognome, turno, email, recapiti_telefonici')
        .order('ragazzo_cognome', { ascending: true })
        .order('ragazzo_nome', { ascending: true });

      if (iscErr) throw iscErr;

      // Fetch existing pagamenti
      const { data: pagamenti, error: pagErr } = await supabase
        .from('pagamenti')
        .select('*');

      if (pagErr) throw pagErr;

      const pagamentiMap = new Map<string, any>();
      (pagamenti || []).forEach((p: any) => {
        pagamentiMap.set(p.iscrizione_id, p);
      });

      // Auto-create missing pagamenti records
      const missing = (iscrizioni || []).filter(i => !pagamentiMap.has(i.id));
      if (missing.length > 0) {
        const { data: newPagamenti, error: insertErr } = await supabase
          .from('pagamenti')
          .insert(missing.map(i => ({ iscrizione_id: i.id })))
          .select();

        if (!insertErr && newPagamenti) {
          newPagamenti.forEach((p: any) => {
            pagamentiMap.set(p.iscrizione_id, p);
          });
        }
      }

      return (iscrizioni || []).map((i: any): IscrizioneConPagamento => {
        const p = pagamentiMap.get(i.id);
        return {
          ...i,
          stato_pagamento: p?.stato || 'da_pagare',
          note_pagamento: p?.note || null,
          pagamento_id: p?.id || null,
        };
      });
    },
  });
}

export function useUpdatePagamento() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ iscrizioneId, stato, note }: { iscrizioneId: string; stato: PaymentStatus; note?: string | null }) => {
      // Upsert
      const { data: existing } = await supabase
        .from('pagamenti')
        .select('id')
        .eq('iscrizione_id', iscrizioneId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('pagamenti')
          .update({ stato, note: note ?? null, updated_by: user?.id ?? null })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('pagamenti')
          .insert({ iscrizione_id: iscrizioneId, stato, note: note ?? null, updated_by: user?.id ?? null });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iscrizioni-con-pagamenti'] });
    },
    onError: (error: Error) => {
      toast.error('Errore aggiornamento pagamento: ' + error.message);
    },
  });
}
