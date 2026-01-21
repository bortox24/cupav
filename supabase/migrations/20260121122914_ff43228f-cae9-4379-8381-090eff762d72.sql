-- Add policy for users with page permissions to view form responses
CREATE POLICY "Users with page permission can view responses"
ON public.form_responses
FOR SELECT
USING (
  is_admin() OR 
  EXISTS (
    SELECT 1 FROM user_page_permissions 
    WHERE user_id = auth.uid() 
    AND can_access = true 
    AND (
      page_path = '/visualizza-moduli/:id/risposte' OR 
      page_path LIKE '/visualizza-moduli/%/risposte'
    )
  )
);