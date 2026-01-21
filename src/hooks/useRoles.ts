import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface Role {
  id: string;
  name: string;
  label: string;
  description: string | null;
  color: string;
  is_system: boolean;
  created_at: string;
}

export interface RolePagePermission {
  id: string;
  role_id: string;
  page_path: string;
  can_access: boolean;
  created_at: string;
}

// Hook to get all roles
export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('is_system', { ascending: false })
        .order('name');

      if (error) throw error;
      return data as unknown as Role[];
    },
  });
}

// Hook to get role page permissions
export function useRolePagePermissions() {
  return useQuery({
    queryKey: ['role-page-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_page_permissions')
        .select('*');

      if (error) throw error;
      return data as unknown as RolePagePermission[];
    },
  });
}

// Hook to create a new role
export function useCreateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (role: {
      name: string;
      label: string;
      description?: string;
      color: string;
    }) => {
      const { data, error } = await supabase
        .from('roles')
        .insert(role)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as Role;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast({
        title: 'Successo',
        description: 'Ruolo creato correttamente.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Errore',
        description: 'Impossibile creare il ruolo. Verifica che il nome non sia già in uso.',
        variant: 'destructive',
      });
      console.error('Error creating role:', error);
    },
  });
}

// Hook to update a role
export function useUpdateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      name: string;
      label: string;
      description?: string;
      color: string;
    }) => {
      const { id, ...updates } = params;
      const { error } = await supabase
        .from('roles')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast({
        title: 'Successo',
        description: 'Ruolo aggiornato correttamente.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Errore',
        description: 'Impossibile aggiornare il ruolo.',
        variant: 'destructive',
      });
      console.error('Error updating role:', error);
    },
  });
}

// Hook to delete a role
export function useDeleteRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast({
        title: 'Successo',
        description: 'Ruolo eliminato correttamente.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Errore',
        description: 'Impossibile eliminare il ruolo. Potrebbe essere assegnato a degli utenti.',
        variant: 'destructive',
      });
      console.error('Error deleting role:', error);
    },
  });
}

// Hook to set role page permission
export function useSetRolePagePermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      roleId,
      pagePath,
      canAccess,
    }: {
      roleId: string;
      pagePath: string;
      canAccess: boolean;
    }) => {
      // First try to find existing permission
      const { data: existing } = await supabase
        .from('role_page_permissions')
        .select('id')
        .eq('role_id', roleId)
        .eq('page_path', pagePath)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('role_page_permissions')
          .update({ can_access: canAccess })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('role_page_permissions')
          .insert({
            role_id: roleId,
            page_path: pagePath,
            can_access: canAccess,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-page-permissions'] });
    },
    onError: (error) => {
      toast({
        title: 'Errore',
        description: 'Impossibile aggiornare il permesso.',
        variant: 'destructive',
      });
      console.error('Error updating role page permission:', error);
    },
  });
}

// Available pages for permissions
export const availablePages = [
  { path: '/home', title: 'Home', description: 'Dashboard principale' },
  { path: '/registrazione-spese-prelievi', title: 'Registrazione Transazioni', description: 'Inserisci spese, prelievi ed entrate' },
  { path: '/controllo-spese', title: 'Dashboard Controllo', description: 'Visualizza grafici e statistiche' },
  { path: '/admin/permessi', title: 'Gestione Utenti', description: 'Crea utenti e assegna ruoli' },
  { path: '/admin/categorie', title: 'Gestione Categorie', description: 'Configura le categorie' },
  { path: '/admin/permessi-pagine', title: 'Permessi Pagine Utente', description: 'Configura accesso pagine per utente' },
  { path: '/admin/moduli', title: 'Gestione Moduli', description: 'Crea e gestisci moduli pubblici' },
  { path: '/admin/ruoli', title: 'Gestione Ruoli', description: 'Crea e configura ruoli' },
];

// Color options for roles
export const roleColorOptions = [
  { value: 'red', label: 'Rosso', className: 'bg-red-500' },
  { value: 'blue', label: 'Blu', className: 'bg-blue-500' },
  { value: 'green', label: 'Verde', className: 'bg-green-500' },
  { value: 'yellow', label: 'Giallo', className: 'bg-yellow-500' },
  { value: 'purple', label: 'Viola', className: 'bg-purple-500' },
  { value: 'pink', label: 'Rosa', className: 'bg-pink-500' },
  { value: 'orange', label: 'Arancione', className: 'bg-orange-500' },
  { value: 'teal', label: 'Turchese', className: 'bg-teal-500' },
  { value: 'gray', label: 'Grigio', className: 'bg-gray-500' },
];
