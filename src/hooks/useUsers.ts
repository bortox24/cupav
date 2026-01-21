import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface UserWithStatus {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  is_active: boolean;
  is_admin: boolean;
}

// Fetch all users with their admin status and active status
export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at, is_active')
        .order('created_at', { ascending: false });
      
      if (profilesError) throw profilesError;
      
      // Fetch all admin roles
      const { data: adminRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('role', 'admin');
      
      if (rolesError) throw rolesError;
      
      const adminUserIds = new Set(adminRoles?.map(r => r.user_id) || []);
      
      return (profiles || []).map(profile => ({
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        created_at: profile.created_at,
        is_active: profile.is_active,
        is_admin: adminUserIds.has(profile.id),
      })) as UserWithStatus[];
    },
  });
}

// Create a new user (via edge function)
export function useCreateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ email, password, fullName, isAdmin }: { 
      email: string; 
      password: string; 
      fullName: string;
      isAdmin: boolean;
    }) => {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: { email, password, fullName, isAdmin },
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data as { user: { id: string } };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: 'Utente creato',
        description: 'Il nuovo utente è stato creato con successo',
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

// Toggle admin status for a user
export function useToggleAdmin() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, isAdmin }: { userId: string; isAdmin: boolean }) => {
      if (isAdmin) {
        // Add admin role
        const { error } = await supabase
          .from('user_roles')
          .upsert({ 
            user_id: userId, 
            role: 'admin' as const
          }, { 
            onConflict: 'user_id' 
          });
        
        if (error) throw error;
      } else {
        // Remove admin role
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId);
        
        if (error) throw error;
      }
    },
    onSuccess: (_, { isAdmin }) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: isAdmin ? 'Promosso ad Admin' : 'Rimosso da Admin',
        description: isAdmin 
          ? 'L\'utente ora ha accesso amministratore' 
          : 'L\'utente non è più amministratore',
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

// Toggle active status for a user
export function useToggleActive() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: isActive })
        .eq('id', userId);
      
      if (error) throw error;
    },
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: isActive ? 'Account attivato' : 'Account disattivato',
        description: isActive 
          ? 'L\'utente può ora accedere' 
          : 'L\'utente non può più accedere',
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
