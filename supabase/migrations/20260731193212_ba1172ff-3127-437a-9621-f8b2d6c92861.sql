ALTER TABLE public.posts
  ADD CONSTRAINT posts_profile_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS posts_user_id_idx ON public.posts(user_id);