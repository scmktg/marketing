-- Supabase Auth → public.users sync trigger.
-- Numbered 9998 so it runs after the Drizzle-generated init migration.
--
-- When a new user is created via Supabase Auth (auth.users), insert a
-- matching row in public.users with the default 'marketing' role. The
-- first manager is promoted manually via:
--   UPDATE public.users SET role='manager' WHERE email = 'first.manager@example.com';
--
-- New manager accounts are then created via the admin UI (settings page).

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (NEW.id, NEW.email, 'marketing')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
