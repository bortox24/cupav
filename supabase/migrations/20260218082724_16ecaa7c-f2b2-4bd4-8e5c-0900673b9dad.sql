
-- Tabella ragazzi (anagrafica principale)
CREATE TABLE public.ragazzi (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL UNIQUE,
  data_nascita TEXT,
  residente_altavilla BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabella ragazzi_genitori
CREATE TABLE public.ragazzi_genitori (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ragazzo_id UUID NOT NULL REFERENCES public.ragazzi(id) ON DELETE CASCADE,
  nome_cognome TEXT NOT NULL,
  ruolo TEXT NOT NULL,
  email TEXT,
  telefono TEXT
);

-- Tabella ragazzi_iscrizioni (storico annuale)
CREATE TABLE public.ragazzi_iscrizioni (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ragazzo_id UUID NOT NULL REFERENCES public.ragazzi(id) ON DELETE CASCADE,
  anno INTEGER NOT NULL,
  turno TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(ragazzo_id, anno)
);

-- Trigger updated_at per ragazzi
CREATE TRIGGER update_ragazzi_updated_at
  BEFORE UPDATE ON public.ragazzi
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.ragazzi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ragazzi_genitori ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ragazzi_iscrizioni ENABLE ROW LEVEL SECURITY;

-- INSERT aperto a tutti (anon + authenticated) per il form pubblico
CREATE POLICY "Anyone can insert ragazzi" ON public.ragazzi FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can insert genitori" ON public.ragazzi_genitori FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can insert iscrizioni" ON public.ragazzi_iscrizioni FOR INSERT TO anon, authenticated WITH CHECK (true);

-- SELECT per admin o utenti con permesso anagrafica
CREATE POLICY "Admin or permitted users can select ragazzi" ON public.ragazzi FOR SELECT TO authenticated
  USING (public.is_admin() OR public.has_page_access(auth.uid(), '/anagrafica-ragazzi'));

CREATE POLICY "Admin or permitted users can select genitori" ON public.ragazzi_genitori FOR SELECT TO authenticated
  USING (public.is_admin() OR public.has_page_access(auth.uid(), '/anagrafica-ragazzi'));

CREATE POLICY "Admin or permitted users can select iscrizioni" ON public.ragazzi_iscrizioni FOR SELECT TO authenticated
  USING (public.is_admin() OR public.has_page_access(auth.uid(), '/anagrafica-ragazzi'));

-- UPDATE per admin o utenti con permesso
CREATE POLICY "Admin or permitted users can update ragazzi" ON public.ragazzi FOR UPDATE TO authenticated
  USING (public.is_admin() OR public.has_page_access(auth.uid(), '/anagrafica-ragazzi'));

CREATE POLICY "Admin or permitted users can update genitori" ON public.ragazzi_genitori FOR UPDATE TO authenticated
  USING (public.is_admin() OR public.has_page_access(auth.uid(), '/anagrafica-ragazzi'));

-- UPDATE iscrizioni (anon needs to upsert)
CREATE POLICY "Anyone can update iscrizioni" ON public.ragazzi_iscrizioni FOR UPDATE TO anon, authenticated WITH CHECK (true);

-- DELETE per admin o utenti con permesso
CREATE POLICY "Admin or permitted users can delete ragazzi" ON public.ragazzi FOR DELETE TO authenticated
  USING (public.is_admin() OR public.has_page_access(auth.uid(), '/anagrafica-ragazzi'));

CREATE POLICY "Admin or permitted users can delete genitori" ON public.ragazzi_genitori FOR DELETE TO authenticated
  USING (public.is_admin() OR public.has_page_access(auth.uid(), '/anagrafica-ragazzi'));

CREATE POLICY "Admin or permitted users can delete iscrizioni" ON public.ragazzi_iscrizioni FOR DELETE TO authenticated
  USING (public.is_admin() OR public.has_page_access(auth.uid(), '/anagrafica-ragazzi'));

-- Anon needs SELECT on ragazzi to check duplicates during form submission
CREATE POLICY "Anon can select ragazzi for duplicate check" ON public.ragazzi FOR SELECT TO anon USING (true);
-- Anon needs SELECT on genitori to update them
CREATE POLICY "Anon can select genitori" ON public.ragazzi_genitori FOR SELECT TO anon USING (true);
-- Anon needs UPDATE on genitori
CREATE POLICY "Anon can update genitori" ON public.ragazzi_genitori FOR UPDATE TO anon WITH CHECK (true);
-- Anon needs SELECT on iscrizioni for duplicate check
CREATE POLICY "Anon can select iscrizioni" ON public.ragazzi_iscrizioni FOR SELECT TO anon USING (true);
