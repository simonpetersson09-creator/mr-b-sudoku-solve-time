CREATE OR REPLACE FUNCTION public.cleanup_deleted_sudoku_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.app_events WHERE user_id = OLD.id;
  DELETE FROM public.admin_activity_exclusions WHERE user_id = OLD.id;
  DELETE FROM public.rate_limit_hits WHERE key LIKE 'report:' || OLD.id::text || ':%' OR key = 'pin:user:' || OLD.id::text;
  RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION public.cleanup_deleted_sudoku_profile() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER cleanup_deleted_sudoku_profile AFTER DELETE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.cleanup_deleted_sudoku_profile();