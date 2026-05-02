ALTER TABLE public.iscrizioni_famiglie
  ADD COLUMN IF NOT EXISTS num_figli_over10 integer NOT NULL DEFAULT 0;

UPDATE public.iscrizioni_famiglie
SET num_figli_over10 =
  (CASE WHEN figlio_1_over10 THEN 1 ELSE 0 END) +
  (CASE WHEN figlio_2_over10 THEN 1 ELSE 0 END) +
  (CASE WHEN figlio_3_over10 THEN 1 ELSE 0 END)
WHERE num_figli_over10 = 0
  AND (figlio_1_over10 OR figlio_2_over10 OR figlio_3_over10);