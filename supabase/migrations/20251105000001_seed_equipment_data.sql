-- =============================================
-- SEED: Equipment and Checklist Data
-- Date: 2025-11-05
-- Purpose: Add all 6 equipment categories with checklists
-- =============================================

-- Insert equipment for all 6 categories
INSERT INTO public.equipment (name, qr_code, location, description) VALUES
  ('Turbine System', 'TURB-2025-001', 'Power House - Main Floor', 'Main turbine unit for hydroelectric power generation'),
  ('Oil Pressure Unit', 'OPU-2025-001', 'Power House - Ground Level', 'Hydraulic oil pressure system for turbine control'),
  ('Cooling System', 'CS-2025-001', 'Power House - Basement', 'Water cooling system for generator and bearings'),
  ('Generator', 'GEN-2025-001', 'Power House - Main Floor', 'Main electric generator unit'),
  ('Electrical Systems', 'ELEC-2025-001', 'Control Room', 'Main electrical switchgear and control systems'),
  ('Safety & General', 'SAFE-2025-001', 'Entire Facility', 'General safety equipment and facility inspection')
ON CONFLICT (qr_code) DO NOTHING;

-- Create checklists for each equipment category
DO $$
DECLARE
  turb_id UUID;
  opu_id UUID;
  cool_id UUID;
  gen_id UUID;
  elec_id UUID;
  safe_id UUID;
  turb_checklist_id UUID;
  opu_checklist_id UUID;
  cool_checklist_id UUID;
  gen_checklist_id UUID;
  elec_checklist_id UUID;
  safe_checklist_id UUID;
BEGIN
  -- Get equipment IDs
  SELECT id INTO turb_id FROM public.equipment WHERE qr_code = 'TURB-2025-001';
  SELECT id INTO opu_id FROM public.equipment WHERE qr_code = 'OPU-2025-001';
  SELECT id INTO cool_id FROM public.equipment WHERE qr_code = 'CS-2025-001';
  SELECT id INTO gen_id FROM public.equipment WHERE qr_code = 'GEN-2025-001';
  SELECT id INTO elec_id FROM public.equipment WHERE qr_code = 'ELEC-2025-001';
  SELECT id INTO safe_id FROM public.equipment WHERE qr_code = 'SAFE-2025-001';

  -- Create checklists
  INSERT INTO public.checklists (title, description, equipment_id, frequency)
  VALUES ('Turbine System Inspection', 'Daily inspection of turbine components', turb_id, 'daily')
  RETURNING id INTO turb_checklist_id;

  INSERT INTO public.checklists (title, description, equipment_id, frequency)
  VALUES ('Oil Pressure Unit Inspection', 'Daily inspection of hydraulic oil system', opu_id, 'daily')
  RETURNING id INTO opu_checklist_id;

  INSERT INTO public.checklists (title, description, equipment_id, frequency)
  VALUES ('Cooling System Inspection', 'Daily inspection of cooling system', cool_id, 'daily')
  RETURNING id INTO cool_checklist_id;

  INSERT INTO public.checklists (title, description, equipment_id, frequency)
  VALUES ('Generator Inspection', 'Daily inspection of generator unit', gen_id, 'daily')
  RETURNING id INTO gen_checklist_id;

  INSERT INTO public.checklists (title, description, equipment_id, frequency)
  VALUES ('Electrical Systems Inspection', 'Daily inspection of electrical equipment', elec_id, 'daily')
  RETURNING id INTO elec_checklist_id;

  INSERT INTO public.checklists (title, description, equipment_id, frequency)
  VALUES ('Safety & General Inspection', 'Daily safety and facility inspection', safe_id, 'daily')
  RETURNING id INTO safe_checklist_id;

  -- Insert checklist items for Turbine System
  INSERT INTO public.checklist_items (checklist_id, title, description, sort_order) VALUES
    (turb_checklist_id, 'Visual inspection for leaks', 'Check for oil, water, or hydraulic fluid leaks', 1),
    (turb_checklist_id, 'Bearing temperature', 'Check bearing temperature is within normal range', 2),
    (turb_checklist_id, 'Vibration levels', 'Check for abnormal vibrations or noise', 3),
    (turb_checklist_id, 'Guide bearing condition', 'Inspect guide bearing for wear or damage', 4),
    (turb_checklist_id, 'Runner condition', 'Visual inspection of turbine runner', 5);

  -- Insert checklist items for Oil Pressure Unit
  INSERT INTO public.checklist_items (checklist_id, title, description, sort_order) VALUES
    (opu_checklist_id, 'Oil level check', 'Verify oil level is within acceptable range', 1),
    (opu_checklist_id, 'Oil pressure gauge reading', 'Check oil pressure gauge for normal reading', 2),
    (opu_checklist_id, 'Pump operation', 'Verify pump is operating smoothly', 3),
    (opu_checklist_id, 'Filter condition', 'Check oil filter for blockage or contamination', 4),
    (opu_checklist_id, 'Temperature check', 'Verify oil temperature is within normal range', 5);

  -- Insert checklist items for Cooling System
  INSERT INTO public.checklist_items (checklist_id, title, description, sort_order) VALUES
    (cool_checklist_id, 'Water flow check', 'Verify adequate water flow through cooling system', 1),
    (cool_checklist_id, 'Inlet/outlet temperature', 'Check temperature differential', 2),
    (cool_checklist_id, 'Pump operation', 'Verify cooling pump is operating normally', 3),
    (cool_checklist_id, 'Check for leaks', 'Inspect pipes and connections for leaks', 4),
    (cool_checklist_id, 'Strainer condition', 'Check water strainer for debris', 5);

  -- Insert checklist items for Generator
  INSERT INTO public.checklist_items (checklist_id, title, description, sort_order) VALUES
    (gen_checklist_id, 'Bearing temperature', 'Check generator bearing temperature', 1),
    (gen_checklist_id, 'Vibration check', 'Verify no abnormal vibrations', 2),
    (gen_checklist_id, 'Brush condition', 'Inspect carbon brushes for wear', 3),
    (gen_checklist_id, 'Slip ring condition', 'Check slip rings for scoring or damage', 4),
    (gen_checklist_id, 'Voltage and frequency', 'Verify output voltage and frequency', 5);

  -- Insert checklist items for Electrical Systems
  INSERT INTO public.checklist_items (checklist_id, title, description, sort_order) VALUES
    (elec_checklist_id, 'Switchgear inspection', 'Visual inspection of switchgear', 1),
    (elec_checklist_id, 'Circuit breaker status', 'Verify all circuit breakers are in correct position', 2),
    (elec_checklist_id, 'Transformer temperature', 'Check transformer temperature', 3),
    (elec_checklist_id, 'Control panel lights', 'Verify all indicator lights are functioning', 4),
    (elec_checklist_id, 'Grounding connections', 'Check grounding connections are secure', 5);

  -- Insert checklist items for Safety & General
  INSERT INTO public.checklist_items (checklist_id, title, description, sort_order) VALUES
    (safe_checklist_id, 'Emergency stop buttons', 'Test emergency stop buttons', 1),
    (safe_checklist_id, 'Fire extinguishers', 'Check fire extinguishers are accessible and charged', 2),
    (safe_checklist_id, 'Lighting systems', 'Verify all lights are functioning', 3),
    (safe_checklist_id, 'Housekeeping', 'Check facility cleanliness and organization', 4),
    (safe_checklist_id, 'Access and egress', 'Verify emergency exits are clear and accessible', 5);

END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_equipment_qr_code ON public.equipment(qr_code);
CREATE INDEX IF NOT EXISTS idx_checklists_equipment_id ON public.checklists(equipment_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist_id ON public.checklist_items(checklist_id);

COMMENT ON TABLE public.equipment IS 'Physical equipment that requires maintenance inspections';
COMMENT ON TABLE public.checklists IS 'Checklist templates associated with equipment';
COMMENT ON TABLE public.checklist_items IS 'Individual inspection items within a checklist template';
