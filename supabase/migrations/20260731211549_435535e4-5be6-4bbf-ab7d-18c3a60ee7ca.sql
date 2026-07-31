-- Public (member-visible) reads for training data
CREATE POLICY "Workouts readable by signed-in users" ON public.workouts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Workout sets readable by signed-in users" ON public.workout_sets FOR SELECT TO authenticated USING (true);
CREATE POLICY "PRs readable by signed-in users" ON public.personal_records FOR SELECT TO authenticated USING (true);

CREATE TABLE public.cheers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL DEFAULT '🔥',
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX cheers_to_user_idx ON public.cheers (to_user_id, created_at DESC);
ALTER TABLE public.cheers ADD CONSTRAINT cheers_profile_fkey FOREIGN KEY (from_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

GRANT SELECT, INSERT, DELETE ON public.cheers TO authenticated;
GRANT ALL ON public.cheers TO service_role;

ALTER TABLE public.cheers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cheers readable by signed-in users" ON public.cheers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Send cheers as self" ON public.cheers FOR INSERT TO authenticated WITH CHECK (auth.uid() = from_user_id AND from_user_id <> to_user_id);
CREATE POLICY "Delete own cheers" ON public.cheers FOR DELETE TO authenticated USING (auth.uid() = from_user_id);