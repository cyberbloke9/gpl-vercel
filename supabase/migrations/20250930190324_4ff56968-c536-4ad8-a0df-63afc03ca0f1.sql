-- Add issues table for tracking flagged items with timestamps
CREATE TABLE public.issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  completed_item_id UUID NOT NULL REFERENCES public.completed_items(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  reported_by UUID NOT NULL REFERENCES auth.users(id),
  reported_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add reports table for consolidated reports
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'daily' CHECK (report_type IN ('daily', 'weekly', 'monthly', 'custom')),
  generated_by UUID NOT NULL REFERENCES auth.users(id),
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  date_from TIMESTAMP WITH TIME ZONE NOT NULL,
  date_to TIMESTAMP WITH TIME ZONE NOT NULL,
  summary JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add category_unlocked_at to completed_checklists for tracking when QR was scanned
ALTER TABLE public.completed_checklists
ADD COLUMN category_unlocked_at TIMESTAMP WITH TIME ZONE;

-- Add category field to equipment for category-specific QR codes
ALTER TABLE public.equipment
ADD COLUMN category TEXT NOT NULL DEFAULT 'General';

-- Enable RLS on new tables
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for issues table
CREATE POLICY "Users can view all issues"
  ON public.issues FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create issues"
  ON public.issues FOR INSERT
  WITH CHECK (auth.uid() = reported_by);

CREATE POLICY "Users can update own issues"
  ON public.issues FOR UPDATE
  USING (auth.uid() = reported_by);

-- RLS Policies for reports table
CREATE POLICY "Users can view all reports"
  ON public.reports FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create reports"
  ON public.reports FOR INSERT
  WITH CHECK (auth.uid() = generated_by);

-- Create indexes for performance
CREATE INDEX idx_issues_status ON public.issues(status);
CREATE INDEX idx_issues_priority ON public.issues(priority);
CREATE INDEX idx_issues_reported_at ON public.issues(reported_at);
CREATE INDEX idx_reports_generated_at ON public.reports(generated_at);
CREATE INDEX idx_equipment_category ON public.equipment(category);

-- Update trigger for issues table
CREATE TRIGGER update_issues_updated_at
  BEFORE UPDATE ON public.issues
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Insert 6 category-based checklists (one for each major system)
INSERT INTO public.checklists (title, description, frequency, equipment_id)
VALUES
  ('Turbine System Checklist', 'Daily maintenance checks for turbine system', 'daily', NULL),
  ('Oil Pressure Unit Checklist', 'Daily monitoring of oil pressure systems', 'daily', NULL),
  ('Cooling System Checklist', 'Daily cooling system inspection and maintenance', 'daily', NULL),
  ('Generator Checklist', 'Daily generator system checks', 'daily', NULL),
  ('Electrical Systems Checklist', 'Daily electrical system inspection', 'daily', NULL),
  ('Safety & General Checklist', 'Daily safety and general maintenance checks', 'daily', NULL);

-- Update existing equipment to assign categories
UPDATE public.equipment
SET category = 'Turbine System'
WHERE name LIKE '%Turbine%' OR name LIKE '%TRB%';

UPDATE public.equipment
SET category = 'Oil Pressure Unit'
WHERE name LIKE '%Oil%' OR name LIKE '%Pressure%' OR name LIKE '%OPU%';

UPDATE public.equipment
SET category = 'Cooling System'
WHERE name LIKE '%Cooling%' OR name LIKE '%Cool%' OR name LIKE '%CLG%';

UPDATE public.equipment
SET category = 'Generator'
WHERE name LIKE '%Generator%' OR name LIKE '%GEN%';

UPDATE public.equipment
SET category = 'Electrical Systems'
WHERE name LIKE '%Electrical%' OR name LIKE '%Electric%' OR name LIKE '%ELC%';

UPDATE public.equipment
SET category = 'Safety & General'
WHERE category = 'General';