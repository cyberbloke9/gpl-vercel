-- Fix security warnings: Set search_path for mutable functions

-- Fix generate_issue_number function
CREATE OR REPLACE FUNCTION public.generate_issue_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Fix set_issue_number function
CREATE OR REPLACE FUNCTION public.set_issue_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.issue_number IS NULL THEN
    NEW.issue_number := public.generate_issue_number();
  END IF;
  RETURN NEW;
END;
$$;

-- Fix update_checklist_progress function  
CREATE OR REPLACE FUNCTION public.update_checklist_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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