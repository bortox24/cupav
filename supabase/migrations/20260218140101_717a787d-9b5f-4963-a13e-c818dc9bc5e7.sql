
-- Create payment status enum
CREATE TYPE public.payment_status AS ENUM ('da_pagare', 'parziale', 'pagato');

-- Create pagamenti table
CREATE TABLE public.pagamenti (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  iscrizione_id uuid NOT NULL REFERENCES public.iscrizioni(id) ON DELETE CASCADE UNIQUE,
  stato public.payment_status NOT NULL DEFAULT 'da_pagare',
  note text,
  updated_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pagamenti ENABLE ROW LEVEL SECURITY;

-- RLS: Admin or users with /gestione-pagamenti access can SELECT
CREATE POLICY "Admin or permitted users can select pagamenti"
ON public.pagamenti FOR SELECT TO authenticated
USING (is_admin() OR has_page_access(auth.uid(), '/gestione-pagamenti'));

-- RLS: Admin or users with /gestione-pagamenti access can INSERT
CREATE POLICY "Admin or permitted users can insert pagamenti"
ON public.pagamenti FOR INSERT TO authenticated
WITH CHECK (is_admin() OR has_page_access(auth.uid(), '/gestione-pagamenti'));

-- RLS: Admin or users with /gestione-pagamenti access can UPDATE
CREATE POLICY "Admin or permitted users can update pagamenti"
ON public.pagamenti FOR UPDATE TO authenticated
USING (is_admin() OR has_page_access(auth.uid(), '/gestione-pagamenti'));

-- RLS: Admin or users with /gestione-pagamenti access can DELETE
CREATE POLICY "Admin or permitted users can delete pagamenti"
ON public.pagamenti FOR DELETE TO authenticated
USING (is_admin() OR has_page_access(auth.uid(), '/gestione-pagamenti'));

-- Trigger for updated_at
CREATE TRIGGER update_pagamenti_updated_at
BEFORE UPDATE ON public.pagamenti
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
