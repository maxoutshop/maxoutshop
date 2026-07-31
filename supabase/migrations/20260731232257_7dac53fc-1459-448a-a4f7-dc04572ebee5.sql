DROP POLICY IF EXISTS "Participants readable by signed-in users" ON public.challenge_participants;
CREATE POLICY "Users read own challenge participation"
  ON public.challenge_participants FOR SELECT TO authenticated
  USING (auth.uid() = user_id);