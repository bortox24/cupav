
-- Table: iscrizioni
CREATE TABLE public.iscrizioni (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  email TEXT NOT NULL,
  ragazzo_cognome TEXT NOT NULL,
  ragazzo_nome TEXT NOT NULL,
  ragazzo_data_nascita DATE NOT NULL,
  ragazzo_luogo_nascita TEXT NOT NULL,
  ragazzo_residente TEXT NOT NULL,
  ragazzo_indirizzo TEXT NOT NULL,
  recapiti_telefonici TEXT NOT NULL,
  genitore_qualita TEXT NOT NULL,
  genitore_cognome TEXT NOT NULL,
  genitore_nome TEXT NOT NULL,
  turno TEXT NOT NULL,
  secondo_figlio TEXT,
  ha_allergie BOOLEAN NOT NULL DEFAULT false,
  allergie_dettaglio TEXT,
  patologie_dettaglio TEXT,
  farmaco_1_nome TEXT,
  farmaco_1_posologia TEXT,
  farmaco_2_nome TEXT,
  farmaco_2_posologia TEXT,
  farmaco_3_nome TEXT,
  farmaco_3_posologia TEXT,
  liberatoria_foto BOOLEAN NOT NULL DEFAULT false,
  firma_data DATE NOT NULL,
  firma_nome TEXT NOT NULL
);

ALTER TABLE public.iscrizioni ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert iscrizioni"
  ON public.iscrizioni FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can select iscrizioni"
  ON public.iscrizioni FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update iscrizioni"
  ON public.iscrizioni FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete iscrizioni"
  ON public.iscrizioni FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Table: webhook_config
CREATE TABLE public.webhook_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_url TEXT NOT NULL DEFAULT '',
  descrizione TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.webhook_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select webhook_config"
  ON public.webhook_config FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update webhook_config"
  ON public.webhook_config FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert webhook_config"
  ON public.webhook_config FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete webhook_config"
  ON public.webhook_config FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Insert default webhook_config record
INSERT INTO public.webhook_config (webhook_url, descrizione)
VALUES ('', 'Webhook n8n per notifica nuova iscrizione');
