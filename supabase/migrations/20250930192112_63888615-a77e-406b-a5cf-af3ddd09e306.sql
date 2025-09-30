-- Fix function search path to be immutable for security
DROP FUNCTION IF EXISTS public.get_current_user_name();

CREATE OR REPLACE FUNCTION public.get_current_user_name()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT full_name FROM public.profiles WHERE id = auth.uid();
$$;