-- Add policies to promo_codes so RLS is no longer enabled without a rule
CREATE POLICY "Admins can manage promo codes"
  ON public.promo_codes
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages promo codes"
  ON public.promo_codes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Switch has_role to security invoker so authenticated users can still execute it in RLS policies
-- without the function running under elevated privileges. The inner query on user_roles is scoped
-- by the existing user_roles SELECT policy, so this still returns whether the current user holds the role.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Ensure authenticated users can execute the helper in policy expressions
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;