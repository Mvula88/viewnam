-- ViewNam · 2026-05-05 · Security hardening
-- Replaces wide-open RLS + client-side PIN comparison with:
--   * SECURITY DEFINER RPCs for all writes
--   * server-side PIN verification with bcrypt + lockout
--   * session tokens (8-hour expiry) instead of `sessionStorage` flags
--   * inspectors_public view that hides pin_hash from anon
--
-- This migration is idempotent: re-running is safe.

-- ---------- 1. Extensions ----------
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------- 2. Lockout columns ----------
ALTER TABLE inspectors
  ADD COLUMN IF NOT EXISTS failed_attempts INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ NULL;

ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS admin_failed_attempts INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS admin_locked_until TIMESTAMPTZ NULL;

-- Reports must be unique per booking so inspector_save_report can UPSERT cleanly.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reports_booking_id_unique'
  ) THEN
    ALTER TABLE reports ADD CONSTRAINT reports_booking_id_unique UNIQUE (booking_id);
  END IF;
END $$;

-- ---------- 3. Session table ----------
CREATE TABLE IF NOT EXISTS auth_sessions (
  token       TEXT PRIMARY KEY,
  role        TEXT NOT NULL CHECK (role IN ('admin','inspector')),
  user_id     UUID NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;
-- No anon policies — all access goes through SECURITY DEFINER functions.

-- ---------- 4. Public inspector view (no pin_hash, no lockout fields) ----------
CREATE OR REPLACE VIEW inspectors_public AS
SELECT id, name, phone, town, brand_expertise, status, payout_fixed, created_at
FROM inspectors;

GRANT SELECT ON inspectors_public TO anon, authenticated;

-- ---------- 5. RLS tightening ----------
-- Drop wide-open policies if they exist
DROP POLICY IF EXISTS "Anyone can update bookings" ON bookings;
DROP POLICY IF EXISTS "Anyone can delete bookings" ON bookings;
DROP POLICY IF EXISTS "Anyone can read inspectors" ON inspectors;
DROP POLICY IF EXISTS "Anyone can update inspectors" ON inspectors;
DROP POLICY IF EXISTS "Anyone can insert inspectors" ON inspectors;
DROP POLICY IF EXISTS "Anyone can delete inspectors" ON inspectors;
DROP POLICY IF EXISTS "Anyone can update settings" ON settings;
DROP POLICY IF EXISTS "Anyone can read settings" ON settings;

-- Block anon write paths on bookings (writes go through admin_* RPCs)
DROP POLICY IF EXISTS "block_anon_update_bookings" ON bookings;
CREATE POLICY "block_anon_update_bookings" ON bookings
  FOR UPDATE TO anon USING (false);
DROP POLICY IF EXISTS "block_anon_delete_bookings" ON bookings;
CREATE POLICY "block_anon_delete_bookings" ON bookings
  FOR DELETE TO anon USING (false);

-- Block ALL anon access on inspectors table (use inspectors_public view instead)
ALTER TABLE inspectors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "block_anon_select_inspectors" ON inspectors;
DROP POLICY IF EXISTS "block_anon_insert_inspectors" ON inspectors;
DROP POLICY IF EXISTS "block_anon_update_inspectors" ON inspectors;
DROP POLICY IF EXISTS "block_anon_delete_inspectors" ON inspectors;
CREATE POLICY "block_anon_select_inspectors" ON inspectors
  FOR SELECT TO anon USING (false);
CREATE POLICY "block_anon_insert_inspectors" ON inspectors
  FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "block_anon_update_inspectors" ON inspectors
  FOR UPDATE TO anon USING (false);
CREATE POLICY "block_anon_delete_inspectors" ON inspectors
  FOR DELETE TO anon USING (false);

-- Block anon writes on settings
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "block_anon_select_settings" ON settings;
CREATE POLICY "block_anon_select_settings" ON settings
  FOR SELECT TO anon USING (false);
DROP POLICY IF EXISTS "block_anon_update_settings" ON settings;
CREATE POLICY "block_anon_update_settings" ON settings
  FOR UPDATE TO anon USING (false);
DROP POLICY IF EXISTS "block_anon_insert_settings" ON settings;
CREATE POLICY "block_anon_insert_settings" ON settings
  FOR INSERT TO anon WITH CHECK (false);

-- Bookings: customer must be able to INSERT (create booking) and SELECT (track booking).
-- Drop any older variant we may collide with, then create canonical names.
DROP POLICY IF EXISTS "anon_insert_bookings" ON bookings;
CREATE POLICY "anon_insert_bookings" ON bookings FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "anon_select_bookings" ON bookings;
CREATE POLICY "anon_select_bookings" ON bookings FOR SELECT TO anon USING (true);

-- ---------- 6. PIN hash helpers (PRIVATE) ----------
CREATE OR REPLACE FUNCTION _verify_pin_hash(_pin TEXT, _hash TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF _hash IS NULL OR _pin IS NULL THEN
    RETURN FALSE;
  END IF;
  -- bcrypt hash starts with $2a$, $2b$, or $2y$
  IF _hash LIKE '$2%' THEN
    RETURN crypt(_pin, _hash) = _hash;
  END IF;
  -- legacy SHA-256 hex (64 chars)
  IF length(_hash) = 64 THEN
    RETURN encode(digest(_pin, 'sha256'), 'hex') = _hash;
  END IF;
  RETURN FALSE;
END $$;

CREATE OR REPLACE FUNCTION _hash_pin_bcrypt(_pin TEXT)
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
AS $$
BEGIN
  RETURN crypt(_pin, gen_salt('bf', 10));
END $$;

REVOKE EXECUTE ON FUNCTION _verify_pin_hash(TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION _hash_pin_bcrypt(TEXT) FROM PUBLIC;

-- ---------- 7. Session validator (PRIVATE) ----------
CREATE OR REPLACE FUNCTION _auth_validate(_token TEXT, _required_role TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _session auth_sessions;
BEGIN
  SELECT * INTO _session FROM auth_sessions WHERE token = _token;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '28000';
  END IF;
  IF _session.expires_at < NOW() THEN
    DELETE FROM auth_sessions WHERE token = _token;
    RAISE EXCEPTION 'session_expired' USING ERRCODE = '28000';
  END IF;
  IF _required_role IS NOT NULL AND _session.role <> _required_role THEN
    RAISE EXCEPTION 'wrong_role' USING ERRCODE = '28000';
  END IF;
  RETURN _session.user_id;
END $$;

REVOKE EXECUTE ON FUNCTION _auth_validate(TEXT, TEXT) FROM PUBLIC;

-- ---------- 8. Login RPCs ----------
CREATE OR REPLACE FUNCTION admin_login(_pin TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _row settings;
  _hash TEXT;
  _now TIMESTAMPTZ := NOW();
  _token TEXT;
  _expires TIMESTAMPTZ;
BEGIN
  SELECT * INTO _row FROM settings WHERE key = 'admin_pin_hash' LIMIT 1;
  IF NOT FOUND THEN
    -- Fallback: some installs may keep admin pin in a single settings row keyed differently
    SELECT * INTO _row FROM settings LIMIT 1;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'no_admin');
    END IF;
  END IF;

  -- Read hash from either `value` (key/value style) or `admin_pin_hash` column (legacy)
  _hash := COALESCE(_row.value, NULLIF(_row.admin_pin_hash, ''));

  IF _row.admin_locked_until IS NOT NULL AND _row.admin_locked_until > _now THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'locked', 'until', _row.admin_locked_until);
  END IF;

  IF _verify_pin_hash(_pin, _hash) THEN
    -- Reset attempts; transparently re-hash legacy SHA-256 to bcrypt
    UPDATE settings
       SET admin_failed_attempts = 0,
           admin_locked_until = NULL,
           value = CASE WHEN length(_hash) = 64 THEN _hash_pin_bcrypt(_pin) ELSE value END,
           admin_pin_hash = CASE WHEN length(_hash) = 64 AND admin_pin_hash IS NOT NULL THEN _hash_pin_bcrypt(_pin) ELSE admin_pin_hash END
     WHERE id = _row.id;

    _token := gen_random_uuid()::text;
    _expires := _now + INTERVAL '8 hours';
    INSERT INTO auth_sessions (token, role, user_id, expires_at)
      VALUES (_token, 'admin', NULL, _expires);

    -- Cleanup expired sessions opportunistically
    DELETE FROM auth_sessions WHERE expires_at < _now;

    RETURN jsonb_build_object('ok', true, 'token', _token, 'expires_at', _expires);
  END IF;

  -- Failure path
  UPDATE settings
     SET admin_failed_attempts = admin_failed_attempts + 1,
         admin_locked_until = CASE
           WHEN admin_failed_attempts + 1 >= 5 THEN _now + INTERVAL '15 minutes'
           ELSE admin_locked_until
         END
   WHERE id = _row.id;

  RETURN jsonb_build_object('ok', false, 'reason', 'invalid');
END $$;

CREATE OR REPLACE FUNCTION inspector_login(_phone TEXT, _pin TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _row inspectors;
  _now TIMESTAMPTZ := NOW();
  _token TEXT;
  _expires TIMESTAMPTZ;
BEGIN
  SELECT * INTO _row FROM inspectors WHERE phone = _phone;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  IF _row.locked_until IS NOT NULL AND _row.locked_until > _now THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'locked', 'until', _row.locked_until);
  END IF;

  IF _verify_pin_hash(_pin, _row.pin_hash) THEN
    UPDATE inspectors
       SET failed_attempts = 0,
           locked_until = NULL,
           pin_hash = CASE WHEN length(_row.pin_hash) = 64 THEN _hash_pin_bcrypt(_pin) ELSE pin_hash END
     WHERE id = _row.id;

    _token := gen_random_uuid()::text;
    _expires := _now + INTERVAL '8 hours';
    INSERT INTO auth_sessions (token, role, user_id, expires_at)
      VALUES (_token, 'inspector', _row.id, _expires);

    DELETE FROM auth_sessions WHERE expires_at < _now;

    RETURN jsonb_build_object('ok', true, 'token', _token, 'expires_at', _expires,
                              'inspector_id', _row.id, 'name', _row.name);
  END IF;

  UPDATE inspectors
     SET failed_attempts = failed_attempts + 1,
         locked_until = CASE
           WHEN failed_attempts + 1 >= 5 THEN _now + INTERVAL '15 minutes'
           ELSE locked_until
         END
   WHERE id = _row.id;

  RETURN jsonb_build_object('ok', false, 'reason', 'invalid');
END $$;

GRANT EXECUTE ON FUNCTION admin_login(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION inspector_login(TEXT, TEXT) TO anon, authenticated;

-- ---------- 9. Logout RPCs ----------
CREATE OR REPLACE FUNCTION admin_logout(_token TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM auth_sessions WHERE token = _token;
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION inspector_logout(_token TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM auth_sessions WHERE token = _token;
  RETURN jsonb_build_object('ok', true);
END $$;

GRANT EXECUTE ON FUNCTION admin_logout(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION inspector_logout(TEXT) TO anon, authenticated;

-- ---------- 10. Admin write RPCs ----------
CREATE OR REPLACE FUNCTION admin_assign_inspector(_token TEXT, _booking_id UUID, _inspector_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM _auth_validate(_token, 'admin');
  UPDATE bookings
     SET inspector_id = _inspector_id,
         status = CASE WHEN status IN ('new','confirmed') THEN 'assigned' ELSE status END
   WHERE id = _booking_id;
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION admin_update_booking_status(_token TEXT, _booking_id UUID, _status TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM _auth_validate(_token, 'admin');
  UPDATE bookings SET status = _status WHERE id = _booking_id;
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION admin_update_payment_status(_token TEXT, _booking_id UUID, _payment_status TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM _auth_validate(_token, 'admin');
  -- payment_status column may not exist on every deployment; guard with dynamic SQL
  EXECUTE 'UPDATE bookings SET payment_status = $1 WHERE id = $2'
    USING _payment_status, _booking_id;
  RETURN jsonb_build_object('ok', true);
EXCEPTION WHEN undefined_column THEN
  RETURN jsonb_build_object('ok', false, 'reason', 'no_payment_status_column');
END $$;

-- Generic multi-field booking update (whitelisted columns only)
CREATE OR REPLACE FUNCTION admin_update_booking(_token TEXT, _booking_id UUID, _patch JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _key TEXT;
  _val JSONB;
  _txt TEXT;
  _allowed TEXT[] := ARRAY[
    'status','confirmed_at','completed_at','assigned_inspector','inspector_id',
    'commission_rate','platform_fee','inspector_payout','payment_status','paid_at',
    'paid_to_inspector','paid_to_inspector_at',
    'inspector_notified','client_notified','notes','seller_location','seller_contact',
    'vehicle_make','vehicle_model','vehicle_year','client_name','client_phone','client_email',
    'price','services'
  ];
BEGIN
  PERFORM _auth_validate(_token, 'admin');
  FOR _key IN SELECT jsonb_object_keys(_patch) LOOP
    IF NOT (_key = ANY(_allowed)) THEN CONTINUE; END IF;
    _val := _patch->_key;
    IF jsonb_typeof(_val) = 'null' THEN
      EXECUTE format('UPDATE bookings SET %I = NULL WHERE id = $1', _key) USING _booking_id;
    ELSE
      _txt := _val #>> '{}';
      BEGIN
        EXECUTE format('UPDATE bookings SET %I = $1 WHERE id = $2', _key) USING _txt, _booking_id;
      EXCEPTION WHEN datatype_mismatch OR invalid_text_representation THEN
        -- Fall back: cast text -> column type via a temp cast
        EXECUTE format('UPDATE bookings SET %I = $1::text::%s WHERE id = $2',
                       _key,
                       (SELECT data_type FROM information_schema.columns
                          WHERE table_name='bookings' AND column_name=_key))
          USING _txt, _booking_id;
      END;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('ok', true);
EXCEPTION WHEN undefined_column THEN
  RETURN jsonb_build_object('ok', false, 'reason', 'undefined_column', 'column', _key);
END $$;

CREATE OR REPLACE FUNCTION admin_delete_booking(_token TEXT, _booking_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM _auth_validate(_token, 'admin');
  DELETE FROM bookings WHERE id = _booking_id;
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION admin_create_inspector(_token TEXT, _payload JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE _new_id UUID;
BEGIN
  PERFORM _auth_validate(_token, 'admin');
  INSERT INTO inspectors (name, phone, town, brand_expertise, status, payout_fixed, pin_hash)
    VALUES (
      _payload->>'name',
      _payload->>'phone',
      _payload->>'town',
      COALESCE((SELECT array_agg(value::text) FROM jsonb_array_elements_text(_payload->'brand_expertise')), '{}')::text[],
      COALESCE(_payload->>'status', 'active'),
      COALESCE(_payload->'payout_fixed', '{}'::jsonb),
      _hash_pin_bcrypt(COALESCE(_payload->>'pin', '0000'))
    )
    RETURNING id INTO _new_id;
  RETURN jsonb_build_object('ok', true, 'inspector_id', _new_id);
END $$;

CREATE OR REPLACE FUNCTION admin_update_inspector(_token TEXT, _inspector_id UUID, _patch JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM _auth_validate(_token, 'admin');
  UPDATE inspectors SET
    name = COALESCE(_patch->>'name', name),
    phone = COALESCE(_patch->>'phone', phone),
    town = COALESCE(_patch->>'town', town),
    brand_expertise = COALESCE(
      (SELECT array_agg(value::text) FROM jsonb_array_elements_text(_patch->'brand_expertise')),
      brand_expertise
    ),
    status = COALESCE(_patch->>'status', status),
    payout_fixed = COALESCE(_patch->'payout_fixed', payout_fixed)
  WHERE id = _inspector_id;
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION admin_delete_inspector(_token TEXT, _inspector_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM _auth_validate(_token, 'admin');
  DELETE FROM inspectors WHERE id = _inspector_id;
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION admin_set_admin_pin(_token TEXT, _new_pin TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE _new_hash TEXT;
BEGIN
  PERFORM _auth_validate(_token, 'admin');
  IF length(_new_pin) < 4 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'pin_too_short');
  END IF;
  _new_hash := _hash_pin_bcrypt(_new_pin);
  UPDATE settings
     SET value = _new_hash,
         admin_pin_hash = CASE WHEN admin_pin_hash IS NOT NULL THEN _new_hash ELSE admin_pin_hash END
   WHERE key = 'admin_pin_hash' OR key IS NULL;
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION admin_set_inspector_pin(_token TEXT, _inspector_id UUID, _new_pin TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM _auth_validate(_token, 'admin');
  IF length(_new_pin) < 4 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'pin_too_short');
  END IF;
  UPDATE inspectors
     SET pin_hash = _hash_pin_bcrypt(_new_pin),
         failed_attempts = 0,
         locked_until = NULL
   WHERE id = _inspector_id;
  RETURN jsonb_build_object('ok', true);
END $$;

GRANT EXECUTE ON FUNCTION admin_assign_inspector(TEXT, UUID, UUID)         TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_update_booking_status(TEXT, UUID, TEXT)    TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_update_payment_status(TEXT, UUID, TEXT)    TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_update_booking(TEXT, UUID, JSONB)          TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_booking(TEXT, UUID)                 TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_create_inspector(TEXT, JSONB)              TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_update_inspector(TEXT, UUID, JSONB)        TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_inspector(TEXT, UUID)               TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_set_admin_pin(TEXT, TEXT)                  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_set_inspector_pin(TEXT, UUID, TEXT)        TO anon, authenticated;

-- ---------- 10b. Public settings view + admin setting RPC ----------
-- Customer-facing pages need to read the bank details and default commission rate.
-- Expose only those keys via a view so the rest of the settings table stays private.
CREATE OR REPLACE VIEW public_settings AS
SELECT key, value
FROM settings
WHERE key IN (
  'default_commission_rate',
  'bank_name',
  'bank_account_name',
  'bank_account_number',
  'bank_branch_code'
);
GRANT SELECT ON public_settings TO anon, authenticated;

CREATE OR REPLACE FUNCTION admin_upsert_setting(_token TEXT, _key TEXT, _value TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _allowed TEXT[] := ARRAY[
    'default_commission_rate',
    'bank_name','bank_account_name','bank_account_number','bank_branch_code'
  ];
BEGIN
  PERFORM _auth_validate(_token, 'admin');
  IF NOT (_key = ANY(_allowed)) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'key_not_allowed');
  END IF;
  INSERT INTO settings (key, value)
    VALUES (_key, _value)
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
  RETURN jsonb_build_object('ok', true);
END $$;

GRANT EXECUTE ON FUNCTION admin_upsert_setting(TEXT, TEXT, TEXT) TO anon, authenticated;

-- ---------- 11. Inspector write RPCs ----------
CREATE OR REPLACE FUNCTION inspector_save_report(_token TEXT, _booking_id UUID, _payload JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE _inspector_id UUID;
BEGIN
  _inspector_id := _auth_validate(_token, 'inspector');

  INSERT INTO reports (booking_id, inspector_id, score, recommendation, key_issues, repair_costs, buyer_advice, stats, full_data)
    VALUES (
      _booking_id,
      _inspector_id,
      (_payload->>'score')::numeric,
      _payload->>'recommendation',
      _payload->'key_issues',
      _payload->'repair_costs',
      _payload->>'buyer_advice',
      _payload->'stats',
      _payload->'full_data'
    )
  ON CONFLICT (booking_id) DO UPDATE SET
      inspector_id    = EXCLUDED.inspector_id,
      score           = EXCLUDED.score,
      recommendation  = EXCLUDED.recommendation,
      key_issues      = EXCLUDED.key_issues,
      repair_costs    = EXCLUDED.repair_costs,
      buyer_advice    = EXCLUDED.buyer_advice,
      stats           = EXCLUDED.stats,
      full_data       = EXCLUDED.full_data;

  UPDATE bookings SET status = 'completed' WHERE id = _booking_id;
  RETURN jsonb_build_object('ok', true);
END $$;

GRANT EXECUTE ON FUNCTION inspector_save_report(TEXT, UUID, JSONB) TO anon, authenticated;

-- Inspector can mark THEIR OWN assigned booking in-progress / completed.
-- Validates the session AND that the booking is assigned to this inspector.
CREATE OR REPLACE FUNCTION inspector_update_booking_status(_token TEXT, _booking_id UUID, _status TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _inspector_id UUID;
  _allowed_statuses TEXT[] := ARRAY['in-progress','completed'];
  _booking_inspector UUID;
BEGIN
  _inspector_id := _auth_validate(_token, 'inspector');
  IF NOT (_status = ANY(_allowed_statuses)) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'status_not_allowed');
  END IF;
  -- Verify the booking is assigned to this inspector (column may be assigned_inspector or inspector_id)
  BEGIN
    EXECUTE 'SELECT COALESCE(assigned_inspector, inspector_id) FROM bookings WHERE id = $1'
      INTO _booking_inspector USING _booking_id;
  EXCEPTION WHEN undefined_column THEN
    EXECUTE 'SELECT inspector_id FROM bookings WHERE id = $1'
      INTO _booking_inspector USING _booking_id;
  END;
  IF _booking_inspector IS DISTINCT FROM _inspector_id THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_assigned');
  END IF;
  IF _status = 'completed' THEN
    UPDATE bookings SET status = _status, completed_at = NOW() WHERE id = _booking_id;
  ELSE
    UPDATE bookings SET status = _status WHERE id = _booking_id;
  END IF;
  RETURN jsonb_build_object('ok', true);
END $$;

GRANT EXECUTE ON FUNCTION inspector_update_booking_status(TEXT, UUID, TEXT) TO anon, authenticated;

-- Inspector applicant onboarding: allow anyone to submit an application (creates a 'pending' inspector row).
-- Bcrypt the PIN they choose. Admin reviews/activates from admin.html.
CREATE OR REPLACE FUNCTION inspector_apply(_payload JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE _new_id UUID;
BEGIN
  IF _payload IS NULL OR _payload->>'phone' IS NULL OR _payload->>'name' IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'missing_fields');
  END IF;
  -- Reject if a row with that phone already exists (avoid clobbering an active inspector)
  IF EXISTS (SELECT 1 FROM inspectors WHERE phone = _payload->>'phone') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'phone_exists');
  END IF;
  INSERT INTO inspectors (name, phone, email, town, region, experience, status, brand_expertise, pin_hash)
    VALUES (
      _payload->>'name',
      _payload->>'phone',
      _payload->>'email',
      _payload->>'town',
      _payload->>'region',
      _payload->>'experience',
      'pending',
      COALESCE((SELECT array_agg(value::text) FROM jsonb_array_elements_text(_payload->'brand_expertise')), '{}')::text[],
      _hash_pin_bcrypt(COALESCE(_payload->>'pin', '0000'))
    )
    RETURNING id INTO _new_id;
  RETURN jsonb_build_object('ok', true, 'inspector_id', _new_id);
END $$;

GRANT EXECUTE ON FUNCTION inspector_apply(JSONB) TO anon, authenticated;

-- ---------- 12. Verification queries (run manually to confirm) ----------
-- SELECT proname FROM pg_proc WHERE proname IN (
--   'admin_login','inspector_login','admin_logout','inspector_logout',
--   'admin_assign_inspector','admin_update_booking_status','admin_update_payment_status',
--   'admin_create_inspector','admin_update_inspector','admin_delete_inspector',
--   'admin_set_admin_pin','admin_set_inspector_pin','inspector_save_report'
-- );
-- SELECT polname, polrelid::regclass, polcmd FROM pg_policies WHERE schemaname='public';
-- SELECT * FROM information_schema.views WHERE table_name = 'inspectors_public';
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name='inspectors' AND column_name IN ('failed_attempts','locked_until');
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name='settings' AND column_name IN ('admin_failed_attempts','admin_locked_until');
