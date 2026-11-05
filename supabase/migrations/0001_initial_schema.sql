-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Weather Records Table
CREATE TABLE weather_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    station_id VARCHAR(64) NOT NULL,
    location_name VARCHAR(128) NOT NULL,
    temperature_c NUMERIC(5,2) NOT NULL,
    wind_speed_kmh NUMERIC(6,2) NOT NULL,
    pressure_hpa NUMERIC(6,2) NOT NULL,
    uv_index NUMERIC(4,2) NOT NULL,
    solar_radiation_wm2 NUMERIC(7,2),
    precipitation_mm NUMERIC(6,2) NOT NULL DEFAULT 0.0,
    last_rainfall_at TIMESTAMPTZ,
    humidity_pct NUMERIC(5,2) NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_fallback BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX idx_weather_recorded_at ON weather_records(recorded_at DESC);

-- 2. Cameras Table (Shared / Managed by camera-web)
CREATE TABLE cameras (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(128) NOT NULL,
    code VARCHAR(64) UNIQUE NOT NULL,
    location VARCHAR(128) NOT NULL,
    latitude NUMERIC(9,6),
    longitude NUMERIC(9,6),
    status VARCHAR(16) NOT NULL CHECK (status IN ('ONLINE', 'OFFLINE')),
    stream_protocol VARCHAR(16) NOT NULL CHECK (stream_protocol IN ('HLS', 'WEBRTC')),
    stream_url TEXT NOT NULL,
    stream_playable BOOLEAN NOT NULL DEFAULT FALSE,
    last_heartbeat_at TIMESTAMPTZ,
    last_connected_at TIMESTAMPTZ,
    error_status VARCHAR(64),
    error_message TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_cameras_status_location ON cameras(status, location);

-- 3. Fire Risk Predictions Table
CREATE TABLE fire_risk_predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    weather_record_id UUID REFERENCES weather_records(id) ON DELETE SET NULL,
    location VARCHAR(128) NOT NULL,
    risk_score INTEGER NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
    classification VARCHAR(16) NOT NULL CHECK (classification IN ('VERY_LOW', 'LOW', 'MODERATE', 'HIGH', 'EXTREME')),
    model_version VARCHAR(64) NOT NULL,
    is_heuristic BOOLEAN NOT NULL DEFAULT TRUE,
    contributing_factors JSONB NOT NULL,
    vulnerable_areas JSONB NOT NULL,
    predicted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_fire_risk_predicted_at ON fire_risk_predictions(predicted_at DESC);

-- 4. Daily Fire Risk Reports Table
CREATE TABLE daily_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_date DATE UNIQUE NOT NULL,
    max_temperature_c NUMERIC(5,2) NOT NULL,
    avg_wind_speed_kmh NUMERIC(6,2) NOT NULL,
    total_precipitation_mm NUMERIC(6,2) NOT NULL,
    avg_humidity_pct NUMERIC(5,2) NOT NULL,
    last_rainfall_at TIMESTAMPTZ,
    daily_risk_score INTEGER NOT NULL CHECK (daily_risk_score BETWEEN 0 AND 100),
    risk_classification VARCHAR(16) NOT NULL,
    highest_risk_period VARCHAR(64) NOT NULL,
    vulnerable_areas JSONB NOT NULL,
    risk_factor_analysis TEXT NOT NULL,
    recommended_actions JSONB NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Alerts Table
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    severity VARCHAR(16) NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
    category VARCHAR(32) NOT NULL CHECK (category IN ('FIRE_RISK', 'WEATHER', 'CAMERA', 'SYSTEM_SYNC')),
    description TEXT NOT NULL,
    location VARCHAR(128),
    related_camera_id UUID REFERENCES cameras(id) ON DELETE SET NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
    acknowledged_by UUID,
    acknowledged_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_alerts_severity_created ON alerts(severity, created_at DESC);

-- 6. Alert Thresholds Configuration Table
CREATE TABLE alert_thresholds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    max_temperature_c NUMERIC(5,2) NOT NULL DEFAULT 36.0,
    max_wind_speed_kmh NUMERIC(6,2) NOT NULL DEFAULT 30.0,
    min_humidity_pct NUMERIC(5,2) NOT NULL DEFAULT 30.0,
    max_dry_days INTEGER NOT NULL DEFAULT 7,
    high_risk_threshold INTEGER NOT NULL DEFAULT 61,
    extreme_risk_threshold INTEGER NOT NULL DEFAULT 81,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. System Logs Table
CREATE TABLE system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    level VARCHAR(16) NOT NULL CHECK (level IN ('INFO', 'WARN', 'ERROR', 'FATAL')),
    http_status INTEGER,
    error_category VARCHAR(32) NOT NULL,
    message TEXT NOT NULL,
    request_endpoint VARCHAR(255),
    request_method VARCHAR(16),
    source_service VARCHAR(64) NOT NULL,
    metadata JSONB,
    stack_trace TEXT -- Restricted via RBAC in API layer
);
CREATE INDEX idx_system_logs_filter ON system_logs(level, source_service, timestamp DESC);