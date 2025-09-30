-- Add category support to checklist items
ALTER TABLE checklist_items ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'General';
ALTER TABLE checklist_items ADD COLUMN IF NOT EXISTS expected_value text;
ALTER TABLE checklist_items ADD COLUMN IF NOT EXISTS unit text;
ALTER TABLE checklist_items ADD COLUMN IF NOT EXISTS icon text;

-- Add status tracking to completed_items
ALTER TABLE completed_items ADD COLUMN IF NOT EXISTS actual_value text;
ALTER TABLE completed_items ADD COLUMN IF NOT EXISTS has_issue boolean DEFAULT false;

-- Update existing checklist items with categories and expected values
DELETE FROM checklist_items WHERE checklist_id IN (SELECT id FROM checklists);

-- Insert comprehensive checklist items with categories
INSERT INTO checklist_items (checklist_id, category, title, description, expected_value, unit, icon, sort_order) 
SELECT 
  c.id,
  items.category,
  items.title,
  items.description,
  items.expected_value,
  items.unit,
  items.icon,
  items.sort_order
FROM checklists c
CROSS JOIN (
  VALUES
  -- Turbine System
  ('Turbine System', 'Guide bearing oil level', 'Check oil level in guide bearing', '50-70', '%', 'gauge', 1),
  ('Turbine System', 'Thrust bearing temperature', 'Monitor thrust bearing temperature', '<70', '°C', 'thermometer', 2),
  ('Turbine System', 'Guide vane servomotor leakage', 'Inspect for oil leakage', 'None', '', 'droplet', 3),
  ('Turbine System', 'Runner hub oil (Kaplan)', 'Check Kaplan runner hub oil', 'No leak', '', 'wrench', 4),
  ('Turbine System', 'Vibration & sound check', 'Listen for abnormal vibration or sound', 'Normal', '', 'activity', 5),
  
  -- Oil Pressure Unit
  ('Oil Pressure Unit', 'Accumulator pressure', 'Check accumulator pressure gauge', '40-45', 'bar', 'gauge', 6),
  ('Oil Pressure Unit', 'Oil sump level', 'Verify oil sump level', '50-70', '%', 'droplet', 7),
  ('Oil Pressure Unit', 'Oil temperature', 'Monitor oil temperature', '20-40', '°C', 'thermometer', 8),
  ('Oil Pressure Unit', 'Oil piping leakage', 'Inspect for oil leaks in piping', 'None', '', 'alert-triangle', 9),
  ('Oil Pressure Unit', 'Pump motor sound', 'Listen for unusual pump motor sounds', 'Normal', '', 'volume-2', 10),
  
  -- Cooling System  
  ('Cooling System', 'CW pressure inlet', 'Check cooling water inlet pressure', '2-3', 'kg/cm²', 'gauge', 11),
  ('Cooling System', 'Flow indicators', 'Verify water flow indicators', 'Flowing', '', 'droplet', 12),
  ('Cooling System', 'Strainer condition', 'Inspect strainer for debris', 'Clean', '', 'filter', 13),
  ('Cooling System', 'Oil cooler performance', 'Check oil cooler temperature differential', 'ΔT normal', '', 'wind', 14),
  ('Cooling System', 'Bearing cooling lines', 'Check bearing cooling line flow', 'Clear', '', 'zap', 15),
  
  -- Generator
  ('Generator', 'Stator temperature', 'Monitor stator winding temperature', '<85', '°C', 'thermometer', 16),
  ('Generator', 'Bearing temperatures', 'Check generator bearing temperatures', '<65', '°C', 'thermometer', 17),
  ('Generator', 'Vibration levels', 'Measure vibration levels', '<100', 'μm', 'activity', 18),
  ('Generator', 'Slip ring condition', 'Inspect slip rings for sparking', 'No spark', '', 'zap', 19),
  ('Generator', 'Air gap uniformity', 'Verify air gap uniformity', 'Uniform', '', 'circle', 20),
  
  -- Electrical Systems
  ('Electrical Systems', 'DC battery voltage', 'Check DC battery bank voltage', '110V ±2', '%', 'battery', 21),
  ('Electrical Systems', 'Battery cells #7 & #29', 'Inspect specific battery cells', 'Check', '', 'alert-triangle', 22),
  ('Electrical Systems', 'Transformer oil temp', 'Monitor transformer oil temperature', '40-60', '°C', 'thermometer', 23),
  ('Electrical Systems', 'SF6 gas pressure', 'Check SF6 gas pressure in breakers', '5.5-6', 'bar', 'gauge', 24),
  ('Electrical Systems', 'Protection relays', 'Test protection relay status', 'Reset', '', 'shield', 25),
  
  -- Safety & General
  ('Safety & General', 'Fire extinguishers', 'Verify fire extinguisher status', 'Ready', '', 'flame', 26),
  ('Safety & General', 'Emergency lighting', 'Test emergency lighting', 'Working', '', 'lightbulb', 27),
  ('Safety & General', 'First aid kit', 'Check first aid kit supplies', 'Stocked', '', 'heart', 28),
  ('Safety & General', 'PPE availability', 'Verify PPE availability', 'Available', '', 'hard-hat', 29),
  ('Safety & General', 'Housekeeping', 'Inspect general cleanliness', 'Clean', '', 'trash-2', 30)
) AS items(category, title, description, expected_value, unit, icon, sort_order);