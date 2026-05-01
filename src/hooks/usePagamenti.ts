import { useEffect } from 'react';
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
  importo_dovuto: number;
  importo_pagato: number;
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
  genitore_qualita: string;
  turno: string;
  email: string;
  recapiti_telefonici: string;
  stato_pagamento: PaymentStatus;
  note_pagamento: string | null;
  importo_dovuto: number;
  importo_pagato: number;
  pagamento_id: string | null;
  is_famiglia?: boolean;
}

export interface ReminderLog {
  id: string;
  iscrizione_id: string;
  inviato_da: string;
  inviato_da_nome: string;
  stato_al_momento: string;
  note_al_momento: string | null;
  created_at: string;
}

export function useIscrizioniConPagamenti() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('pagamenti-iscrizioni-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'iscrizioni' }, () => {
        queryClient.invalidateQueries({ queryKey: ['iscrizioni-con-pagamenti'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pagamenti' }, () => {
        queryClient.invalidateQueries({ queryKey: ['iscrizioni-con-pagamenti'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'iscrizioni_famiglie' }, () => {
        queryClient.invalidateQueries({ queryKey: ['iscrizioni-con-pagamenti'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pagamenti_famiglie' }, () => {
        queryClient.invalidateQueries({ queryKey: ['iscrizioni-con-pagamenti'] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return useQuery({
    queryKey: ['iscrizioni-con-pagamenti'],
    queryFn: async () => {
      const { data: iscrizioni, error: iscErr } = await supabase
        .from('iscrizioni')
        .select('id, ragazzo_nome, ragazzo_cognome, genitore_nome, genitore_cognome, genitore_qualita, turno, email, recapiti_telefonici')
        .order('ragazzo_cognome', { ascending: true })
        .order('ragazzo_nome', { ascending: true });

      if (iscErr) throw iscErr;

      const { data: pagamenti, error: pagErr } = await supabase
        .from('pagamenti')
        .select('*');

      if (pagErr) throw pagErr;

      const pagamentiMap = new Map<string, any>();
      (pagamenti || []).forEach((p: any) => {
        pagamentiMap.set(p.iscrizione_id, p);
      });

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

      const standard: IscrizioneConPagamento[] = (iscrizioni || []).map((i: any) => {
        const p = pagamentiMap.get(i.id);
        return {
          ...i,
          stato_pagamento: p?.stato || 'da_pagare',
          note_pagamento: p?.note || null,
          importo_dovuto: p?.importo_dovuto ?? 250,
          importo_pagato: p?.importo_pagato ?? 0,
          pagamento_id: p?.id || null,
          is_famiglia: false,
        };
      });

      // ===== Famiglie =====
      const { data: famiglie } = await (supabase as any)
        .from('iscrizioni_famiglie')
        .select('*')
        .order('cognome', { ascending: true })
        .order('nome', { ascending: true });

      const { data: pagFam } = await (supabase as any).from('pagamenti_famiglie').select('*');
      const pagFamMap = new Map<string, any>();
      (pagFam || []).forEach((p: any) => pagFamMap.set(p.iscrizione_id, p));

      const missingFam = (famiglie || []).filter((i: any) => !pagFamMap.has(i.id));
      if (missingFam.length > 0) {
        const { data: newPag } = await (supabase as any)
          .from('pagamenti_famiglie')
          .insert(missingFam.map((i: any) => ({ iscrizione_id: i.id })))
          .select();
        (newPag || []).forEach((p: any) => pagFamMap.set(p.iscrizione_id, p));
      }

      const famigliePag: IscrizioneConPagamento[] = (famiglie || []).map((i: any) => {
        const p = pagFamMap.get(i.id);
        const recapiti = Array.isArray(i.recapiti_telefonici)
          ? i.recapiti_telefonici.map((r: any) => `${r.nome}: ${r.telefono}`).join(' | ')
          : '';
        return {
          id: i.id,
          ragazzo_nome: i.nome,
          ragazzo_cognome: i.cognome,
          genitore_nome: '',
          genitore_cognome: '',
          genitore_qualita: 'Famiglia',
          turno: 'Turno famiglie',
          email: i.email,
          recapiti_telefonici: recapiti,
          stato_pagamento: p?.stato || 'da_pagare',
          note_pagamento: p?.note || null,
          importo_dovuto: p?.importo_dovuto ?? 0,
          importo_pagato: p?.importo_pagato ?? 0,
          pagamento_id: p?.id || null,
          is_famiglia: true,
        };
      });

      return [...standard, ...famigliePag];
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

export function useUpdatePagamento() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ iscrizioneId, stato, note, importo_dovuto, importo_pagato, isFamiglia }: {
      iscrizioneId: string;
      stato: PaymentStatus;
      note?: string | null;
      importo_dovuto?: number;
      importo_pagato?: number;
      isFamiglia?: boolean;
    }) => {
      const tableName = isFamiglia ? 'pagamenti_famiglie' : 'pagamenti';
      const client = supabase as any;

      const { data: existing } = await client
        .from(tableName)
        .select('id')
        .eq('iscrizione_id', iscrizioneId)
        .maybeSingle();

      const updateData: any = { stato, note: note ?? null, updated_by: user?.id ?? null };
      if (importo_dovuto !== undefined) updateData.importo_dovuto = importo_dovuto;
      if (importo_pagato !== undefined) updateData.importo_pagato = importo_pagato;

      if (existing) {
        const { error } = await client
          .from(tableName)
          .update(updateData)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await client
          .from(tableName)
          .insert({ iscrizione_id: iscrizioneId, ...updateData });
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

export function useReminderLogs(iscrizioneId: string | null) {
  return useQuery({
    queryKey: ['reminder-logs', iscrizioneId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pagamento_reminder_logs' as any)
        .select('*')
        .eq('iscrizione_id', iscrizioneId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ReminderLog[];
    },
    enabled: !!iscrizioneId,
  });
}

export function useSendReminder() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (item: IscrizioneConPagamento) => {
      const noteText = item.stato_pagamento === 'parziale'
        ? `Già pagato: ${item.importo_pagato}€ su ${item.importo_dovuto}€`
        : null;

      const payload = {
        ragazzo_nome: `${item.ragazzo_nome} ${item.ragazzo_cognome}`,
        genitore_nome: `${item.genitore_nome} ${item.genitore_cognome}`,
        genitore_qualita: item.genitore_qualita,
        turno: item.turno,
        stato_pagamento: item.stato_pagamento,
        note: noteText,
        importo_dovuto: item.importo_dovuto,
        importo_pagato: item.importo_pagato,
        email: item.email,
      };

      // Call the edge function
      const { data, error } = await supabase.functions.invoke('notify-pagamento-reminder', {
        body: payload,
      });

      if (error) throw error;

      // Log the reminder
      const { error: logErr } = await supabase
        .from('pagamento_reminder_logs' as any)
        .insert({
          iscrizione_id: item.id,
          inviato_da: user?.id,
          inviato_da_nome: profile?.full_name || 'Sconosciuto',
          stato_al_momento: item.stato_pagamento,
          note_al_momento: noteText,
        });

      if (logErr) throw logErr;

      return data;
    },
    onSuccess: (_, item) => {
      queryClient.invalidateQueries({ queryKey: ['reminder-logs', item.id] });
      toast.success('Reminder inviato con successo');
    },
    onError: (error: Error) => {
      toast.error('Errore invio reminder: ' + error.message);
    },
  });
}
