CREATE OR REPLACE FUNCTION public.insert_sudoku_game_report(_user_id uuid, _device_id text, _platform text, _detail jsonb, _created_at timestamptz DEFAULT now()) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _user_id IS NULL OR _platform NOT IN ('ios','android') OR coalesce(_detail->>'gid','') = '' OR coalesce(_detail->>'phase','') NOT IN ('start','finish') THEN RAISE EXCEPTION 'invalid game report'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(_user_id::text || ':' || (_detail->>'gid') || ':' || (_detail->>'phase'), 0));
  IF EXISTS (SELECT 1 FROM public.app_events WHERE user_id = _user_id AND kind = 'local_game' AND detail->>'gid' = _detail->>'gid' AND detail->>'phase' = _detail->>'phase') THEN RETURN false; END IF;
  -- Abuse limit on server receipt (atomic counter, key removed by profile cleanup), never on the caller-chosen date.
  -- Exceeding it raises so the client keeps the report queued and retries later instead of dropping it.
  IF _detail->>'phase' = 'finish' AND NOT public.rate_hit('report:' || _user_id::text || ':game_finish', 100, 86400) THEN
    RAISE EXCEPTION 'daily finish limit';
  END IF;
  INSERT INTO public.app_events(user_id,kind,device_id,platform,detail,created_at) VALUES (_user_id,'local_game',_device_id,_platform,_detail,coalesce(_created_at,now()));
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.insert_sudoku_game_report(uuid,text,text,jsonb,timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.insert_sudoku_game_report(uuid,text,text,jsonb,timestamptz) TO service_role;