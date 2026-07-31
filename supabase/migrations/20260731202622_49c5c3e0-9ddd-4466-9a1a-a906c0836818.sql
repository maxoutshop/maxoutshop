CREATE TABLE public.promo_codes (
  code text PRIMARY KEY,
  label text,
  grant_months integer NOT NULL DEFAULT 12,
  max_redemptions integer NOT NULL DEFAULT 1,
  redeemed_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.promo_codes TO service_role;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.elite_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL REFERENCES public.promo_codes(code) ON DELETE CASCADE,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, code)
);
GRANT SELECT ON public.elite_grants TO authenticated;
GRANT ALL ON public.elite_grants TO service_role;
ALTER TABLE public.elite_grants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own elite grants" ON public.elite_grants
  FOR SELECT TO authenticated USING (auth.uid() = user_id);