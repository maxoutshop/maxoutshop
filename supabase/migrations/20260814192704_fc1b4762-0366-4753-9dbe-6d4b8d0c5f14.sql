-- ============ 1. EXTEND EXISTING TABLES ============

ALTER TABLE public.points_ledger ADD COLUMN IF NOT EXISTS event_key text;
CREATE UNIQUE INDEX IF NOT EXISTS points_ledger_event_key_uidx
  ON public.points_ledger (user_id, event_key) WHERE event_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS points_ledger_user_created_idx
  ON public.points_ledger (user_id, created_at DESC);

-- duplicate trigger caused every ledger row to be applied twice
DROP TRIGGER IF EXISTS points_ledger_apply ON public.points_ledger;

ALTER TABLE public.personal_records ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'weight';
ALTER TABLE public.personal_records ADD COLUMN IF NOT EXISTS reps integer;
ALTER TABLE public.personal_records ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';
CREATE UNIQUE INDEX IF NOT EXISTS personal_records_auto_uidx
  ON public.personal_records (user_id, exercise, kind) WHERE source = 'auto';
CREATE INDEX IF NOT EXISTS personal_records_user_ex_idx
  ON public.personal_records (user_id, exercise, achieved_at DESC);

ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS metric text NOT NULL DEFAULT 'workout_count';
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS target_value numeric NOT NULL DEFAULT 20;
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

ALTER TABLE public.challenge_participants ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE public.challenge_participants ADD COLUMN IF NOT EXISTS reward_claimed_at timestamptz;
CREATE INDEX IF NOT EXISTS challenge_participants_challenge_idx
  ON public.challenge_participants (challenge_id, progress DESC);

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS actor_id uuid;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS dedupe_key text;
CREATE UNIQUE INDEX IF NOT EXISTS notifications_dedupe_uidx
  ON public.notifications (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON public.notifications (user_id, created_at DESC);

ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS finished_at timestamptz;
CREATE INDEX IF NOT EXISTS workouts_user_performed_idx
  ON public.workouts (user_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS workout_sets_user_exercise_idx
  ON public.workout_sets (user_id, exercise, created_at DESC);
CREATE INDEX IF NOT EXISTS workout_sets_workout_idx ON public.workout_sets (workout_id);
CREATE INDEX IF NOT EXISTS meals_user_logged_idx ON public.meals (user_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS body_metrics_user_logged_idx ON public.body_metrics (user_id, logged_at DESC);

-- ============ 2. WORKOUT TEMPLATES ============

CREATE TABLE IF NOT EXISTS public.workout_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Custom',
  focus text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_templates TO authenticated;
GRANT ALL ON public.workout_templates TO service_role;
ALTER TABLE public.workout_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own templates" ON public.workout_templates FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS workout_templates_user_idx ON public.workout_templates (user_id, created_at DESC);
CREATE TRIGGER workout_templates_updated_at BEFORE UPDATE ON public.workout_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.workout_template_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.workout_templates(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise text NOT NULL,
  target_sets integer NOT NULL DEFAULT 3,
  target_reps text NOT NULL DEFAULT '8-12',
  rest_seconds integer NOT NULL DEFAULT 90,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_template_exercises TO authenticated;
GRANT ALL ON public.workout_template_exercises TO service_role;
ALTER TABLE public.workout_template_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own template exercises" ON public.workout_template_exercises FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS wte_template_idx ON public.workout_template_exercises (template_id, position);

-- ============ 3. SAVED MEALS ============

CREATE TABLE IF NOT EXISTS public.saved_meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  meal_type text NOT NULL DEFAULT 'meal',
  favorite boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_meals TO authenticated;
GRANT ALL ON public.saved_meals TO service_role;
ALTER TABLE public.saved_meals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own saved meals" ON public.saved_meals FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS saved_meals_user_idx ON public.saved_meals (user_id, favorite DESC, created_at DESC);
CREATE TRIGGER saved_meals_updated_at BEFORE UPDATE ON public.saved_meals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.saved_meal_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  saved_meal_id uuid NOT NULL REFERENCES public.saved_meals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  quantity text,
  calories integer NOT NULL DEFAULT 0,
  protein integer NOT NULL DEFAULT 0,
  carbs integer NOT NULL DEFAULT 0,
  fat integer NOT NULL DEFAULT 0,
  position integer NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_meal_items TO authenticated;
GRANT ALL ON public.saved_meal_items TO service_role;
ALTER TABLE public.saved_meal_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own saved meal items" ON public.saved_meal_items FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS saved_meal_items_meal_idx ON public.saved_meal_items (saved_meal_id, position);

-- ============ 4. SHOP: WISHLIST / RECENT / PREFS / STOCK WATCH ============

CREATE TABLE IF NOT EXISTS public.wishlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug text NOT NULL,
  preferred_size text,
  preferred_color text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, slug)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wishlist_items TO authenticated;
GRANT ALL ON public.wishlist_items TO service_role;
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own wishlist" ON public.wishlist_items FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.recently_viewed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug text NOT NULL,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, slug)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recently_viewed TO authenticated;
GRANT ALL ON public.recently_viewed TO service_role;
ALTER TABLE public.recently_viewed ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own recently viewed" ON public.recently_viewed FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS recently_viewed_user_idx ON public.recently_viewed (user_id, viewed_at DESC);

CREATE TABLE IF NOT EXISTS public.shop_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_sizes text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_preferences TO authenticated;
GRANT ALL ON public.shop_preferences TO service_role;
ALTER TABLE public.shop_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own shop prefs" ON public.shop_preferences FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER shop_preferences_updated_at BEFORE UPDATE ON public.shop_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.stock_watches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug text NOT NULL,
  size text,
  color text,
  last_seen_available boolean NOT NULL DEFAULT false,
  notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, slug, size, color)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_watches TO authenticated;
GRANT ALL ON public.stock_watches TO service_role;
ALTER TABLE public.stock_watches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own stock watches" ON public.stock_watches FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS stock_watches_slug_idx ON public.stock_watches (slug);

-- ============ 5. REWARDS ============

CREATE TABLE IF NOT EXISTS public.rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  kind text NOT NULL DEFAULT 'claim',
  points_cost integer NOT NULL DEFAULT 500,
  active boolean NOT NULL DEFAULT true,
  stock integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.rewards TO authenticated;
GRANT ALL ON public.rewards TO service_role;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read rewards" ON public.rewards FOR SELECT TO authenticated USING (active OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage rewards" ON public.rewards FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
GRANT INSERT, UPDATE, DELETE ON public.rewards TO authenticated;
CREATE TRIGGER rewards_updated_at BEFORE UPDATE ON public.rewards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.reward_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_id uuid NOT NULL REFERENCES public.rewards(id) ON DELETE RESTRICT,
  points_spent integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reward_redemptions TO authenticated;
GRANT UPDATE ON public.reward_redemptions TO authenticated;
GRANT ALL ON public.reward_redemptions TO service_role;
ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or admin redemptions" ON public.reward_redemptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update redemptions" ON public.reward_redemptions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS reward_redemptions_user_idx ON public.reward_redemptions (user_id, created_at DESC);
CREATE TRIGGER reward_redemptions_updated_at BEFORE UPDATE ON public.reward_redemptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ 6. IDEMPOTENT POINTS + REWARD RPCs ============

CREATE OR REPLACE FUNCTION public.award_points(_user_id uuid, _delta integer, _reason text, _event_key text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inserted boolean := false;
BEGIN
  INSERT INTO public.points_ledger (user_id, delta, reason, event_key)
  VALUES (_user_id, _delta, _reason, _event_key)
  ON CONFLICT (user_id, event_key) WHERE event_key IS NOT NULL DO NOTHING;
  GET DIAGNOSTICS inserted = ROW_COUNT;
  RETURN inserted;
END; $$;

CREATE OR REPLACE FUNCTION public.notify_user(
  _user_id uuid, _kind text, _title text, _body text, _url text, _actor uuid, _dedupe text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _user_id IS NULL OR (_actor IS NOT NULL AND _actor = _user_id) THEN RETURN; END IF;
  INSERT INTO public.notifications (user_id, kind, title, body, url, actor_id, dedupe_key)
  VALUES (_user_id, _kind, _title, _body, _url, _actor, _dedupe)
  ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
END; $$;

CREATE OR REPLACE FUNCTION public.claim_points_event(_delta integer, _reason text, _event_key text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ok boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF _delta <= 0 OR _delta > 1000 THEN RAISE EXCEPTION 'Invalid award'; END IF;
  IF _event_key IS NULL OR _event_key !~ '^(workout|pr):' THEN RAISE EXCEPTION 'Invalid event'; END IF;
  ok := public.award_points(auth.uid(), _delta, _reason, _event_key);
  IF ok THEN
    PERFORM public.notify_user(auth.uid(), 'points', 'MAXOUT Points earned',
      '+' || _delta || ' points · ' || _reason, '/rewards', NULL, 'pts:' || _event_key);
  END IF;
  RETURN ok;
END; $$;

CREATE OR REPLACE FUNCTION public.redeem_reward(_reward_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.rewards; bal integer; rid uuid; uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  SELECT * INTO r FROM public.rewards WHERE id = _reward_id AND active FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Reward unavailable'; END IF;
  IF r.stock IS NOT NULL AND r.stock <= 0 THEN RAISE EXCEPTION 'Reward out of stock'; END IF;
  SELECT points INTO bal FROM public.profiles WHERE id = uid FOR UPDATE;
  IF COALESCE(bal, 0) < r.points_cost THEN RAISE EXCEPTION 'Not enough points'; END IF;

  INSERT INTO public.reward_redemptions (user_id, reward_id, points_spent)
  VALUES (uid, _reward_id, r.points_cost) RETURNING id INTO rid;

  INSERT INTO public.points_ledger (user_id, delta, reason, event_key)
  VALUES (uid, -r.points_cost, 'Redeemed: ' || r.title, 'redemption:' || rid);

  IF r.stock IS NOT NULL THEN UPDATE public.rewards SET stock = stock - 1 WHERE id = _reward_id; END IF;

  PERFORM public.notify_user(uid, 'reward', 'Reward redeemed', r.title || ' — pending fulfilment', '/rewards', NULL, 'redeem:' || rid);
  RETURN rid;
END; $$;

-- ============ 7. CHALLENGE PROGRESS ENGINE ============

CREATE OR REPLACE FUNCTION public.sync_challenge_progress(_user_id uuid DEFAULT auth.uid())
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE rec record; v numeric; d date; n integer; awarded boolean;
BEGIN
  IF _user_id IS NULL THEN RETURN; END IF;
  FOR rec IN
    SELECT cp.id AS pid, cp.completed_at, cp.reward_claimed_at, c.*
    FROM public.challenge_participants cp
    JOIN public.challenges c ON c.id = cp.challenge_id
    WHERE cp.user_id = _user_id
  LOOP
    v := 0;
    IF rec.metric = 'workout_count' THEN
      SELECT count(*) INTO v FROM public.workouts w
       WHERE w.user_id = _user_id AND w.performed_at >= rec.starts_on
         AND (rec.ends_on IS NULL OR w.performed_at < rec.ends_on + 1);
    ELSIF rec.metric = 'total_sets' THEN
      SELECT count(*) INTO v FROM public.workout_sets s
       JOIN public.workouts w ON w.id = s.workout_id
       WHERE s.user_id = _user_id AND w.performed_at >= rec.starts_on
         AND (rec.ends_on IS NULL OR w.performed_at < rec.ends_on + 1);
    ELSIF rec.metric = 'total_volume' THEN
      SELECT COALESCE(sum(COALESCE(s.weight,0) * COALESCE(s.reps,0)),0) INTO v
       FROM public.workout_sets s JOIN public.workouts w ON w.id = s.workout_id
       WHERE s.user_id = _user_id AND w.performed_at >= rec.starts_on
         AND (rec.ends_on IS NULL OR w.performed_at < rec.ends_on + 1);
    ELSIF rec.metric = 'pr_count' THEN
      SELECT count(*) INTO v FROM public.personal_records p
       WHERE p.user_id = _user_id AND p.achieved_at >= rec.starts_on
         AND (rec.ends_on IS NULL OR p.achieved_at <= rec.ends_on);
    ELSIF rec.metric = 'bodyweight_logs' THEN
      SELECT count(DISTINCT b.logged_at) INTO v FROM public.body_metrics b
       WHERE b.user_id = _user_id AND b.logged_at >= rec.starts_on
         AND (rec.ends_on IS NULL OR b.logged_at <= rec.ends_on);
    ELSIF rec.metric = 'workout_streak' THEN
      n := 0; d := current_date;
      WHILE EXISTS (SELECT 1 FROM public.workouts w WHERE w.user_id = _user_id
                    AND w.performed_at >= d AND w.performed_at < d + 1) LOOP
        n := n + 1; d := d - 1;
      END LOOP;
      v := n;
    END IF;

    UPDATE public.challenge_participants
       SET progress = LEAST(2147483647, floor(v))::int,
           completed_at = CASE WHEN completed_at IS NULL AND rec.target_value > 0 AND v >= rec.target_value
                               THEN now() ELSE completed_at END
     WHERE id = rec.pid;

    IF rec.reward_claimed_at IS NULL AND rec.target_value > 0 AND v >= rec.target_value THEN
      awarded := public.award_points(_user_id, GREATEST(rec.reward_points, 0),
                   'Challenge: ' || rec.title, 'challenge:' || rec.id);
      UPDATE public.challenge_participants SET reward_claimed_at = now() WHERE id = rec.pid;
      PERFORM public.notify_user(_user_id, 'challenge', 'Challenge complete',
        rec.title || ' — ' || rec.reward_points || ' MAXOUT Points earned', '/community',
        NULL, 'challenge-done:' || rec.id);
    END IF;
  END LOOP;
END; $$;

-- ============ 8. SOCIAL NOTIFICATION TRIGGERS ============

CREATE OR REPLACE FUNCTION public.tg_notify_like() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner uuid; who text;
BEGIN
  SELECT user_id INTO owner FROM public.posts WHERE id = NEW.post_id;
  SELECT COALESCE(display_name, username, 'An athlete') INTO who FROM public.profiles WHERE id = NEW.user_id;
  PERFORM public.notify_user(owner, 'like', 'New like', who || ' liked your post', '/community',
    NEW.user_id, 'like:' || NEW.post_id || ':' || NEW.user_id);
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS notify_like_trg ON public.post_likes;
CREATE TRIGGER notify_like_trg AFTER INSERT ON public.post_likes FOR EACH ROW EXECUTE FUNCTION public.tg_notify_like();

CREATE OR REPLACE FUNCTION public.tg_notify_comment() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner uuid; who text;
BEGIN
  SELECT user_id INTO owner FROM public.posts WHERE id = NEW.post_id;
  SELECT COALESCE(display_name, username, 'An athlete') INTO who FROM public.profiles WHERE id = NEW.user_id;
  PERFORM public.notify_user(owner, 'comment', 'New comment', who || ': ' || left(NEW.body, 80), '/community',
    NEW.user_id, 'comment:' || NEW.id);
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS notify_comment_trg ON public.post_comments;
CREATE TRIGGER notify_comment_trg AFTER INSERT ON public.post_comments FOR EACH ROW EXECUTE FUNCTION public.tg_notify_comment();

CREATE OR REPLACE FUNCTION public.tg_notify_follow() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE who text; handle text;
BEGIN
  SELECT COALESCE(display_name, username, 'An athlete'), username INTO who, handle
    FROM public.profiles WHERE id = NEW.follower_id;
  PERFORM public.notify_user(NEW.following_id, 'follow', 'New follower', who || ' started following you',
    '/u/' || COALESCE(handle, ''), NEW.follower_id, 'follow:' || NEW.follower_id || ':' || NEW.following_id);
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS notify_follow_trg ON public.follows;
CREATE TRIGGER notify_follow_trg AFTER INSERT ON public.follows FOR EACH ROW EXECUTE FUNCTION public.tg_notify_follow();

CREATE OR REPLACE FUNCTION public.tg_notify_dm() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE who text; handle text;
BEGIN
  SELECT COALESCE(display_name, username, 'An athlete'), username INTO who, handle
    FROM public.profiles WHERE id = NEW.sender_id;
  PERFORM public.notify_user(NEW.recipient_id, 'dm', 'New message', who || ': ' || left(NEW.body, 80),
    '/messages/' || COALESCE(handle, ''), NEW.sender_id, 'dm:' || NEW.id);
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS notify_dm_trg ON public.direct_messages;
CREATE TRIGGER notify_dm_trg AFTER INSERT ON public.direct_messages FOR EACH ROW EXECUTE FUNCTION public.tg_notify_dm();

CREATE OR REPLACE FUNCTION public.tg_notify_cheer() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE who text;
BEGIN
  SELECT COALESCE(display_name, username, 'An athlete') INTO who FROM public.profiles WHERE id = NEW.from_user_id;
  PERFORM public.notify_user(NEW.to_user_id, 'hype', 'You got hype', who || ' sent ' || NEW.emoji, '/profile',
    NEW.from_user_id, 'cheer:' || NEW.id);
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS notify_cheer_trg ON public.cheers;
CREATE TRIGGER notify_cheer_trg AFTER INSERT ON public.cheers FOR EACH ROW EXECUTE FUNCTION public.tg_notify_cheer();