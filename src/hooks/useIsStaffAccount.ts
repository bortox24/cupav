import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

// Returns true if the current user is a staff account (created from Anagrafica Staff)
export function useIsStaffAccount() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['is-staff-account', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data, error } = await (supabase as any).rpc('is_staff_account', {
        _user_id: user.id,
      });
      if (error) throw error;
      return Boolean(data);
    },
    enabled: !!user?.id,
  });

  return { isStaffAccount: query.data ?? false, isLoading: query.isLoading };
}
