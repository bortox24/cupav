
-- Table: animatori
CREATE TABLE public.animatori (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text,
  telefono text,
  data_nascita text,
  note text,
  archiviato boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.animatori ENABLE ROW LEVEL SECURITY;

-- Table: animatori_turni
CREATE TABLE public.animatori_turni (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  animatore_id uuid NOT NULL REFERENCES public.animatori(id) ON DELETE CASCADE,
  turno text NOT NULL,
  anno integer NOT NULL DEFAULT EXTRACT(YEAR FROM now())::integer,
  assegnato_da uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(animatore_id, turno, anno)
);

ALTER TABLE public.animatori_turni ENABLE ROW LEVEL SECURITY;

-- RLS for animatori
CREATE POLICY "Admin or permitted users can select animatori"
  ON public.animatori FOR SELECT
  USING (is_admin() OR has_page_access(auth.uid(), '/anagrafica-animatori'));

CREATE POLICY "Admin or permitted users can insert animatori"
  ON public.animatori FOR INSERT
  WITH CHECK (is_admin() OR has_page_access(auth.uid(), '/anagrafica-animatori'));

CREATE POLICY "Admin or permitted users can update animatori"
  ON public.animatori FOR UPDATE
  USING (is_admin() OR has_page_access(auth.uid(), '/anagrafica-animatori'));

CREATE POLICY "Admin or permitted users can delete animatori"
  ON public.animatori FOR DELETE
  USING (is_admin() OR has_page_access(auth.uid(), '/anagrafica-animatori'));

-- Authenticated can read animatori (for turno pages)
CREATE POLICY "Authenticated can read animatori"
  ON public.animatori FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- RLS for animatori_turni
CREATE POLICY "Admin or permitted users can insert animatori_turni"
  ON public.animatori_turni FOR INSERT
  WITH CHECK (is_admin() OR has_page_access(auth.uid(), '/anagrafica-animatori'));

CREATE POLICY "Admin or permitted users can delete animatori_turni"
  ON public.animatori_turni FOR DELETE
  USING (is_admin() OR has_page_access(auth.uid(), '/anagrafica-animatori'));

CREATE POLICY "Authenticated can read animatori_turni"
  ON public.animatori_turni FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Updated_at trigger for animatori
CREATE TRIGGER update_animatori_updated_at
  BEFORE UPDATE ON public.animatori
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.animatori;
ALTER PUBLICATION supabase_realtime ADD TABLE public.animatori_turni;
