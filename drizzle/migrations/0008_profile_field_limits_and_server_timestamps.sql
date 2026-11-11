ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_display_name_len CHECK (char_length(display_name) BETWEEN 1 AND 20),
  ADD CONSTRAINT profiles_avatar_len CHECK (char_length(avatar) BETWEEN 1 AND 8),
  ADD CONSTRAINT profiles_country_format CHECK (country ~ '^[A-Z]{2}$'),
  ADD CONSTRAINT profiles_avatar_image_format CHECK (avatar_image IS NULL OR (char_length(avatar_image) <= 120000 AND avatar_image ~ '^data:image/(jpeg|png);base64,[A-Za-z0-9+/=]+$'));

-- Players may only change their own editable fields; id and created_at are never client-writable.
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (display_name, avatar, avatar_image, country, last_seen) ON public.profiles TO authenticated;

-- Timestamps are server-controlled: created_at never changes and last_seen is always the server clock.
CREATE OR REPLACE FUNCTION public.profiles_server_timestamps() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.id := OLD.id;
  NEW.created_at := OLD.created_at;
  IF NEW.last_seen IS DISTINCT FROM OLD.last_seen THEN NEW.last_seen := now(); END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.profiles_server_timestamps() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER profiles_server_timestamps BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.profiles_server_timestamps();