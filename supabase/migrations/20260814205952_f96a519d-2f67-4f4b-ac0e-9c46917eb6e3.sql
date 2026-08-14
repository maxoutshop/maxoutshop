-- 1. Wix membership mapping ------------------------------------------------
CREATE TABLE public.wix_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wix_member_id text,
  wix_contact_id text,
  wix_order_id text NOT NULL,
  plan_id text NOT NULL,
  plan_name text,
  billing_interval text NOT NULL DEFAULT 'monthly',
  status text NOT NULL DEFAULT 'PENDING',
  auto_renew_canceled boolean NOT NULL DEFAULT false,
  started_at timestamptz,
  ends_at timestamptz,
  last_verified_at timestamptz NOT NULL DEFAULT now(),
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wix_memberships_order_unique UNIQUE (wix_order_id)
);
CREATE INDEX wix_memberships_user_idx ON public.wix_memberships (user_id);
CREATE INDEX wix_memberships_member_idx ON public.wix_memberships (wix_member_id);

GRANT SELECT ON public.wix_memberships TO authenticated;
GRANT ALL ON public.wix_memberships TO service_role;
ALTER TABLE public.wix_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read own wix membership" ON public.wix_memberships
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER wix_memberships_updated_at BEFORE UPDATE ON public.wix_memberships
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. ELITE streak freezes ---------------------------------------------------
CREATE TABLE public.streak_freezes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_start date NOT NULL,
  protected_day date NOT NULL,
  used_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT streak_freezes_cycle_unique UNIQUE (user_id, cycle_start)
);
CREATE INDEX streak_freezes_user_idx ON public.streak_freezes (user_id, protected_day);

GRANT SELECT ON public.streak_freezes TO authenticated;
GRANT ALL ON public.streak_freezes TO service_role;
ALTER TABLE public.streak_freezes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read own streak freezes" ON public.streak_freezes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 3. Weekly ELITE reports ---------------------------------------------------
CREATE TABLE public.weekly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT weekly_reports_unique UNIQUE (user_id, week_start)
);
CREATE INDEX weekly_reports_user_idx ON public.weekly_reports (user_id, week_start DESC);

GRANT SELECT ON public.weekly_reports TO authenticated;
GRANT ALL ON public.weekly_reports TO service_role;
ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read own weekly reports" ON public.weekly_reports
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER weekly_reports_updated_at BEFORE UPDATE ON public.weekly_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. ELITE shopping metadata ------------------------------------------------
ALTER TABLE public.product_meta
  ADD COLUMN IF NOT EXISTS elite_only boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS elite_price numeric,
  ADD COLUMN IF NOT EXISTS elite_access_at timestamptz,
  ADD COLUMN IF NOT EXISTS public_access_at timestamptz,
  ADD COLUMN IF NOT EXISTS restock_priority_minutes integer NOT NULL DEFAULT 0;

-- 5. Points: base + ELITE 1.5x multiplier -----------------------------------
ALTER TABLE public.points_ledger
  ADD COLUMN IF NOT EXISTS base_delta integer,
  ADD COLUMN IF NOT EXISTS multiplier numeric NOT NULL DEFAULT 1;

CREATE OR REPLACE FUNCTION public.award_points(_user_id uuid, _delta integer, _reason text, _event_key text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  inserted boolean := false;
  is_elite boolean := false;
  mult numeric := 1;
  final_delta integer;
BEGIN
  SELECT COALESCE(p.is_elite, false) INTO is_elite FROM public.profiles p WHERE p.id = _user_id;
  IF is_elite AND _delta > 0 THEN mult := 1.5; END IF;
  final_delta := CASE WHEN _delta > 0 THEN round(_delta * mult)::int ELSE _delta END;

  INSERT INTO public.points_ledger (user_id, delta, reason, event_key, base_delta, multiplier)
  VALUES (_user_id, final_delta, _reason, _event_key, _delta, mult)
  ON CONFLICT (user_id, event_key) WHERE event_key IS NOT NULL DO NOTHING;
  GET DIAGNOSTICS inserted = ROW_COUNT;
  RETURN inserted;
END; $function$;