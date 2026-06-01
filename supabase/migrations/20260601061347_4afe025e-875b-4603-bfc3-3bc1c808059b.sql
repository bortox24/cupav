CREATE POLICY "Authenticated users can read webhook_config"
ON public.webhook_config
FOR SELECT
TO authenticated
USING (true);

GRANT SELECT ON public.webhook_config TO authenticated;