CREATE POLICY "Anon users can read product meta"
  ON public.product_meta
  FOR SELECT
  TO anon
  USING (true);

-- Ensure authenticated users can still read product meta
DROP POLICY IF EXISTS "Authenticated users can read product meta" ON public.product_meta;
CREATE POLICY "Authenticated users can read product meta"
  ON public.product_meta
  FOR SELECT
  TO authenticated
  USING (true);