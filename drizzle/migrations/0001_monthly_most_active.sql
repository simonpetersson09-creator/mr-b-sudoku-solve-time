CREATE OR REPLACE FUNCTION public.get_monthly_most_active(_limit integer DEFAULT 10)
 RETURNS TABLE(user_id uuid, display_name text, avatar text, avatar_image text, country text, games integer, games_24h integer)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  -- Finished Sudoku games this Stockholm calendar month; each game id counts once; test devices excluded.
  WITH g AS (
    SELECT e.user_id, coalesce(e.detail->>'gid', e.id::text) AS gid, min(e.created_at) AS at
    FROM public.app_events e
    WHERE e.kind = 'local_game' AND e.detail->>'phase' = 'finish' AND e.user_id IS NOT NULL
      AND e.platform IN ('ios','android')
      AND e.created_at >= (date_trunc('month', now() AT TIME ZONE 'Europe/Stockholm') AT TIME ZONE 'Europe/Stockholm')
      AND NOT EXISTS (SELECT 1 FROM public.admin_activity_exclusions x WHERE x.user_id = e.user_id)
    GROUP BY e.user_id, 2
  )
  SELECT g.user_id, p.display_name, p.avatar, p.avatar_image, p.country,
         count(*)::int, count(*) FILTER (WHERE g.at >= now() - interval '24 hours')::int
  FROM g JOIN public.profiles p ON p.id = g.user_id
  GROUP BY g.user_id, p.display_name, p.avatar, p.avatar_image, p.country
  ORDER BY 6 DESC, max(g.at) ASC
  LIMIT least(greatest(coalesce(_limit, 10), 1), 50);
$function$;
REVOKE ALL ON FUNCTION public.get_monthly_most_active(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_monthly_most_active(integer) TO authenticated, service_role;