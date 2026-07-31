REVOKE ALL ON FUNCTION public.guard_elite_flag() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_verified_flag() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_points() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_active_subscription(uuid, text) FROM PUBLIC, anon;