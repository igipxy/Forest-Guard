-- supabase/migrations/0002_phase2_hardening.sql

-- 1. Allow NULL for weather metrics not provided by BMKG public endpoints
ALTER TABLE weather_records
  ALTER COLUMN pressure_hpa DROP NOT NULL,
  ALTER COLUMN uv_index DROP NOT NULL,
  ALTER COLUMN solar_radiation_wm2 DROP NOT NULL,
  ALTER COLUMN solar_radiation_wm2 DROP DEFAULT;

ALTER TABLE weather_records
  DROP CONSTRAINT IF EXISTS weather_records_data_source_check;

ALTER TABLE weather_records
  ADD CONSTRAINT weather_records_data_source_check
  CHECK (data_source IN ('BMKG_LIVE', 'CACHED_FALLBACK', 'DEMO_SIMULATION', 'DATA_UNAVAILABLE'));

-- 2. Add CHECKING to cameras.stream_status
ALTER TABLE cameras
  DROP CONSTRAINT IF EXISTS cameras_stream_status_check;

ALTER TABLE cameras
  ADD CONSTRAINT cameras_stream_status_check
  CHECK (stream_status IN ('PLAYABLE', 'UNAVAILABLE', 'CHECKING'));

-- 3. Add data_source to fire_risk_predictions
ALTER TABLE fire_risk_predictions
  ADD COLUMN IF NOT EXISTS data_source VARCHAR(32) NOT NULL DEFAULT 'BMKG_LIVE'
  CHECK (data_source IN ('BMKG_LIVE', 'CACHED_FALLBACK', 'DEMO_SIMULATION', 'DATA_UNAVAILABLE'));

-- 4. Upgrade alerts table with lifecycle status and deduplication support
ALTER TABLE alerts
  ADD COLUMN IF NOT EXISTS status VARCHAR(16) NOT NULL DEFAULT 'CREATED'
    CHECK (status IN ('CREATED', 'ACKNOWLEDGED', 'RESOLVED')),
  ADD COLUMN IF NOT EXISTS dedup_key VARCHAR(160),
  ADD COLUMN IF NOT EXISTS occurrence_count INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_alerts_dedup_active
  ON alerts(dedup_key, status)
  WHERE status IN ('CREATED', 'ACKNOWLEDGED');

-- 5. Harden RLS policies: restrict system_logs and alert_thresholds writes to ADMIN JWT role
DROP POLICY IF EXISTS "Allow admin read system_logs" ON system_logs;
CREATE POLICY "Allow authenticated read system_logs"
  ON system_logs FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow admin update alert_thresholds" ON alert_thresholds;
CREATE POLICY "Allow admin update alert_thresholds"
  ON alert_thresholds FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN');