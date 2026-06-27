ALTER TABLE public.iscrizioni ADD COLUMN IF NOT EXISTS note text;

CREATE POLICY "Turno staff can update iscrizioni note"
ON public.iscrizioni
FOR UPDATE
USING (
  is_admin()
  OR ((NOT is_staff_account()) AND has_turno_access(auth.uid(), turno))
  OR (my_staff_ruolo() IN ('cuoco','responsabile_campo','responsabile_animatori') AND has_turno_access(auth.uid(), turno))
)
WITH CHECK (
  is_admin()
  OR ((NOT is_staff_account()) AND has_turno_access(auth.uid(), turno))
  OR (my_staff_ruolo() IN ('cuoco','responsabile_campo','responsabile_animatori') AND has_turno_access(auth.uid(), turno))
);