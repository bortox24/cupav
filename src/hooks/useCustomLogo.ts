import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import fallbackLogo from '@/assets/logo-cupav.png';

export function useCustomLogo() {
  const { data: logoUrl } = useQuery({
    queryKey: ['custom-logo'],
    queryFn: async () => {
      // Check if logo exists in branding bucket
      const { data } = await supabase.storage.from('branding').list('', {
        search: 'logo',
      });
      if (data && data.length > 0) {
        const { data: urlData } = supabase.storage.from('branding').getPublicUrl('logo.png');
        // Add cache-bust to force refresh
        return `${urlData.publicUrl}?t=${Date.now()}`;
      }
      return null;
    },
    staleTime: 1000 * 60 * 10,
  });

  return logoUrl || fallbackLogo;
}
