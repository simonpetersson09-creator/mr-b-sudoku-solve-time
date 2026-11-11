CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT (_user_id = auth.uid() OR coalesce(auth.role(),'') = 'service_role')
  AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.insert_sudoku_game_report(_user_id uuid, _device_id text, _platform text, _detail jsonb, _created_at timestamptz DEFAULT now()) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _at timestamptz := coalesce(_created_at, now()); _start timestamptz;
BEGIN
  IF _user_id IS NULL OR _platform NOT IN ('ios','android') OR coalesce(_detail->>'gid','') = '' OR coalesce(_detail->>'phase','') NOT IN ('start','finish') THEN RAISE EXCEPTION 'invalid game report'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(_user_id::text || ':' || (_detail->>'gid') || ':' || (_detail->>'phase'), 0));
  IF EXISTS (SELECT 1 FROM public.app_events WHERE user_id = _user_id AND kind = 'local_game' AND detail->>'gid' = _detail->>'gid' AND detail->>'phase' = _detail->>'phase') THEN RETURN false; END IF;
  IF _detail->>'phase' = 'finish' THEN
    SELECT min(created_at) INTO _start FROM public.app_events
      WHERE user_id = _user_id AND kind = 'local_game' AND detail->>'gid' = _detail->>'gid' AND detail->>'phase' = 'start';
    -- A finish only counts when the same player reported starting that game at least 30 seconds earlier.
    IF _start IS NULL OR _at < _start + interval '30 seconds' THEN RETURN false; END IF;
    -- Bound how many finishes one player can add per day.
    IF (SELECT count(*) FROM public.app_events WHERE user_id = _user_id AND kind = 'local_game' AND detail->>'phase' = 'finish' AND created_at > _at - interval '24 hours') >= 100 THEN RETURN false; END IF;
  END IF;
  INSERT INTO public.app_events(user_id,kind,device_id,platform,detail,created_at) VALUES (_user_id,'local_game',_device_id,_platform,_detail,_at);
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.insert_sudoku_game_report(uuid,text,text,jsonb,timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.insert_sudoku_game_report(uuid,text,text,jsonb,timestamptz) TO service_role;