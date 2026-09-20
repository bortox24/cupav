CREATE POLICY "Checkin page access festa campeggio"
ON public.festa_campeggio
FOR SELECT
TO authenticated
USING (has_page_access(auth.uid(), '/festa-campeggio-checkin'));

CREATE POLICY "Checkin page update festa campeggio"
ON public.festa_campeggio
FOR UPDATE
TO authenticated
USING (has_page_access(auth.uid(), '/festa-campeggio-checkin'))
WITH CHECK (has_page_access(auth.uid(), '/festa-campeggio-checkin'));