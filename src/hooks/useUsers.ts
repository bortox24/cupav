import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface UserWithRole {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  role: AppRole | null;
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');
      
      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      if (rolesError) throw rolesError;

      // Combine data
      const usersWithRoles: UserWithRole[] = profiles.map(profile => {
        const userRole = roles.find(r => r.user_id === profile.id);
        return {
          ...profile,
          role: userRole?.role || null,
        };
      });

      return usersWithRoles;
    },
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ email, password, fullName, role }: { 
      email: string; 
      password: string; 
      fullName: string;
      role: AppRole;
    }) => {
      // IMPORTANT:
      // Creating a user via auth.signUp() would switch the current session to the new user.
      // We instead call a backend function that creates the auth user + profile + role
      // using privileged credentials, without changing the admin session.
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email,
          password,
          fullName,
          role,
        },
      });

      if (error) throw error;
      if (!data?.user?.id) throw new Error('User creation failed');

      return data.user as { id: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: 'Utente creato',
        description: 'L\'utente è stato creato con successo.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Errore',
        description: 'Impossibile creare l\'utente.',
        variant: 'destructive',
      });
      console.error('Error creating user:', error);
    },
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      // First, try to update existing role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingRole) {
        const { error } = await supabase
          .from('user_roles')
          .update({ role })
          .eq('user_id', userId);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: 'Ruolo aggiornato',
        description: 'Il ruolo dell\'utente è stato modificato con successo.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Errore',
        description: 'Impossibile aggiornare il ruolo.',
        variant: 'destructive',
      });
      console.error('Error updating user role:', error);
    },
  });
}

export function useDeleteUserRole() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: 'Ruolo rimosso',
        description: 'Il ruolo dell\'utente è stato rimosso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Errore',
        description: 'Impossibile rimuovere il ruolo.',
        variant: 'destructive',
      });
      console.error('Error deleting user role:', error);
    },
  });
}
