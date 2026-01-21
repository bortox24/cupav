-- =============================================
-- PARTE 1: Sistema Moduli
-- =============================================

-- Tabella per definire i moduli
CREATE TABLE public.forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  form_schema JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabella per le risposte dei moduli
CREATE TABLE public.form_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger per updated_at su forms
CREATE TRIGGER update_forms_updated_at
  BEFORE UPDATE ON public.forms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indici per performance
CREATE INDEX idx_forms_slug ON public.forms(slug);
CREATE INDEX idx_forms_is_active ON public.forms(is_active);
CREATE INDEX idx_form_responses_form_id ON public.form_responses(form_id);
CREATE INDEX idx_form_responses_created_at ON public.form_responses(created_at);

-- Enable RLS
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_responses ENABLE ROW LEVEL SECURITY;

-- Policies per forms
CREATE POLICY "Admins can manage forms"
  ON public.forms FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Anyone can view active forms"
  ON public.forms FOR SELECT
  USING (is_active = true);

-- Policies per form_responses
CREATE POLICY "Anyone can insert responses"
  ON public.form_responses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.forms 
      WHERE id = form_id AND is_active = true
    )
  );

CREATE POLICY "Admins can view all responses"
  ON public.form_responses FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can delete responses"
  ON public.form_responses FOR DELETE
  USING (is_admin());

-- =============================================
-- PARTE 2: Sistema Ruoli Dinamici
-- =============================================

-- Tabella per i ruoli personalizzabili
CREATE TABLE public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT 'gray',
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabella per i permessi delle pagine per ruolo
CREATE TABLE public.role_page_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  page_path TEXT NOT NULL,
  can_access BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(role_id, page_path)
);

-- Indici
CREATE INDEX idx_roles_name ON public.roles(name);
CREATE INDEX idx_role_page_permissions_role_id ON public.role_page_permissions(role_id);

-- Enable RLS
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_page_permissions ENABLE ROW LEVEL SECURITY;

-- Policies per roles
CREATE POLICY "Everyone can view roles"
  ON public.roles FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage roles"
  ON public.roles FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Policies per role_page_permissions
CREATE POLICY "Everyone can view role permissions"
  ON public.role_page_permissions FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage role permissions"
  ON public.role_page_permissions FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- =============================================
-- MIGRAZIONE DATI: Inserire ruoli esistenti
-- =============================================

INSERT INTO public.roles (name, label, description, color, is_system) VALUES
  ('admin', 'Amministratore', 'Accesso completo a tutte le funzionalità', 'red', true),
  ('tesoriere', 'Tesoriere', 'Può registrare transazioni e visualizzare dashboard', 'blue', true),
  ('visualizzatore', 'Visualizzatore', 'Accesso in sola lettura a dashboard e dati', 'green', true);

-- Inserire permessi di default per ogni ruolo
INSERT INTO public.role_page_permissions (role_id, page_path, can_access)
SELECT r.id, p.path, 
  CASE 
    WHEN r.name = 'admin' THEN true
    WHEN r.name = 'tesoriere' AND p.path IN ('/home', '/registrazione-spese-prelievi', '/controllo-spese') THEN true
    WHEN r.name = 'visualizzatore' AND p.path IN ('/home', '/controllo-spese') THEN true
    ELSE false
  END
FROM public.roles r
CROSS JOIN (
  VALUES 
    ('/home'),
    ('/registrazione-spese-prelievi'),
    ('/controllo-spese'),
    ('/admin/permessi'),
    ('/admin/categorie'),
    ('/admin/permessi-pagine'),
    ('/admin/moduli'),
    ('/admin/ruoli')
) AS p(path);

-- =============================================
-- Inserire il primo modulo: Manifestazione Interesse Campeggio
-- =============================================

INSERT INTO public.forms (name, slug, description, form_schema, is_active) VALUES
(
  'Manifestazione Interesse Campeggio 2025',
  'campeggio-2025',
  'Modulo per manifestare interesse al campeggio estivo CUPAV 2025',
  '[
    {"name": "nome_genitore", "label": "Nome e Cognome Genitore", "type": "text", "required": true},
    {"name": "nome_bambino", "label": "Nome e Cognome Bambino/a", "type": "text", "required": true},
    {"name": "data_nascita", "label": "Data di Nascita Bambino/a", "type": "date", "required": true},
    {"name": "turno", "label": "Turno Iscrizione", "type": "select", "required": true, "options": ["4 Elementare", "5 Elementare"]},
    {"name": "interessato", "label": "Sono interessato?", "type": "radio", "required": true, "options": ["Sì", "No"]}
  ]'::jsonb,
  true
);