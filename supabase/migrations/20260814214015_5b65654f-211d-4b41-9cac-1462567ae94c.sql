CREATE TABLE public.points_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  workout_points integer NOT NULL DEFAULT 25,
  pr_points integer NOT NULL DEFAULT 50,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.points_settings TO anon;
GRANT SELECT ON public.points_settings TO authenticated;
GRANT ALL ON public.points_settings TO service_role;

ALTER TABLE public.points_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Points settings are readable by everyone"
ON public.points_settings FOR SELECT USING (true);

CREATE POLICY "Only admins can change points settings"
ON public.points_settings FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER points_settings_updated_at
BEFORE UPDATE ON public.points_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.points_settings (id, workout_points, pr_points) VALUES (true, 25, 50);

CREATE POLICY "Admins can insert rewards"
ON public.rewards FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update rewards"
ON public.rewards FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete rewards"
ON public.rewards FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));