-- =============================================
-- GAYATRI POWER OPERATIONS APP - DATABASE SCHEMA (FIXED)
-- Phase 1 & 2: Enhanced Checklist + Admin System
-- =============================================

-- ============= STEP 1: CREATE ENUMS =============

-- User role enum (CRITICAL: Separate table for security)
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'supervisor', 'operator');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Module types
DO $$ BEGIN
  CREATE TYPE public.module_type AS ENUM ('turbine_opu_cooling', 'generator', 'dewatering_sump', 'electrical_systems');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Input field types
DO $$ BEGIN
  CREATE TYPE public.field_type AS ENUM ('text', 'numerical', 'dropdown', 'checkbox', 'photo', 'video', 'range_numerical');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Issue status and priority
DO $$ BEGIN
  CREATE TYPE public.issue_status AS ENUM ('reported', 'in_progress', 'resolved', 'closed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.issue_priority AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============= STEP 2: USER ROLES TABLE (SECURITY CRITICAL) =============

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
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
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS Policies for user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ============= STEP 3: ENHANCED CHECKLIST STRUCTURE =============

-- Checklist templates (4 modules with 120+ items)
CREATE TABLE IF NOT EXISTS public.checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module module_type NOT NULL,
  section_name TEXT NOT NULL,
  item_name TEXT NOT NULL,
  item_description TEXT,
  field_type field_type NOT NULL,
  validation_rules JSONB,
  is_photo_required BOOLEAN DEFAULT false,
  is_video_required BOOLEAN DEFAULT false,
  is_conditional BOOLEAN DEFAULT false,
  conditional_logic JSONB,
  applies_to_unit TEXT[],
  sort_order INTEGER DEFAULT 0,
  interval_days INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Daily checklist submissions
CREATE TABLE IF NOT EXISTS public.daily_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  operator_name TEXT NOT NULL,
  checklist_date DATE NOT NULL,
  shift TEXT DEFAULT 'Day',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  total_items INTEGER DEFAULT 0,
  completed_items INTEGER DEFAULT 0,
  flagged_issues_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'in_progress',
  module_progress JSONB DEFAULT '{}',
  UNIQUE(user_id, checklist_date)
);

ALTER TABLE public.daily_checklists ENABLE ROW LEVEL SECURITY;

-- Checklist item responses
CREATE TABLE IF NOT EXISTS public.checklist_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID REFERENCES public.daily_checklists(id) ON DELETE CASCADE NOT NULL,
  template_id UUID REFERENCES public.checklist_templates(id) NOT NULL,
  unit TEXT,
  response_value TEXT,
  numerical_value DECIMAL,
  validation_status TEXT DEFAULT 'normal',
  has_issue BOOLEAN DEFAULT false,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.checklist_responses ENABLE ROW LEVEL SECURITY;

-- Media attachments (photos/videos)
CREATE TABLE IF NOT EXISTS public.checklist_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID REFERENCES public.checklist_responses(id) ON DELETE CASCADE NOT NULL,
  media_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size INTEGER,
  duration INTEGER,
  thumbnail_path TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.checklist_media ENABLE ROW LEVEL SECURITY;

-- ============= STEP 4: ISSUE TRACKING SYSTEM =============

CREATE TABLE IF NOT EXISTS public.checklist_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_number TEXT UNIQUE NOT NULL,
  checklist_id UUID REFERENCES public.daily_checklists(id),
  response_id UUID REFERENCES public.checklist_responses(id),
  module module_type NOT NULL,
  section_name TEXT NOT NULL,
  item_name TEXT NOT NULL,
  unit TEXT,
  description TEXT NOT NULL,
  priority issue_priority NOT NULL,
  status issue_status DEFAULT 'reported',
  reported_by UUID REFERENCES auth.users(id) NOT NULL,
  reported_by_name TEXT NOT NULL,
  reported_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  assigned_to TEXT,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.checklist_issues ENABLE ROW LEVEL SECURITY;

-- ============= STEP 5: INTERVAL REMINDERS =============

CREATE TABLE IF NOT EXISTS public.interval_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.checklist_templates(id) NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  reminder_type TEXT NOT NULL,
  interval_days INTEGER NOT NULL,
  last_completed_date DATE,
  next_due_date DATE NOT NULL,
  notification_sent BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(template_id, user_id, reminder_type)
);

ALTER TABLE public.interval_reminders ENABLE ROW LEVEL SECURITY;

-- ============= STEP 6: RLS POLICIES =============

-- Daily checklists policies
DROP POLICY IF EXISTS "Operators can view own checklists" ON public.daily_checklists;
CREATE POLICY "Operators can view own checklists"
  ON public.daily_checklists FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Operators can insert own checklists" ON public.daily_checklists;
CREATE POLICY "Operators can insert own checklists"
  ON public.daily_checklists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Operators can update own checklists" ON public.daily_checklists;
CREATE POLICY "Operators can update own checklists"
  ON public.daily_checklists FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all checklists" ON public.daily_checklists;
CREATE POLICY "Admins can view all checklists"
  ON public.daily_checklists FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Checklist responses policies
DROP POLICY IF EXISTS "Users can view own responses" ON public.checklist_responses;
CREATE POLICY "Users can view own responses"
  ON public.checklist_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.daily_checklists
      WHERE id = checklist_responses.checklist_id
        AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own responses" ON public.checklist_responses;
CREATE POLICY "Users can insert own responses"
  ON public.checklist_responses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.daily_checklists
      WHERE id = checklist_responses.checklist_id
        AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own responses" ON public.checklist_responses;
CREATE POLICY "Users can update own responses"
  ON public.checklist_responses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.daily_checklists
      WHERE id = checklist_responses.checklist_id
        AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can view all responses" ON public.checklist_responses;
CREATE POLICY "Admins can view all responses"
  ON public.checklist_responses FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Media policies
DROP POLICY IF EXISTS "Users can view own media" ON public.checklist_media;
CREATE POLICY "Users can view own media"
  ON public.checklist_media FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.checklist_responses cr
      JOIN public.daily_checklists dc ON cr.checklist_id = dc.id
      WHERE cr.id = checklist_media.response_id
        AND dc.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own media" ON public.checklist_media;
CREATE POLICY "Users can insert own media"
  ON public.checklist_media FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.checklist_responses cr
      JOIN public.daily_checklists dc ON cr.checklist_id = dc.id
      WHERE cr.id = checklist_media.response_id
        AND dc.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can view all media" ON public.checklist_media;
CREATE POLICY "Admins can view all media"
  ON public.checklist_media FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Issues policies
DROP POLICY IF EXISTS "Users can view own issues" ON public.checklist_issues;
CREATE POLICY "Users can view own issues"
  ON public.checklist_issues FOR SELECT
  USING (auth.uid() = reported_by);

DROP POLICY IF EXISTS "Users can insert own issues" ON public.checklist_issues;
CREATE POLICY "Users can insert own issues"
  ON public.checklist_issues FOR INSERT
  WITH CHECK (auth.uid() = reported_by);

DROP POLICY IF EXISTS "Users can update own issues" ON public.checklist_issues;
CREATE POLICY "Users can update own issues"
  ON public.checklist_issues FOR UPDATE
  USING (auth.uid() = reported_by);

DROP POLICY IF EXISTS "Admins can view all issues" ON public.checklist_issues;
CREATE POLICY "Admins can view all issues"
  ON public.checklist_issues FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update all issues" ON public.checklist_issues;
CREATE POLICY "Admins can update all issues"
  ON public.checklist_issues FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Interval reminders policies
DROP POLICY IF EXISTS "Users can view own reminders" ON public.interval_reminders;
CREATE POLICY "Users can view own reminders"
  ON public.interval_reminders FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can update own reminders" ON public.interval_reminders;
CREATE POLICY "Users can update own reminders"
  ON public.interval_reminders FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all reminders" ON public.interval_reminders;
CREATE POLICY "Admins can view all reminders"
  ON public.interval_reminders FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Checklist templates (public read for all authenticated users)
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view templates" ON public.checklist_templates;
CREATE POLICY "Authenticated users can view templates"
  ON public.checklist_templates FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins can manage templates" ON public.checklist_templates;
CREATE POLICY "Admins can manage templates"
  ON public.checklist_templates FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ============= STEP 7: FUNCTIONS & TRIGGERS =============

-- Auto-generate issue numbers
CREATE OR REPLACE FUNCTION public.generate_issue_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_num INTEGER;
  year_part TEXT;
BEGIN
  year_part := EXTRACT(YEAR FROM now())::TEXT;
  
  SELECT COUNT(*) + 1 INTO next_num
  FROM public.checklist_issues
  WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM now());
  
  RETURN 'ISS-' || year_part || '-' || LPAD(next_num::TEXT, 3, '0');
END;
$$;

-- Trigger to set issue number
CREATE OR REPLACE FUNCTION public.set_issue_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.issue_number IS NULL THEN
    NEW.issue_number := public.generate_issue_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_issue_number_trigger ON public.checklist_issues;
CREATE TRIGGER set_issue_number_trigger
  BEFORE INSERT ON public.checklist_issues
  FOR EACH ROW
  EXECUTE FUNCTION public.set_issue_number();

-- Update checklist progress
CREATE OR REPLACE FUNCTION public.update_checklist_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.daily_checklists
  SET 
    completed_items = (
      SELECT COUNT(*) 
      FROM public.checklist_responses 
      WHERE checklist_id = NEW.checklist_id
        AND response_value IS NOT NULL
    ),
    flagged_issues_count = (
      SELECT COUNT(*) 
      FROM public.checklist_responses 
      WHERE checklist_id = NEW.checklist_id
        AND has_issue = true
    )
  WHERE id = NEW.checklist_id;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_progress_trigger ON public.checklist_responses;
CREATE TRIGGER update_progress_trigger
  AFTER INSERT OR UPDATE ON public.checklist_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_checklist_progress();

-- ============= STEP 8: INDEXES FOR PERFORMANCE =============

CREATE INDEX IF NOT EXISTS idx_daily_checklists_user_date ON public.daily_checklists(user_id, checklist_date);
CREATE INDEX IF NOT EXISTS idx_daily_checklists_date ON public.daily_checklists(checklist_date);
CREATE INDEX IF NOT EXISTS idx_responses_checklist ON public.checklist_responses(checklist_id);
CREATE INDEX IF NOT EXISTS idx_issues_status2 ON public.checklist_issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_date2 ON public.checklist_issues(reported_at);
CREATE INDEX IF NOT EXISTS idx_media_response ON public.checklist_media(response_id);
CREATE INDEX IF NOT EXISTS idx_templates_module ON public.checklist_templates(module, sort_order);

-- Update profiles table to remove role (SECURITY: roles must be in separate table)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;