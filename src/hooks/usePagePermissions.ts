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
}

// All available pages in the system (simplified - no defaultRoles)
export const availablePages: PageInfo[] = [
  {
    path: '/home',
    title: 'Home',
    description: 'Dashboard principale',
  },
  {
    path: '/registrazione-spese-prelievi',
    title: 'Registrazione Transazioni',
    description: 'Inserisci spese, prelievi ed entrate',
  },
  {
    path: '/controllo-spese',
    title: 'Dashboard Controllo',
    description: 'Visualizza grafici e statistiche delle spese',
  },
  {
    path: '/visualizza-moduli',
    title: 'Visualizza Moduli',
    description: 'Consulta risposte e statistiche dei moduli',
  },
  {
    path: '/visualizza-moduli/:id/risposte',
    title: 'Risposte Modulo',
    description: 'Visualizza risposte e statistiche di un modulo',
  },
  {
    path: '/admin/permessi',
    title: 'Gestione Utenti',
    description: 'Crea utenti e gestisci accessi',
  },
  {
    path: '/admin/categorie',
    title: 'Gestione Categorie',
    description: 'Configura le categorie delle transazioni',
  },
  {
    path: '/admin/permessi-pagine',
    title: 'Permessi Pagine',
    description: 'Configura accesso pagine per utente',
  },
  {
    path: '/admin/moduli',
    title: 'Gestione Moduli',
    description: 'Crea, modifica ed elimina moduli',
  },
  {
    path: '/admin/moduli/:id/risposte',
    title: 'Risposte Modulo (Admin)',
    description: 'Gestisci risposte modulo',
  },
  {
    path: '/anagrafica-ragazzi',
    title: 'Anagrafica Ragazzi',
    description: 'Gestionale anagrafico ragazzi CUPAV',
  },
  {
    path: '/gestione-pagamenti',
    title: 'Gestione Pagamenti',
    description: 'Gestisci stato pagamenti delle iscrizioni',
  },
];

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

// Hook for current user's permissions
export function useMyPagePermissions() {
  const { user, isAdmin } = useAuth();
  
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

  const canAccessPage = (pagePath: string): boolean => {
    // Admin always has access to everything
    if (isAdmin) return true;

    // Check for custom permission (exact match first, then pattern match)
    const customPermission = permissions.find(p => 
      p.page_path === pagePath || matchPath(p.page_path, pagePath)
    );
    
    if (customPermission) {
      return customPermission.can_access;
    }

    // If no custom permission exists, find if any parent pattern grants access
    const pageInfo = availablePages.find(p => 
      p.path === pagePath || matchPath(p.path, pagePath)
    );
    
    if (pageInfo) {
      // Check if there's a permission for the pattern
      const patternPermission = permissions.find(p => 
        p.page_path === pageInfo.path
      );
      if (patternPermission) {
        return patternPermission.can_access;
      }
    }

    // Check if a parent page grants access (e.g. /admin/moduli grants /admin/moduli/:id/risposte)
    const parentPermission = permissions.find(p => 
      p.can_access && pagePath.startsWith(p.page_path + '/')
    );
    if (parentPermission) {
      return true;
    }

    // No permission found = no access (for non-admin users)
    return false;
  };

  const getAccessiblePages = (): PageInfo[] => {
    if (isAdmin) return availablePages;
    return availablePages.filter(page => canAccessPage(page.path));
  };

  return {
    permissions,
    canAccessPage,
    getAccessiblePages,
    isLoading,
  };
}

// Hook for admin to view all user permissions
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

// Hook for admin to set a user's page permission
export function useSetPagePermission() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, pagePath, canAccess }: { userId: string; pagePath: string; canAccess: boolean }) => {
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
          .update({ can_access: canAccess, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('user_page_permissions')
          .insert({ user_id: userId, page_path: pagePath, can_access: canAccess });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-page-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['my-page-permissions'] });
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

// Hook for admin to reset all permissions for a user
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
        title: 'Permessi resettati',
        description: 'I permessi personalizzati sono stati rimossi',
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
