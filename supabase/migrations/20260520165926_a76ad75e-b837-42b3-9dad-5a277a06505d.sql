
-- Jobs table
CREATE TABLE public.invio_massivo_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  created_by_nome text NOT NULL,
  titolo text NOT NULL,
  testo text NOT NULL,
  cta_label text,
  cta_url text,
  webhook_id uuid,
  webhook_url text NOT NULL,
  webhook_descrizione text,
  filtri jsonb NOT NULL DEFAULT '{}'::jsonb,
  dry_run boolean NOT NULL DEFAULT false,
  send_interval_seconds integer NOT NULL DEFAULT 30,
  stato text NOT NULL DEFAULT 'queued',
  totale integer NOT NULL DEFAULT 0,
  inviati integer NOT NULL DEFAULT 0,
  falliti integer NOT NULL DEFAULT 0,
  current_index integer NOT NULL DEFAULT 0,
  abort_requested boolean NOT NULL DEFAULT false,
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  last_heartbeat_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invio_massivo_jobs_stato_check CHECK (stato IN ('queued','running','completed','aborted','failed'))
);

CREATE INDEX idx_invio_massivo_jobs_created_by_stato ON public.invio_massivo_jobs(created_by, stato);
CREATE INDEX idx_invio_massivo_jobs_stato_heartbeat ON public.invio_massivo_jobs(stato, last_heartbeat_at);

ALTER TABLE public.invio_massivo_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin or permitted can select invio_massivo_jobs"
  ON public.invio_massivo_jobs FOR SELECT TO authenticated
  USING (public.is_admin() OR public.has_page_access(auth.uid(), '/anagrafica-ragazzi'));

CREATE POLICY "Admin or permitted can insert invio_massivo_jobs"
  ON public.invio_massivo_jobs FOR INSERT TO authenticated
  WITH CHECK ((public.is_admin() OR public.has_page_access(auth.uid(), '/anagrafica-ragazzi')) AND created_by = auth.uid());

CREATE POLICY "Admin or permitted can update invio_massivo_jobs"
  ON public.invio_massivo_jobs FOR UPDATE TO authenticated
  USING (public.is_admin() OR public.has_page_access(auth.uid(), '/anagrafica-ragazzi'))
  WITH CHECK (public.is_admin() OR public.has_page_access(auth.uid(), '/anagrafica-ragazzi'));

CREATE POLICY "Admin or owner can delete invio_massivo_jobs"
  ON public.invio_massivo_jobs FOR DELETE TO authenticated
  USING (public.is_admin() OR created_by = auth.uid());

CREATE TRIGGER trg_invio_massivo_jobs_updated_at
  BEFORE UPDATE ON public.invio_massivo_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Items table
CREATE TABLE public.invio_massivo_job_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.invio_massivo_jobs(id) ON DELETE CASCADE,
  position integer NOT NULL,
  ragazzo_id uuid,
  ragazzo_full_name text NOT NULL,
  genitore_nome text NOT NULL DEFAULT 'Genitore',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  stato text NOT NULL DEFAULT 'pending',
  error_message text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invio_massivo_job_items_stato_check CHECK (stato IN ('pending','sending','sent','error','skipped'))
);

CREATE INDEX idx_invio_massivo_job_items_job_pos ON public.invio_massivo_job_items(job_id, position);
CREATE INDEX idx_invio_massivo_job_items_job_stato ON public.invio_massivo_job_items(job_id, stato);

ALTER TABLE public.invio_massivo_job_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin or permitted can select invio_massivo_job_items"
  ON public.invio_massivo_job_items FOR SELECT TO authenticated
  USING (public.is_admin() OR public.has_page_access(auth.uid(), '/anagrafica-ragazzi'));

CREATE POLICY "Admin or permitted can insert invio_massivo_job_items"
  ON public.invio_massivo_job_items FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR public.has_page_access(auth.uid(), '/anagrafica-ragazzi'));

CREATE POLICY "Admin or permitted can update invio_massivo_job_items"
  ON public.invio_massivo_job_items FOR UPDATE TO authenticated
  USING (public.is_admin() OR public.has_page_access(auth.uid(), '/anagrafica-ragazzi'))
  WITH CHECK (public.is_admin() OR public.has_page_access(auth.uid(), '/anagrafica-ragazzi'));

CREATE POLICY "Admin can delete invio_massivo_job_items"
  ON public.invio_massivo_job_items FOR DELETE TO authenticated
  USING (public.is_admin());

-- Realtime
ALTER TABLE public.invio_massivo_jobs REPLICA IDENTITY FULL;
ALTER TABLE public.invio_massivo_job_items REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.invio_massivo_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.invio_massivo_job_items;
