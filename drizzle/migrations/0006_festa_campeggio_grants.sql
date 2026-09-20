GRANT SELECT, INSERT, UPDATE, DELETE ON public.festa_campeggio TO authenticated;
GRANT INSERT ON public.festa_campeggio TO anon;
GRANT ALL ON public.festa_campeggio TO service_role;