-- =============================================
-- GENERATOR LOGS TABLE
-- Tracks hourly generator readings and parameters
-- =============================================

-- Create generator_logs table
CREATE TABLE IF NOT EXISTS public.generator_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  date DATE NOT NULL,
  hour INTEGER NOT NULL CHECK (hour >= 0 AND hour <= 23),

  -- Section 1: Generator Winding Temperatures (°C)
  winding_temp_r1 DECIMAL(5,2) CHECK (winding_temp_r1 IS NULL OR (winding_temp_r1 >= 0 AND winding_temp_r1 <= 200)),
  winding_temp_r2 DECIMAL(5,2) CHECK (winding_temp_r2 IS NULL OR (winding_temp_r2 >= 0 AND winding_temp_r2 <= 200)),
  winding_temp_y1 DECIMAL(5,2) CHECK (winding_temp_y1 IS NULL OR (winding_temp_y1 >= 0 AND winding_temp_y1 <= 200)),
  winding_temp_y2 DECIMAL(5,2) CHECK (winding_temp_y2 IS NULL OR (winding_temp_y2 >= 0 AND winding_temp_y2 <= 200)),
  winding_temp_b1 DECIMAL(5,2) CHECK (winding_temp_b1 IS NULL OR (winding_temp_b1 >= 0 AND winding_temp_b1 <= 200)),
  winding_temp_b2 DECIMAL(5,2) CHECK (winding_temp_b2 IS NULL OR (winding_temp_b2 >= 0 AND winding_temp_b2 <= 200)),

  -- Section 2: Bearing Temperatures (°C)
  bearing_g_de_brg_main_ch7 DECIMAL(5,2) CHECK (bearing_g_de_brg_main_ch7 IS NULL OR (bearing_g_de_brg_main_ch7 >= 0 AND bearing_g_de_brg_main_ch7 <= 150)),
  bearing_g_nde_brg_stand_ch8 DECIMAL(5,2) CHECK (bearing_g_nde_brg_stand_ch8 IS NULL OR (bearing_g_nde_brg_stand_ch8 >= 0 AND bearing_g_nde_brg_stand_ch8 <= 150)),
  bearing_thrust_1_ch9 DECIMAL(5,2) CHECK (bearing_thrust_1_ch9 IS NULL OR (bearing_thrust_1_ch9 >= 0 AND bearing_thrust_1_ch9 <= 150)),
  bearing_thrust_2_ch10 DECIMAL(5,2) CHECK (bearing_thrust_2_ch10 IS NULL OR (bearing_thrust_2_ch10 >= 0 AND bearing_thrust_2_ch10 <= 150)),
  bearing_bgb_low_speed_ch11 DECIMAL(5,2) CHECK (bearing_bgb_low_speed_ch11 IS NULL OR (bearing_bgb_low_speed_ch11 >= 0 AND bearing_bgb_low_speed_ch11 <= 150)),
  bearing_bgb_high_speed_ch12 DECIMAL(5,2) CHECK (bearing_bgb_high_speed_ch12 IS NULL OR (bearing_bgb_high_speed_ch12 >= 0 AND bearing_bgb_high_speed_ch12 <= 150)),
  bearing_tgb_low_speed_ch13 DECIMAL(5,2) CHECK (bearing_tgb_low_speed_ch13 IS NULL OR (bearing_tgb_low_speed_ch13 >= 0 AND bearing_tgb_low_speed_ch13 <= 150)),
  bearing_tgb_high_speed_ch14 DECIMAL(5,2) CHECK (bearing_tgb_high_speed_ch14 IS NULL OR (bearing_tgb_high_speed_ch14 >= 0 AND bearing_tgb_high_speed_ch14 <= 150)),

  -- Section 3: Electrical Parameters
  gen_current_r DECIMAL(8,2),
  gen_current_y DECIMAL(8,2),
  gen_current_b DECIMAL(8,2),
  gen_voltage_ry DECIMAL(8,2),
  gen_voltage_yb DECIMAL(8,2),
  gen_voltage_br DECIMAL(8,2),
  gen_kw DECIMAL(10,2),
  gen_kvar DECIMAL(10,2),
  gen_kva DECIMAL(10,2),
  gen_frequency DECIMAL(5,2) CHECK (gen_frequency IS NULL OR (gen_frequency >= 45 AND gen_frequency <= 55)),
  gen_power_factor DECIMAL(4,3) CHECK (gen_power_factor IS NULL OR (gen_power_factor >= 0 AND gen_power_factor <= 1)),
  gen_rpm DECIMAL(8,2),
  gen_mwh DECIMAL(12,4),
  gen_mvarh DECIMAL(12,4),
  gen_mvah DECIMAL(12,4),

  -- Section 4: AVR
  avr_field_current DECIMAL(8,2),
  avr_field_voltage DECIMAL(8,2),

  -- Section 5: Intake System
  intake_gv_percentage DECIMAL(5,2) CHECK (intake_gv_percentage IS NULL OR (intake_gv_percentage >= 0 AND intake_gv_percentage <= 100)),
  intake_rb_percentage DECIMAL(5,2) CHECK (intake_rb_percentage IS NULL OR (intake_rb_percentage >= 0 AND intake_rb_percentage <= 100)),
  intake_water_pressure DECIMAL(8,2),
  intake_water_level DECIMAL(8,2),

  -- Section 6: Tail Race
  tail_race_water_level DECIMAL(8,2),
  tail_race_net_head DECIMAL(8,2),

  -- Section 7: T.OPU (Turbine Oil Pressure Unit)
  topu_oil_pressure DECIMAL(8,2),
  topu_oil_temperature DECIMAL(5,2) CHECK (topu_oil_temperature IS NULL OR (topu_oil_temperature >= 0 AND topu_oil_temperature <= 150)),
  topu_oil_level TEXT,

  -- Section 8: GB.LOS & Cooling Water
  gblos_oil_pressure DECIMAL(8,2),
  gblos_oil_temperature DECIMAL(5,2) CHECK (gblos_oil_temperature IS NULL OR (gblos_oil_temperature >= 0 AND gblos_oil_temperature <= 150)),
  gblos_oil_level TEXT,
  cooling_main_pressure DECIMAL(8,2),
  cooling_los_flow DECIMAL(8,2),
  cooling_bearing_flow DECIMAL(8,2),

  -- Metadata
  remarks TEXT,
  logged_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  finalized BOOLEAN DEFAULT false,
  finalized_at TIMESTAMP WITH TIME ZONE,
  finalized_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- Unique constraint for one log per user per hour per day
  CONSTRAINT unique_generator_log UNIQUE (date, hour)
);

-- Enable RLS
ALTER TABLE public.generator_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view all generator logs" ON public.generator_logs;
CREATE POLICY "Users can view all generator logs"
  ON public.generator_logs
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own generator logs" ON public.generator_logs;
CREATE POLICY "Users can insert their own generator logs"
  ON public.generator_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update generator logs" ON public.generator_logs;
CREATE POLICY "Users can update generator logs"
  ON public.generator_logs
  FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can delete generator logs" ON public.generator_logs;
CREATE POLICY "Admins can delete generator logs"
  ON public.generator_logs
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_generator_logs_date ON public.generator_logs(date);
CREATE INDEX IF NOT EXISTS idx_generator_logs_date_hour ON public.generator_logs(date, hour);
CREATE INDEX IF NOT EXISTS idx_generator_logs_user ON public.generator_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_generator_logs_finalized ON public.generator_logs(finalized);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_generator_logs_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_generator_logs_updated_at_trigger ON public.generator_logs;
CREATE TRIGGER update_generator_logs_updated_at_trigger
  BEFORE UPDATE ON public.generator_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_generator_logs_updated_at();
