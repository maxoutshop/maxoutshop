ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cover_url text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS gym text,
  ADD COLUMN IF NOT EXISTS about text,
  ADD COLUMN IF NOT EXISTS links jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS default_workout_public boolean NOT NULL DEFAULT false;

ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS workouts_public_idx ON public.workouts (is_public, performed_at DESC);

ALTER TABLE public.personal_records
  ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;

-- Public read access to public workouts
DROP POLICY IF EXISTS "Public workouts are viewable" ON public.workouts;
CREATE POLICY "Public workouts are viewable" ON public.workouts
  FOR SELECT TO authenticated USING (is_public = true);

DROP POLICY IF EXISTS "Sets of public workouts are viewable" ON public.workout_sets;
CREATE POLICY "Sets of public workouts are viewable" ON public.workout_sets
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_sets.workout_id AND w.is_public = true)
  );

CREATE TABLE IF NOT EXISTS public.workout_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id uuid NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workout_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.workout_likes TO authenticated;
GRANT ALL ON public.workout_likes TO service_role;
ALTER TABLE public.workout_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Likes on public workouts are viewable" ON public.workout_likes
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_likes.workout_id AND (w.is_public = true OR w.user_id = auth.uid()))
  );
CREATE POLICY "Members like as themselves" ON public.workout_likes
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_likes.workout_id AND w.is_public = true)
  );
CREATE POLICY "Members remove their own likes" ON public.workout_likes
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.workout_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id uuid NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.workout_comments TO authenticated;
GRANT ALL ON public.workout_comments TO service_role;
ALTER TABLE public.workout_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments on public workouts are viewable" ON public.workout_comments
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_comments.workout_id AND (w.is_public = true OR w.user_id = auth.uid()))
  );
CREATE POLICY "Members comment as themselves" ON public.workout_comments
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid()
    AND length(btrim(body)) BETWEEN 1 AND 500
    AND EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_comments.workout_id AND w.is_public = true)
  );
CREATE POLICY "Members delete their own comments" ON public.workout_comments
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS workout_comments_workout_idx ON public.workout_comments (workout_id, created_at);

CREATE OR REPLACE FUNCTION public.tg_notify_workout_social()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE owner uuid; who text; kind text; body text;
BEGIN
  SELECT user_id INTO owner FROM public.workouts WHERE id = NEW.workout_id;
  SELECT COALESCE(display_name, username, 'An athlete') INTO who FROM public.profiles WHERE id = NEW.user_id;
  IF TG_TABLE_NAME = 'workout_likes' THEN
    PERFORM public.notify_user(owner, 'like', 'Workout respect', who || ' liked your workout', '/profile',
      NEW.user_id, 'wlike:' || NEW.workout_id || ':' || NEW.user_id);
  ELSE
    PERFORM public.notify_user(owner, 'comment', 'New workout comment', who || ': ' || left(NEW.body, 80), '/profile',
      NEW.user_id, 'wcomment:' || NEW.id);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS notify_workout_like_trg ON public.workout_likes;
CREATE TRIGGER notify_workout_like_trg AFTER INSERT ON public.workout_likes
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_workout_social();

DROP TRIGGER IF EXISTS notify_workout_comment_trg ON public.workout_comments;
CREATE TRIGGER notify_workout_comment_trg AFTER INSERT ON public.workout_comments
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_workout_social();