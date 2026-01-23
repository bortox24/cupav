-- Aggiungere colonna webhook_url alla tabella forms
ALTER TABLE public.forms 
ADD COLUMN webhook_url TEXT DEFAULT NULL;

COMMENT ON COLUMN public.forms.webhook_url IS 'URL webhook n8n per invio automatico dati dopo compilazione modulo';