ALTER TABLE public.giornata_genitori
  ADD COLUMN IF NOT EXISTS arrivato boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS arrivato_da text,
  ADD COLUMN IF NOT EXISTS arrivato_at timestamptz,
  ADD COLUMN IF NOT EXISTS pagato boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pagato_da text,
  ADD COLUMN IF NOT EXISTS pagato_at timestamptz;