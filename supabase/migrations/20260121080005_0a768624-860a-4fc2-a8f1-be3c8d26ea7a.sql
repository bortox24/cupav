-- =============================================
-- CUPAV Dashboard - Complete Database Schema
-- =============================================

-- 1. Create enum for transaction types
CREATE TYPE public.transaction_type AS ENUM ('spesa', 'prelievo', 'entrata');

-- 2. Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'tesoriere', 'visualizzatore');

-- 3. Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'visualizzatore',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- 5. Create categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type transaction_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 6. Create transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  causale TEXT NOT NULL,
  importo DECIMAL(10,2) NOT NULL,
  data_transazione DATE NOT NULL DEFAULT CURRENT_DATE,
  tipologia transaction_type NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- HELPER FUNCTIONS (Security Definer)
-- =============================================

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

-- Function to check if current user is tesoriere
CREATE OR REPLACE FUNCTION public.is_tesoriere()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'tesoriere')
$$;

-- Function to check if current user is visualizzatore
CREATE OR REPLACE FUNCTION public.is_visualizzatore()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'visualizzatore')
$$;

-- Function to check if user can manage transactions (admin or own transactions)
CREATE OR REPLACE FUNCTION public.can_manage_transaction(_transaction_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin() OR (auth.uid() = _transaction_user_id AND public.is_tesoriere())
$$;

-- =============================================
-- ENABLE RLS ON ALL TABLES
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES - PROFILES
-- =============================================

-- All authenticated users can view all profiles
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Only system can insert profiles (via trigger)
CREATE POLICY "System can insert profiles"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- =============================================
-- RLS POLICIES - USER_ROLES
-- =============================================

-- All authenticated users can see their own role
CREATE POLICY "Users can view own role"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

-- Only admins can insert roles
CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- Only admins can update roles
CREATE POLICY "Admins can update roles"
ON public.user_roles FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Only admins can delete roles
CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (public.is_admin());

-- =============================================
-- RLS POLICIES - CATEGORIES
-- =============================================

-- All authenticated users can view categories
CREATE POLICY "Authenticated users can view categories"
ON public.categories FOR SELECT
TO authenticated
USING (true);

-- Admin and Tesoriere can insert categories
CREATE POLICY "Admin and Tesoriere can insert categories"
ON public.categories FOR INSERT
TO authenticated
WITH CHECK (public.is_admin() OR public.is_tesoriere());

-- Only admin can update/delete categories
CREATE POLICY "Admin can update categories"
ON public.categories FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admin can delete categories"
ON public.categories FOR DELETE
TO authenticated
USING (public.is_admin());

-- =============================================
-- RLS POLICIES - TRANSACTIONS
-- =============================================

-- All authenticated users can view transactions
CREATE POLICY "Authenticated users can view transactions"
ON public.transactions FOR SELECT
TO authenticated
USING (true);

-- Admin and Tesoriere can insert transactions
CREATE POLICY "Admin and Tesoriere can insert transactions"
ON public.transactions FOR INSERT
TO authenticated
WITH CHECK (
  (public.is_admin() OR public.is_tesoriere()) 
  AND user_id = auth.uid()
);

-- Only admin can update transactions
CREATE POLICY "Admin can update transactions"
ON public.transactions FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Only admin can delete transactions
CREATE POLICY "Admin can delete transactions"
ON public.transactions FOR DELETE
TO authenticated
USING (public.is_admin());

-- =============================================
-- TRIGGERS
-- =============================================

-- Trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- INSERT DEFAULT CATEGORIES
-- =============================================

-- Spese categories
INSERT INTO public.categories (name, type) VALUES
  ('Materiale attività', 'spesa'),
  ('Alimentari', 'spesa'),
  ('Trasporto', 'spesa'),
  ('Manutenzione', 'spesa'),
  ('Utenze', 'spesa'),
  ('Attrezzature', 'spesa'),
  ('Altro (Spesa)', 'spesa');

-- Prelievi categories
INSERT INTO public.categories (name, type) VALUES
  ('Prelievo cassa', 'prelievo'),
  ('Anticipo spese', 'prelievo'),
  ('Altro (Prelievo)', 'prelievo');

-- Entrate categories
INSERT INTO public.categories (name, type) VALUES
  ('Quote partecipazione', 'entrata'),
  ('Donazioni', 'entrata'),
  ('Contributi parrocchia', 'entrata'),
  ('Vendita materiale', 'entrata'),
  ('Altro (Entrata)', 'entrata');