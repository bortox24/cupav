ALTER TABLE public.festa_campeggio REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.festa_campeggio;