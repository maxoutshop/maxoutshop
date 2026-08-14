REVOKE EXECUTE ON FUNCTION public.award_points(uuid, integer, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.notify_user(uuid, text, text, text, text, uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.claim_points_event(integer, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.redeem_reward(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.sync_challenge_progress(uuid) FROM PUBLIC, anon;

-- internal-only helpers: not callable from the Data API at all
REVOKE EXECUTE ON FUNCTION public.award_points(uuid, integer, text, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_user(uuid, text, text, text, text, uuid, text) FROM authenticated;

-- member-callable RPCs
GRANT EXECUTE ON FUNCTION public.claim_points_event(integer, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_reward(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_challenge_progress(uuid) TO authenticated;