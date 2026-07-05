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
  is_active: boolean;
  turni: string[];
}

const CURRENT_YEAR = new Date().getFullYear();

export function useStaffAccounts() {
  return useQuery({
    queryKey: ['staff-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_accounts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const accounts = (data ?? []) as Omit<StaffAccount, 'is_active' | 'turni'>[];

      const userIds = accounts.map((a) => a.user_id).filter(Boolean);
      const animatoreIds = accounts.map((a) => a.animatore_id).filter(Boolean);

      // Fetch active status from profiles
      const profilesById = new Map<string, boolean>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, is_active')
          .in('id', userIds);
        (profiles ?? []).forEach((p) => profilesById.set(p.id, p.is_active ?? true));
      }

      // Fetch assigned turni for current year
      const turniByAnimatore = new Map<string, string[]>();
      if (animatoreIds.length > 0) {
        const { data: turni } = await supabase
          .from('animatori_turni')
          .select('animatore_id, turno, anno')
          .in('animatore_id', animatoreIds)
          .eq('anno', CURRENT_YEAR);
        (turni ?? []).forEach((t) => {
          const list = turniByAnimatore.get(t.animatore_id) ?? [];
          list.push(t.turno);
          turniByAnimatore.set(t.animatore_id, list);
        });
      }

      return accounts.map((a) => ({
        ...a,
        is_active: profilesById.get(a.user_id) ?? true,
        turni: turniByAnimatore.get(a.animatore_id) ?? [],
      })) as StaffAccount[];
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

export function useToggleStaffActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: isActive })
        .eq('id', userId);
      if (error) throw error;
      return { isActive };
    },
    onSuccess: ({ isActive }) => {
      queryClient.invalidateQueries({ queryKey: ['staff-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: isActive ? 'Account attivato' : 'Account disattivato',
        description: isActive
          ? "L'utente può nuovamente accedere alla piattaforma"
          : "L'utente non potrà più accedere con queste credenziali",
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
