
-- Add medical/health columns to ragazzi table for enrichment from iscrizioni
ALTER TABLE public.ragazzi
  ADD COLUMN IF NOT EXISTS ha_allergie boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allergie_dettaglio text,
  ADD COLUMN IF NOT EXISTS patologie_dettaglio text,
  ADD COLUMN IF NOT EXISTS farmaco_1_nome text,
  ADD COLUMN IF NOT EXISTS farmaco_1_posologia text,
  ADD COLUMN IF NOT EXISTS farmaco_2_nome text,
  ADD COLUMN IF NOT EXISTS farmaco_2_posologia text,
  ADD COLUMN IF NOT EXISTS farmaco_3_nome text,
  ADD COLUMN IF NOT EXISTS farmaco_3_posologia text;
