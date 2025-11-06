-- =============================================
-- TRANSFORMER LOGS TABLE
-- Tracks hourly transformer readings and parameters
-- =============================================

-- Create transformer_logs table
CREATE TABLE IF NOT EXISTS public.transformer_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  logged_by UUID REFERENCES auth.users(id) NOT NULL,
  last_modified_by UUID REFERENCES auth.users(id) NOT NULL,
  transformer_number INTEGER NOT NULL DEFAULT 1,
  date DATE NOT NULL,
  hour INTEGER NOT NULL CHECK (hour >= 0 AND hour <= 23),

  -- Main Transformer Parameters
  frequency DECIMAL(5,2) CHECK (frequency IS NULL OR (frequency >= 45 AND frequency <= 55)),
  voltage_ry DECIMAL(8,2),
  voltage_yb DECIMAL(8,2),
  voltage_rb DECIMAL(8,2),
  current_r DECIMAL(8,2),
  current_y DECIMAL(8,2),
  current_b DECIMAL(8,2),
  active_power DECIMAL(10,2),
  reactive_power DECIMAL(10,2),
  kva DECIMAL(10,2),
  mwh DECIMAL(12,4),
  mvarh DECIMAL(12,4),
  mvah DECIMAL(12,4),
  cos_phi DECIMAL(4,3) CHECK (cos_phi IS NULL OR (cos_phi >= 0 AND cos_phi <= 1)),
  oil_temperature DECIMAL(5,2) CHECK (oil_temperature IS NULL OR (oil_temperature >= 0 AND oil_temperature <= 150)),
  winding_temperature DECIMAL(5,2) CHECK (winding_temperature IS NULL OR (winding_temperature >= 0 AND winding_temperature <= 200)),
  oil_level TEXT,
  tap_position TEXT,
  tap_counter INTEGER,
  silica_gel_colour TEXT,

  -- LTAC Parameters
  ltac_current_r DECIMAL(8,2),
  ltac_current_y DECIMAL(8,2),
  ltac_current_b DECIMAL(8,2),
  ltac_voltage_ry DECIMAL(8,2),
  ltac_voltage_yb DECIMAL(8,2),
  ltac_voltage_rb DECIMAL(8,2),
  ltac_kw DECIMAL(10,2),
  ltac_kva DECIMAL(10,2),
  ltac_kvar DECIMAL(10,2),
  ltac_kwh DECIMAL(12,4),
  ltac_kvah DECIMAL(12,4),
  ltac_kvarh DECIMAL(12,4),
  ltac_oil_temperature DECIMAL(5,2),
  ltac_grid_fail_time TEXT,
  ltac_grid_resume_time TEXT,
  ltac_supply_interruption TEXT,

  -- Generation Meters
  gen_total_generation DECIMAL(12,4),
  gen_xmer_export DECIMAL(12,4),
  gen_aux_consumption DECIMAL(12,4),
  gen_main_export DECIMAL(12,4),
  gen_check_export DECIMAL(12,4),
  gen_main_import DECIMAL(12,4),
  gen_check_import DECIMAL(12,4),
  gen_standby_export DECIMAL(12,4),
  gen_standby_import DECIMAL(12,4),

  -- Metadata
  remarks TEXT,
  logged_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  finalized BOOLEAN DEFAULT false,
  finalized_at TIMESTAMP WITH TIME ZONE,
  finalized_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- Unique constraint for collective logging (no user_id in constraint)
  CONSTRAINT unique_transformer_log UNIQUE (transformer_number, date, hour)
);

-- Enable RLS
ALTER TABLE public.transformer_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view all transformer logs" ON public.transformer_logs;
CREATE POLICY "Users can view all transformer logs"
  ON public.transformer_logs
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert transformer logs" ON public.transformer_logs;
CREATE POLICY "Users can insert transformer logs"
  ON public.transformer_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (logged_by = auth.uid() AND last_modified_by = auth.uid());

DROP POLICY IF EXISTS "Users can update transformer logs" ON public.transformer_logs;
CREATE POLICY "Users can update transformer logs"
  ON public.transformer_logs
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (last_modified_by = auth.uid());

DROP POLICY IF EXISTS "Admins can delete transformer logs" ON public.transformer_logs;
CREATE POLICY "Admins can delete transformer logs"
  ON public.transformer_logs
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transformer_logs_date ON public.transformer_logs(date);
CREATE INDEX IF NOT EXISTS idx_transformer_logs_date_hour ON public.transformer_logs(transformer_number, date, hour);
CREATE INDEX IF NOT EXISTS idx_transformer_logs_finalized ON public.transformer_logs(finalized);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_transformer_logs_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_transformer_logs_updated_at_trigger ON public.transformer_logs;
CREATE TRIGGER update_transformer_logs_updated_at_trigger
  BEFORE UPDATE ON public.transformer_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_transformer_logs_updated_at();
