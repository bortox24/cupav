-- Add entity_type to jobs
ALTER TABLE public.invio_massivo_jobs
  ADD COLUMN IF NOT EXISTS entity_type text NOT NULL DEFAULT 'ragazzi';

-- Widen RLS for jobs to also allow staff and montaggio page-permitted users
DROP POLICY IF EXISTS "Admin or permitted can select invio_massivo_jobs" ON public.invio_massivo_jobs;
CREATE POLICY "Admin or permitted can select invio_massivo_jobs"
ON public.invio_massivo_jobs FOR SELECT TO authenticated
USING (
  is_admin()
  OR has_page_access(auth.uid(), '/anagrafica-ragazzi')
  OR has_page_access(auth.uid(), '/anagrafica-animatori')
  OR has_page_access(auth.uid(), '/anagrafica-montaggio-campeggio')
);

DROP POLICY IF EXISTS "Admin or permitted can insert invio_massivo_jobs" ON public.invio_massivo_jobs;
CREATE POLICY "Admin or permitted can insert invio_massivo_jobs"
ON public.invio_massivo_jobs FOR INSERT TO authenticated
WITH CHECK (
  (is_admin()
   OR has_page_access(auth.uid(), '/anagrafica-ragazzi')
   OR has_page_access(auth.uid(), '/anagrafica-animatori')
   OR has_page_access(auth.uid(), '/anagrafica-montaggio-campeggio'))
  AND created_by = auth.uid()
);

DROP POLICY IF EXISTS "Admin or permitted can update invio_massivo_jobs" ON public.invio_massivo_jobs;
CREATE POLICY "Admin or permitted can update invio_massivo_jobs"
ON public.invio_massivo_jobs FOR UPDATE TO authenticated
USING (
  is_admin()
  OR has_page_access(auth.uid(), '/anagrafica-ragazzi')
  OR has_page_access(auth.uid(), '/anagrafica-animatori')
  OR has_page_access(auth.uid(), '/anagrafica-montaggio-campeggio')
)
WITH CHECK (
  is_admin()
  OR has_page_access(auth.uid(), '/anagrafica-ragazzi')
  OR has_page_access(auth.uid(), '/anagrafica-animatori')
  OR has_page_access(auth.uid(), '/anagrafica-montaggio-campeggio')
);

-- Widen RLS for job items
DROP POLICY IF EXISTS "Admin or permitted can select invio_massivo_job_items" ON public.invio_massivo_job_items;
CREATE POLICY "Admin or permitted can select invio_massivo_job_items"
ON public.invio_massivo_job_items FOR SELECT TO authenticated
USING (
  is_admin()
  OR has_page_access(auth.uid(), '/anagrafica-ragazzi')
  OR has_page_access(auth.uid(), '/anagrafica-animatori')
  OR has_page_access(auth.uid(), '/anagrafica-montaggio-campeggio')
);

DROP POLICY IF EXISTS "Admin or permitted can insert invio_massivo_job_items" ON public.invio_massivo_job_items;
CREATE POLICY "Admin or permitted can insert invio_massivo_job_items"
ON public.invio_massivo_job_items FOR INSERT TO authenticated
WITH CHECK (
  is_admin()
  OR has_page_access(auth.uid(), '/anagrafica-ragazzi')
  OR has_page_access(auth.uid(), '/anagrafica-animatori')
  OR has_page_access(auth.uid(), '/anagrafica-montaggio-campeggio')
);

DROP POLICY IF EXISTS "Admin or permitted can update invio_massivo_job_items" ON public.invio_massivo_job_items;
CREATE POLICY "Admin or permitted can update invio_massivo_job_items"
ON public.invio_massivo_job_items FOR UPDATE TO authenticated
USING (
  is_admin()
  OR has_page_access(auth.uid(), '/anagrafica-ragazzi')
  OR has_page_access(auth.uid(), '/anagrafica-animatori')
  OR has_page_access(auth.uid(), '/anagrafica-montaggio-campeggio')
)
WITH CHECK (
  is_admin()
  OR has_page_access(auth.uid(), '/anagrafica-ragazzi')
  OR has_page_access(auth.uid(), '/anagrafica-animatori')
  OR has_page_access(auth.uid(), '/anagrafica-montaggio-campeggio')
);