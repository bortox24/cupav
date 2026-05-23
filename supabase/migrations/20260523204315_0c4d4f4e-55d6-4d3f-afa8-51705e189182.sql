
-- 1. ANIMATORI: rimuovi policy permissiva
DROP POLICY IF EXISTS "Authenticated can read animatori" ON public.animatori;

-- 2. ANIMATORI_TURNI: sostituisci policy permissiva
DROP POLICY IF EXISTS "Authenticated can read animatori_turni" ON public.animatori_turni;
CREATE POLICY "Admin or permitted users can select animatori_turni"
  ON public.animatori_turni FOR SELECT TO authenticated
  USING (is_admin() OR has_page_access(auth.uid(), '/anagrafica-animatori'));

-- 3. has_page_access / has_turno_access: aggiungono check is_active
CREATE OR REPLACE FUNCTION public.has_page_access(_user_id uuid, _page_path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_page_permissions upp
    JOIN profiles p ON p.id = upp.user_id
    WHERE upp.user_id = _user_id
      AND upp.page_path = _page_path
      AND upp.can_access = true
      AND p.is_active = true
  )
$$;

CREATE OR REPLACE FUNCTION public.has_turno_access(_user_id uuid, _turno text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.turno_permessi tp
    JOIN public.profiles p ON p.id = tp.user_id
    WHERE tp.user_id = _user_id
      AND tp.turno = _turno
      AND p.is_active = true
  )
$$;

-- 4. ISCRIZIONI (ragazzi - legacy): restringi SELECT/UPDATE/DELETE
DROP POLICY IF EXISTS "Authenticated users can select iscrizioni" ON public.iscrizioni;
DROP POLICY IF EXISTS "Authenticated users can update iscrizioni" ON public.iscrizioni;
DROP POLICY IF EXISTS "Authenticated users can delete iscrizioni" ON public.iscrizioni;

CREATE POLICY "Admin or permitted users can select iscrizioni"
  ON public.iscrizioni FOR SELECT TO authenticated
  USING (is_admin() OR has_page_access(auth.uid(), '/anagrafica-ragazzi'));

CREATE POLICY "Admin or permitted users can update iscrizioni"
  ON public.iscrizioni FOR UPDATE TO authenticated
  USING (is_admin() OR has_page_access(auth.uid(), '/anagrafica-ragazzi'))
  WITH CHECK (is_admin() OR has_page_access(auth.uid(), '/anagrafica-ragazzi'));

CREATE POLICY "Admin or permitted users can delete iscrizioni"
  ON public.iscrizioni FOR DELETE TO authenticated
  USING (is_admin() OR has_page_access(auth.uid(), '/anagrafica-ragazzi'));

-- 5. WEBHOOK_CONFIG: solo admin
DROP POLICY IF EXISTS "Authenticated users can select webhook_config" ON public.webhook_config;
DROP POLICY IF EXISTS "Authenticated users can insert webhook_config" ON public.webhook_config;
DROP POLICY IF EXISTS "Authenticated users can update webhook_config" ON public.webhook_config;
DROP POLICY IF EXISTS "Authenticated users can delete webhook_config" ON public.webhook_config;

CREATE POLICY "Admins can manage webhook_config"
  ON public.webhook_config FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- 6. STORAGE: bucket immaginivarie - protezione scrittura
DROP POLICY IF EXISTS "immaginivarie public read" ON storage.objects;
DROP POLICY IF EXISTS "immaginivarie admin insert" ON storage.objects;
DROP POLICY IF EXISTS "immaginivarie admin update" ON storage.objects;
DROP POLICY IF EXISTS "immaginivarie admin delete" ON storage.objects;

CREATE POLICY "immaginivarie public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'immaginivarie');

CREATE POLICY "immaginivarie admin insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'immaginivarie' AND (is_admin() OR has_page_access(auth.uid(), '/impostazioni')));

CREATE POLICY "immaginivarie admin update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'immaginivarie' AND (is_admin() OR has_page_access(auth.uid(), '/impostazioni')))
  WITH CHECK (bucket_id = 'immaginivarie' AND (is_admin() OR has_page_access(auth.uid(), '/impostazioni')));

CREATE POLICY "immaginivarie admin delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'immaginivarie' AND (is_admin() OR has_page_access(auth.uid(), '/impostazioni')));
