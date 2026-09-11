ALTER TABLE public.festa_campeggio
  ADD COLUMN IF NOT EXISTS arrivati_adulti integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS arrivati_ragazzi integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS arrivati_staff integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS importo_incassato numeric NOT NULL DEFAULT 0;

UPDATE public.festa_campeggio
SET arrivati_adulti = num_adulti,
    arrivati_ragazzi = num_ragazzi,
    arrivati_staff = num_staff
WHERE arrivato = true
  AND arrivati_adulti = 0 AND arrivati_ragazzi = 0 AND arrivati_staff = 0;

UPDATE public.festa_campeggio
SET importo_incassato = contributo
WHERE pagato = true AND importo_incassato = 0;