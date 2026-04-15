import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface StaffAccount {
  id: string;
  animatore_id: string;
  user_id: string;
  email: string;
  full_name: string;
  generated_password: string;
  created_at: string;
}

export function useStaffAccounts() {
  return useQuery({
    queryKey: ['staff-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_accounts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as StaffAccount[];
    },
  });
}

export function useResetStaffPassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('reset-staff-password', {
        body: { userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { password: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-accounts'] });
      toast({
        title: 'Password resettata',
        description: 'La nuova password è stata generata con successo',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: error.message,
      });
    },
  });
}
