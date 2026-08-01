-- elite_grants: writes are service-role only (promo redemption + admin comp run server-side).
REVOKE INSERT, UPDATE, DELETE ON public.elite_grants FROM authenticated;
REVOKE ALL ON public.elite_grants FROM anon;
GRANT SELECT ON public.elite_grants TO authenticated;
GRANT ALL ON public.elite_grants TO service_role;

DROP POLICY IF EXISTS "Service role manages elite grants" ON public.elite_grants;
CREATE POLICY "Service role manages elite grants"
  ON public.elite_grants
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Explicit deny for any signed-in client write path (belt-and-braces over default deny).
DROP POLICY IF EXISTS "No client writes to elite grants" ON public.elite_grants;
CREATE POLICY "No client writes to elite grants"
  ON public.elite_grants
  AS RESTRICTIVE
  FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (false);

-- promo_codes: sensitive redemption data, admin-managed + service role only.
REVOKE ALL ON public.promo_codes FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promo_codes TO authenticated;
GRANT ALL ON public.promo_codes TO service_role;