-- Room-count invariant (PLAN.md §10 hard gate, brief §6 step 3).
-- Numbered 9999 so it runs after the Drizzle-generated init migration.
--
-- Enforces SUM(room_types.count) = property_profile.total_rooms.
-- Fires AFTER INSERT/UPDATE/DELETE on either table. Trigger is DEFERRABLE
-- INITIALLY DEFERRED so a single transaction can update multiple rows in
-- room_types and still satisfy the invariant at commit time (necessary for
-- the seed script and for any future rebalancing tool).

CREATE OR REPLACE FUNCTION check_room_count_invariant() RETURNS TRIGGER AS $$
DECLARE
  declared_total INTEGER;
  actual_sum INTEGER;
BEGIN
  SELECT total_rooms INTO declared_total FROM property_profile WHERE id = 1;
  -- If property_profile is not yet seeded, skip the check.
  IF declared_total IS NULL THEN RETURN NULL; END IF;

  SELECT COALESCE(SUM(count), 0) INTO actual_sum FROM room_types;

  IF actual_sum <> declared_total THEN
    RAISE EXCEPTION
      'room count invariant violated: SUM(room_types.count) = % but property_profile.total_rooms = %',
      actual_sum, declared_total;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER room_count_invariant_room_types
  AFTER INSERT OR UPDATE OR DELETE ON room_types
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION check_room_count_invariant();

CREATE CONSTRAINT TRIGGER room_count_invariant_property_profile
  AFTER INSERT OR UPDATE OF total_rooms ON property_profile
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION check_room_count_invariant();
