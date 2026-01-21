import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from '@/hooks/use-toast';

export interface PagePermission {
  id: string;
  user_id: string;
  page_path: string;
  can_access: boolean;
  created_at: string;
  updated_at: string;
}

export interface PageInfo {
  path: string;
  title: string;
  description: string;
  defaultRoles: ('admin' | 'tesoriere' | 'visualizzatore')[];
}

export const availablePages: PageInfo[] = [
  {
    path: '/home',
    title: 'Home',
    description: 'Dashboard principale',
    defaultRoles: ['admin', 'tesoriere', 'visualizzatore'],
  },
  {
    path: '/registrazione-spese-prelievi',
    title: 'Registrazione Transazioni',
    description: 'Inserisci spese, prelievi ed entrate',
    defaultRoles: ['admin', 'tesoriere'],
  },
  {
    path: '/controllo-spese',
    title: 'Dashboard Controllo',
    description: 'Visualizza grafici e statistiche',
    defaultRoles: ['admin', 'tesoriere', 'visualizzatore'],
  },
  {
    path: '/visualizza-moduli',
    title: 'Visualizza Moduli',
    description: 'Consulta risposte e statistiche dei moduli',
    defaultRoles: ['admin', 'tesoriere', 'visualizzatore'],
  },
  {
    path: '/visualizza-moduli/:id/risposte',
    title: 'Risposte Modulo',
    description: 'Visualizza risposte e statistiche di un modulo',
    defaultRoles: ['admin', 'tesoriere', 'visualizzatore'],
  },
  {
    path: '/admin/permessi',
    title: 'Gestione Utenti',
    description: 'Crea utenti e assegna ruoli',
    defaultRoles: ['admin'],
  },
  {
    path: '/admin/categorie',
    title: 'Gestione Categorie',
    description: 'Configura le categorie',
    defaultRoles: ['admin'],
  },
  {
    path: '/admin/permessi-pagine',
    title: 'Permessi Pagine',
    description: 'Configura accesso pagine per utente',
    defaultRoles: ['admin'],
  },
  {
    path: '/admin/moduli',
    title: 'Gestione Moduli',
    description: 'Crea, modifica ed elimina moduli',
    defaultRoles: ['admin'],
  },
  {
    path: '/admin/moduli/:id/risposte',
    title: 'Risposte Modulo (Admin)',
    description: 'Gestisci risposte modulo',
    defaultRoles: ['admin'],
  },
  {
    path: '/admin/ruoli',
    title: 'Gestione Ruoli',
    description: 'Crea e configura ruoli e permessi',
    defaultRoles: ['admin'],
  },
];

// Hook to get current user's page permissions
export function useMyPagePermissions() {
  const { user, userRole } = useAuth();

  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ['my-page-permissions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('user_page_permissions')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data as PagePermission[];
    },
    enabled: !!user?.id,
  });

  // Helper to match dynamic routes (e.g., /visualizza-moduli/:id/risposte)
  const matchPath = (pattern: string, path: string): boolean => {
    const patternParts = pattern.split('/');
    const pathParts = path.split('/');
    
    if (patternParts.length !== pathParts.length) return false;
    
    return patternParts.every((part, i) => {
      if (part.startsWith(':')) return true; // Dynamic segment matches anything
      return part === pathParts[i];
    });
  };

  const canAccessPage = (pagePath: string): boolean => {
    // Admin always has access to everything
    if (userRole === 'admin') return true;

    // Check for custom permission (exact match first, then pattern match)
    const customPermission = permissions.find(p => 
      p.page_path === pagePath || matchPath(p.page_path, pagePath)
    );
    if (customPermission) {
      return customPermission.can_access;
    }

    // Fall back to role-based default (exact match first, then pattern match)
    const pageInfo = availablePages.find(p => 
      p.path === pagePath || matchPath(p.path, pagePath)
    );
    if (pageInfo && userRole) {
      return pageInfo.defaultRoles.includes(userRole);
    }

    return false;
  };

  const getAccessiblePages = (): PageInfo[] => {
    return availablePages.filter(page => canAccessPage(page.path));
  };

  return {
    permissions,
    isLoading,
    canAccessPage,
    getAccessiblePages,
  };
}

// Hook to get all users' permissions (admin only)
export function useAllPagePermissions() {
  return useQuery({
    queryKey: ['all-page-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_page_permissions')
        .select('*');
      
      if (error) throw error;
      return data as PagePermission[];
    },
  });
}

// Hook to set a user's page permission
export function useSetPagePermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      userId, 
      pagePath, 
      canAccess 
    }: { 
      userId: string; 
      pagePath: string; 
      canAccess: boolean;
    }) => {
      // First try to find existing permission
      const { data: existing } = await supabase
        .from('user_page_permissions')
        .select('id')
        .eq('user_id', userId)
        .eq('page_path', pagePath)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('user_page_permissions')
          .update({ can_access: canAccess })
          .eq('id', existing.id);
        
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('user_page_permissions')
          .insert({ 
            user_id: userId, 
            page_path: pagePath, 
            can_access: canAccess 
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-page-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['my-page-permissions'] });
    },
    onError: (error) => {
      toast({
        title: 'Errore',
        description: 'Impossibile aggiornare il permesso',
        variant: 'destructive',
      });
      console.error('Error updating permission:', error);
    },
  });
}

// Hook to reset a user's permissions to default (remove custom)
export function useResetUserPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('user_page_permissions')
        .delete()
        .eq('user_id', userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-page-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['my-page-permissions'] });
      toast({
        title: 'Successo',
        description: 'Permessi ripristinati ai valori predefiniti',
      });
    },
    onError: (error) => {
      toast({
        title: 'Errore',
        description: 'Impossibile ripristinare i permessi',
        variant: 'destructive',
      });
      console.error('Error resetting permissions:', error);
    },
  });
}
