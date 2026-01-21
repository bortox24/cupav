import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type TransactionType = Database['public']['Enums']['transaction_type'];

interface TransactionInsert {
  causale: string;
  importo: number;
  data_transazione: string;
  tipologia: TransactionType;
  category_id: string | null;
}

interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  userId?: string;
  tipologia?: TransactionType;
}

export function useTransactions(filters?: TransactionFilters) {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: async () => {
      let query = supabase
        .from('transactions')
        .select(`
          *,
          category:categories(id, name, type),
          profile:profiles!transactions_user_id_fkey(full_name, email)
        `)
        .order('data_transazione', { ascending: false });
      
      if (filters?.startDate) {
        query = query.gte('data_transazione', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('data_transazione', filters.endDate);
      }
      if (filters?.categoryId) {
        query = query.eq('category_id', filters.categoryId);
      }
      if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters?.tipologia) {
        query = query.eq('tipologia', filters.tipologia);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (transaction: TransactionInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('transactions')
        .insert({
          ...transaction,
          user_id: user.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({
        title: 'Transazione registrata',
        description: 'La transazione è stata salvata con successo.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Errore',
        description: 'Impossibile registrare la transazione.',
        variant: 'destructive',
      });
      console.error('Error creating transaction:', error);
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...transaction }: TransactionInsert & { id: string }) => {
      const { data, error } = await supabase
        .from('transactions')
        .update(transaction)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({
        title: 'Transazione aggiornata',
        description: 'La transazione è stata modificata con successo.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Errore',
        description: 'Impossibile aggiornare la transazione.',
        variant: 'destructive',
      });
      console.error('Error updating transaction:', error);
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({
        title: 'Transazione eliminata',
        description: 'La transazione è stata rimossa con successo.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Errore',
        description: 'Impossibile eliminare la transazione.',
        variant: 'destructive',
      });
      console.error('Error deleting transaction:', error);
    },
  });
}
