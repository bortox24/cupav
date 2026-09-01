CREATE TABLE public.festa_campeggio (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  nome text not null,
  cognome text not null,
  email text not null,
  telefono text,
  num_adulti integer not null default 0,
  num_ragazzi integer not null default 0,
  num_staff integer not null default 0,
  contributo integer not null default 0,
  arrivato boolean not null default false,
  arrivato_da text,
  arrivato_at timestamp with time zone,
  pagato boolean not null default false,
  pagato_da text,
  pagato_at timestamp with time zone,
  firma_nome_cognome text not null,
  firma_data date not null
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.festa_campeggio TO authenticated;
GRANT ALL ON public.festa_campeggio TO service_role;
GRANT INSERT ON public.festa_campeggio TO anon;

ALTER TABLE public.festa_campeggio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public inserts to festa campeggio" ON public.festa_campeggio FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow admin full access on festa campeggio" ON public.festa_campeggio FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Allow page permission access on festa campeggio" ON public.festa_campeggio FOR ALL TO authenticated USING (public.has_page_access(auth.uid(), '/festa-campeggio-iscrizioni')) WITH CHECK (public.has_page_access(auth.uid(), '/festa-campeggio-iscrizioni'));

CREATE TRIGGER update_festa_campeggio_updated_at BEFORE UPDATE ON public.festa_campeggio FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();