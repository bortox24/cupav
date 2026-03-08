
-- Add new columns to animatori table
ALTER TABLE public.animatori ADD COLUMN IF NOT EXISTS ruolo text NOT NULL DEFAULT 'animatore';
ALTER TABLE public.animatori ADD COLUMN IF NOT EXISTS cognome text;
ALTER TABLE public.animatori ADD COLUMN IF NOT EXISTS ha_allergie boolean NOT NULL DEFAULT false;
ALTER TABLE public.animatori ADD COLUMN IF NOT EXISTS allergie_dettaglio text;
ALTER TABLE public.animatori ADD COLUMN IF NOT EXISTS patologie_dettaglio text;
ALTER TABLE public.animatori ADD COLUMN IF NOT EXISTS farmaco_1_nome text;
ALTER TABLE public.animatori ADD COLUMN IF NOT EXISTS farmaco_1_posologia text;
ALTER TABLE public.animatori ADD COLUMN IF NOT EXISTS farmaco_2_nome text;
ALTER TABLE public.animatori ADD COLUMN IF NOT EXISTS farmaco_2_posologia text;
ALTER TABLE public.animatori ADD COLUMN IF NOT EXISTS farmaco_3_nome text;
ALTER TABLE public.animatori ADD COLUMN IF NOT EXISTS farmaco_3_posologia text;

-- Allow anonymous inserts for the public staff form
CREATE POLICY "Anyone can insert animatori" ON public.animatori FOR INSERT WITH CHECK (true);
