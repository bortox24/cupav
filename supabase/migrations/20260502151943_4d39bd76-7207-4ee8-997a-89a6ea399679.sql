
-- 1. Add columns to iscrizioni_famiglie
ALTER TABLE public.iscrizioni_famiglie
  ADD COLUMN IF NOT EXISTS categoria_tariffa smallint,
  ADD COLUMN IF NOT EXISTS importo_totale_calcolato numeric;

-- 2. Create tariffe_famiglie table
CREATE TABLE IF NOT EXISTS public.tariffe_famiglie (
  categoria smallint PRIMARY KEY CHECK (categoria BETWEEN 1 AND 4),
  descrizione text NOT NULL,
  adulto numeric NOT NULL DEFAULT 0,
  figlio_1_over10 numeric NOT NULL DEFAULT 0,
  figlio_2_over10 numeric NOT NULL DEFAULT 0,
  figlio_3_over10 numeric NOT NULL DEFAULT 0,
  eta_4_10 numeric NOT NULL DEFAULT 0,
  eta_0_3 numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.tariffe_famiglie ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Authenticated can read tariffe_famiglie" ON public.tariffe_famiglie;
CREATE POLICY "Authenticated can read tariffe_famiglie"
  ON public.tariffe_famiglie FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admin or impostazioni can update tariffe_famiglie" ON public.tariffe_famiglie;
CREATE POLICY "Admin or impostazioni can update tariffe_famiglie"
  ON public.tariffe_famiglie FOR UPDATE
  TO authenticated
  USING (is_admin() OR has_page_access(auth.uid(), '/impostazioni'))
  WITH CHECK (is_admin() OR has_page_access(auth.uid(), '/impostazioni'));

DROP POLICY IF EXISTS "Admin can insert tariffe_famiglie" ON public.tariffe_famiglie;
CREATE POLICY "Admin can insert tariffe_famiglie"
  ON public.tariffe_famiglie FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin can delete tariffe_famiglie" ON public.tariffe_famiglie;
CREATE POLICY "Admin can delete tariffe_famiglie"
  ON public.tariffe_famiglie FOR DELETE
  TO authenticated
  USING (is_admin());

-- Trigger updated_at
DROP TRIGGER IF EXISTS update_tariffe_famiglie_updated_at ON public.tariffe_famiglie;
CREATE TRIGGER update_tariffe_famiglie_updated_at
  BEFORE UPDATE ON public.tariffe_famiglie
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed defaults
INSERT INTO public.tariffe_famiglie (categoria, descrizione, adulto, figlio_1_over10, figlio_2_over10, figlio_3_over10, eta_4_10, eta_0_3) VALUES
  (1, 'Altavilla + collabora CUPAV', 20, 15, 13, 10, 10, 0),
  (2, 'Altavilla',                  25, 20, 15, 12, 12, 0),
  (3, 'Fuori Comune + collabora',   30, 23, 18, 15, 15, 0),
  (4, 'Fuori Comune',               35, 25, 20, 17, 17, 0)
ON CONFLICT (categoria) DO NOTHING;
