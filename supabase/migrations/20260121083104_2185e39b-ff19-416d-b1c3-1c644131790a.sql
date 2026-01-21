-- Tabella per permessi pagine personalizzati per utente
CREATE TABLE public.user_page_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    page_path TEXT NOT NULL,
    can_access BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(user_id, page_path)
);

-- Enable RLS
ALTER TABLE public.user_page_permissions ENABLE ROW LEVEL SECURITY;

-- Policies: Solo admin può gestire i permessi
CREATE POLICY "Admins can manage all permissions"
ON public.user_page_permissions
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Users can view their own permissions
CREATE POLICY "Users can view own permissions"
ON public.user_page_permissions
FOR SELECT
USING (user_id = auth.uid());

-- Trigger per updated_at
CREATE TRIGGER update_user_page_permissions_updated_at
BEFORE UPDATE ON public.user_page_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();