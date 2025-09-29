-- Create employee profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'technician',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create equipment table (units that need maintenance)
CREATE TABLE public.equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  qr_code TEXT UNIQUE NOT NULL,
  location TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create checklist templates
CREATE TABLE public.checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  equipment_id UUID REFERENCES public.equipment(id) ON DELETE CASCADE,
  frequency TEXT NOT NULL DEFAULT 'daily',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create checklist items (template items)
CREATE TABLE public.checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID NOT NULL REFERENCES public.checklists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create completed checklists (records)
CREATE TABLE public.completed_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID NOT NULL REFERENCES public.checklists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT
);

-- Create completed items (individual checks)
CREATE TABLE public.completed_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  completed_checklist_id UUID NOT NULL REFERENCES public.completed_checklists(id) ON DELETE CASCADE,
  checklist_item_id UUID NOT NULL REFERENCES public.checklist_items(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pass', 'fail', 'na')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create photos table
CREATE TABLE public.photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  completed_item_id UUID NOT NULL REFERENCES public.completed_items(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.completed_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.completed_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for equipment (all authenticated users can view)
CREATE POLICY "Authenticated users can view equipment" ON public.equipment FOR SELECT USING (auth.uid() IS NOT NULL);

-- RLS Policies for checklists
CREATE POLICY "Authenticated users can view checklists" ON public.checklists FOR SELECT USING (auth.uid() IS NOT NULL);

-- RLS Policies for checklist_items
CREATE POLICY "Authenticated users can view checklist items" ON public.checklist_items FOR SELECT USING (auth.uid() IS NOT NULL);

-- RLS Policies for completed_checklists
CREATE POLICY "Users can view all completed checklists" ON public.completed_checklists FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can insert own completed checklists" ON public.completed_checklists FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for completed_items
CREATE POLICY "Users can view completed items" ON public.completed_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.completed_checklists 
    WHERE id = completed_items.completed_checklist_id
  )
);
CREATE POLICY "Users can insert completed items" ON public.completed_items FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.completed_checklists 
    WHERE id = completed_items.completed_checklist_id 
    AND user_id = auth.uid()
  )
);

-- RLS Policies for photos
CREATE POLICY "Users can view photos" ON public.photos FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.completed_items ci
    JOIN public.completed_checklists cc ON ci.completed_checklist_id = cc.id
    WHERE ci.id = photos.completed_item_id
  )
);
CREATE POLICY "Users can insert photos" ON public.photos FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.completed_items ci
    JOIN public.completed_checklists cc ON ci.completed_checklist_id = cc.id
    WHERE ci.id = photos.completed_item_id 
    AND cc.user_id = auth.uid()
  )
);

-- Create trigger function for profile updates
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'technician')
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function for updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Add updated_at trigger to profiles
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create storage bucket for photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('maintenance-photos', 'maintenance-photos', false);

-- Storage policies for maintenance photos
CREATE POLICY "Authenticated users can view maintenance photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'maintenance-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can upload maintenance photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'maintenance-photos' AND auth.uid() IS NOT NULL);

-- Insert sample equipment data
INSERT INTO public.equipment (name, qr_code, location, description) VALUES
('Oil Pressure Unit', 'OPU-001', 'Engine Room A', 'Main oil pressure monitoring system'),
('Cooling System A', 'CS-A-001', 'North Wing', 'Primary cooling system'),
('Hydraulic Press 1', 'HP-001', 'Production Floor', 'Main hydraulic press unit'),
('Generator 1', 'GEN-001', 'Power Room', 'Primary backup generator'),
('Air Compressor', 'AC-001', 'Utility Room', 'Main air compression unit');

-- Insert sample checklist
INSERT INTO public.checklists (title, description, equipment_id, frequency)
SELECT 
  'Daily Oil Pressure Check',
  'Regular inspection of oil pressure unit',
  id,
  'daily'
FROM public.equipment WHERE qr_code = 'OPU-001';

-- Insert checklist items
INSERT INTO public.checklist_items (checklist_id, title, description, sort_order)
SELECT 
  id,
  title,
  description,
  sort_order
FROM (
  SELECT 
    (SELECT id FROM public.checklists WHERE title = 'Daily Oil Pressure Check') as id,
    'Check Oil Level' as title,
    'Verify oil is between min and max markers' as description,
    1 as sort_order
  UNION ALL
  SELECT 
    (SELECT id FROM public.checklists WHERE title = 'Daily Oil Pressure Check'),
    'Inspect for Leaks',
    'Visual inspection of all connections and seals',
    2
  UNION ALL
  SELECT 
    (SELECT id FROM public.checklists WHERE title = 'Daily Oil Pressure Check'),
    'Test Pressure Gauge',
    'Verify pressure gauge reads within normal range (40-60 PSI)',
    3
  UNION ALL
  SELECT 
    (SELECT id FROM public.checklists WHERE title = 'Daily Oil Pressure Check'),
    'Check Filter Condition',
    'Inspect oil filter for contamination',
    4
  UNION ALL
  SELECT 
    (SELECT id FROM public.checklists WHERE title = 'Daily Oil Pressure Check'),
    'Listen for Abnormal Sounds',
    'Check for unusual noises during operation',
    5
) items;