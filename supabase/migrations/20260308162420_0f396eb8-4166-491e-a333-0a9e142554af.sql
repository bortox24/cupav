
INSERT INTO storage.buckets (id, name, public) VALUES ('regolamento', 'regolamento', true);

CREATE POLICY "Anyone authenticated can read regolamento" ON storage.objects FOR SELECT USING (bucket_id = 'regolamento' AND auth.uid() IS NOT NULL);
CREATE POLICY "Admins can upload regolamento" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'regolamento' AND public.is_admin());
CREATE POLICY "Admins can update regolamento" ON storage.objects FOR UPDATE USING (bucket_id = 'regolamento' AND public.is_admin());
CREATE POLICY "Admins can delete regolamento" ON storage.objects FOR DELETE USING (bucket_id = 'regolamento' AND public.is_admin());
