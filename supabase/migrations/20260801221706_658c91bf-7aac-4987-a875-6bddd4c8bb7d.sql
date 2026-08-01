CREATE OR REPLACE FUNCTION public.guard_profile_privileges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- auth.uid() is NULL for service-role / trusted server code, which stays allowed.
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    IF NEW.is_ambassador IS DISTINCT FROM OLD.is_ambassador THEN
      RAISE EXCEPTION 'Only admins can change ambassador status';
    END IF;
    IF NEW.points IS DISTINCT FROM OLD.points THEN
      RAISE EXCEPTION 'Points can only be changed by the system';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_privileges_trg ON public.profiles;
CREATE TRIGGER guard_profile_privileges_trg
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profile_privileges();

-- Make sure the existing elite / verified guards are actually attached as triggers too.
DROP TRIGGER IF EXISTS guard_elite_flag_trg ON public.profiles;
CREATE TRIGGER guard_elite_flag_trg
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_elite_flag();

DROP TRIGGER IF EXISTS guard_verified_flag_trg ON public.profiles;
CREATE TRIGGER guard_verified_flag_trg
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_verified_flag();

-- points_ledger keeps updating points through its SECURITY DEFINER trigger.
DROP TRIGGER IF EXISTS apply_points_trg ON public.points_ledger;
CREATE TRIGGER apply_points_trg
  AFTER INSERT ON public.points_ledger
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_points();