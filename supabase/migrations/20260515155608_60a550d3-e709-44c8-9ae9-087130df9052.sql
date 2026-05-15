
CREATE TABLE public.iscrizioni_montaggio (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  email text NOT NULL,
  nome text NOT NULL,
  cognome text NOT NULL,
  residente_a text NOT NULL,
  via text NOT NULL,
  recapiti_telefonici jsonb NOT NULL DEFAULT '[]'::jsonb,
  giorni_selezionati text[] NOT NULL DEFAULT '{}',
  num_adulti integer NOT NULL DEFAULT 0,
  num_figli_over10 integer NOT NULL DEFAULT 0,
  num_4_10_anni integer NOT NULL DEFAULT 0,
  num_0_3_anni integer NOT NULL DEFAULT 0,
  num_notti integer NOT NULL DEFAULT 0,
  importo_totale_calcolato numeric,
  firma_nome_cognome text NOT NULL,
  firma_data date NOT NULL,
  tariffa_accettata boolean NOT NULL DEFAULT false,
  archiviato boolean NOT NULL DEFAULT false,
  turno text NOT NULL DEFAULT 'Montaggio campeggio'
);

ALTER TABLE public.iscrizioni_montaggio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert iscrizioni_montaggio"
ON public.iscrizioni_montaggio FOR INSERT TO public
WITH CHECK (true);

CREATE POLICY "Admin or permitted can select iscrizioni_montaggio"
ON public.iscrizioni_montaggio FOR SELECT TO authenticated
USING (is_admin() OR has_page_access(auth.uid(), '/anagrafica-montaggio-campeggio'));

CREATE POLICY "Admin or permitted can update iscrizioni_montaggio"
ON public.iscrizioni_montaggio FOR UPDATE TO authenticated
USING (is_admin() OR has_page_access(auth.uid(), '/anagrafica-montaggio-campeggio'));

CREATE POLICY "Admin or permitted can delete iscrizioni_montaggio"
ON public.iscrizioni_montaggio FOR DELETE TO authenticated
USING (is_admin() OR has_page_access(auth.uid(), '/anagrafica-montaggio-campeggio'));
