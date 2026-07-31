ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_elite boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.guard_elite_flag()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.is_elite IS DISTINCT FROM OLD.is_elite
     AND auth.uid() IS NOT NULL
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only the system can change membership status';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS guard_elite_flag_trg ON public.profiles;
CREATE TRIGGER guard_elite_flag_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_elite_flag();

CREATE OR REPLACE FUNCTION public.has_active_subscription(user_uuid uuid, check_env text DEFAULT 'live'::text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  select exists (
    select 1 from public.subscriptions
    where user_id = user_uuid
      and environment = check_env
      and (
        (status in ('active','trialing') and (current_period_end is null or current_period_end > now()))
        or (status = 'canceled' and current_period_end > now())
      )
  );
$$;