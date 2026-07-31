CREATE TABLE public.product_meta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  category text,
  collection text,
  best_seller boolean NOT NULL DEFAULT false,
  new_arrival boolean NOT NULL DEFAULT false,
  early_access boolean NOT NULL DEFAULT false,
  hidden boolean NOT NULL DEFAULT false,
  drop_date date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_meta TO authenticated;
GRANT ALL ON public.product_meta TO service_role;

ALTER TABLE public.product_meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage product meta"
  ON public.product_meta
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can read product meta"
  ON public.product_meta
  FOR SELECT
  TO authenticated
  USING (true);

CREATE TRIGGER update_product_meta_updated_at
  BEFORE UPDATE ON public.product_meta
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();