import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from '@/hooks/use-toast';

export interface TurnoInfo {
  value: string; // valore in DB (es. "4° Elementare")
  label: string; // label UI (es. "4^ Elementare")
  slug: string;  // slug per URL (es. "4-elementare")
}

export const TURNI: TurnoInfo[] = [
  { value: '4° Elementare', label: '4^ Elementare', slug: '4-elementare' },
  { value: '5° Elementare', label: '5^ Elementare', slug: '5-elementare' },
  { value: '1° Media', label: '1^ Media', slug: '1-media' },
  { value: '2° Media', label: '2^ Media', slug: '2-media' },
  { value: '3° Media', label: '3^ Media', slug: '3-media' },
];

export interface TurnoPermission {
  id: string;
  user_id: string;
  turno: string;
  created_at: string;
  assegnato_da: string | null;
}

// Current user's turno permissions
export function useMyTurnoPermissions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-turno-permissions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await (supabase as any)
        .from('turno_permessi')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return (data ?? []) as TurnoPermission[];
    },
    enabled: !!user?.id,
  });
}

// Admin: all turno permissions for all users
export function useAllTurnoPermissions() {
  return useQuery({
    queryKey: ['all-turno-permissions'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('turno_permessi')
        .select('*');
      if (error) throw error;
      return (data ?? []) as TurnoPermission[];
    },
  });
}

// Admin: insert turno permission
export function useSetTurnoPermission() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ userId, turno }: { userId: string; turno: string }) => {
      const { error } = await (supabase as any)
        .from('turno_permessi')
        .insert({ user_id: userId, turno, assegnato_da: user?.id ?? null });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-turno-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['my-turno-permissions'] });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Errore', description: error.message });
    },
  });
}

// Admin: remove turno permission
export function useRemoveTurnoPermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, turno }: { userId: string; turno: string }) => {
      const { error } = await (supabase as any)
        .from('turno_permessi')
        .delete()
        .eq('user_id', userId)
        .eq('turno', turno);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-turno-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['my-turno-permissions'] });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Errore', description: error.message });
    },
  });
}

// Admin: reset all turno permissions for a user
export function useResetUserTurnoPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await (supabase as any)
        .from('turno_permessi')
        .delete()
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-turno-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['my-turno-permissions'] });
    },
  });
}
