
-- Create site_settings table
CREATE TABLE public.site_settings (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT 'true',
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read (needed for public pages)
CREATE POLICY "Anyone can read site_settings" ON public.site_settings
  FOR SELECT USING (true);

-- Admin or users with /impostazioni access can modify
CREATE POLICY "Admin or permitted users can update site_settings" ON public.site_settings
  FOR UPDATE USING (is_admin() OR has_page_access(auth.uid(), '/impostazioni'::text));

CREATE POLICY "Admin or permitted users can insert site_settings" ON public.site_settings
  FOR INSERT WITH CHECK (is_admin() OR has_page_access(auth.uid(), '/impostazioni'::text));

CREATE POLICY "Admin or permitted users can delete site_settings" ON public.site_settings
  FOR DELETE USING (is_admin() OR has_page_access(auth.uid(), '/impostazioni'::text));

-- Seed default values
INSERT INTO public.site_settings (key, value) VALUES
  ('iscrizione_enabled', 'true'),
  ('preiscrizione_enabled', 'true');

-- Create branding storage bucket (public)
INSERT INTO storage.buckets (id, name, public) VALUES ('branding', 'branding', true);

-- Storage RLS: anyone can read
CREATE POLICY "Anyone can read branding" ON storage.objects
  FOR SELECT USING (bucket_id = 'branding');

-- Storage RLS: admin or permitted users can upload
CREATE POLICY "Admin or permitted can upload branding" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'branding' AND (is_admin() OR has_page_access(auth.uid(), '/impostazioni'::text)));

-- Storage RLS: admin or permitted users can update (overwrite)
CREATE POLICY "Admin or permitted can update branding" ON storage.objects
  FOR UPDATE USING (bucket_id = 'branding' AND (is_admin() OR has_page_access(auth.uid(), '/impostazioni'::text)));

-- Storage RLS: admin or permitted users can delete
CREATE POLICY "Admin or permitted can delete branding" ON storage.objects
  FOR DELETE USING (bucket_id = 'branding' AND (is_admin() OR has_page_access(auth.uid(), '/impostazioni'::text)));
