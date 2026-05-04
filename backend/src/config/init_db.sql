-- Reset Schema
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- trigram index for fast ILIKE search

-- Users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'traffic_controller',
    assigned_station VARCHAR(255) DEFAULT NULL,
    assigned_zone VARCHAR(100) DEFAULT NULL,
    profile_image TEXT DEFAULT '',
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Platforms
CREATE TABLE IF NOT EXISTS platforms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform_number VARCHAR(50) NOT NULL,
    station_name VARCHAR(255) NOT NULL,
    occupied BOOLEAN DEFAULT false,
    next_arrival TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active',
    demand_forecasts INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (platform_number, station_name)
);

-- Trains
CREATE TABLE IF NOT EXISTS trains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    train_number VARCHAR(100) UNIQUE NOT NULL,
    train_name VARCHAR(255) NOT NULL,
    route VARCHAR(255) NOT NULL,
    source VARCHAR(255) NOT NULL,
    destination VARCHAR(255) NOT NULL,
    current_location VARCHAR(255) DEFAULT 'Origin',
    zone VARCHAR(50) DEFAULT 'Northern',
    train_type VARCHAR(100) DEFAULT 'Express',
    speed INT DEFAULT 0,
    eta TIMESTAMP,
    delay_minutes INT DEFAULT 0,
    assigned_platform_id UUID REFERENCES platforms(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'scheduled',
    predicted_delay NUMERIC(5,2) DEFAULT 0.00,
    risk_scores INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Platforms -> Trains FK (after trains table)
ALTER TABLE platforms
ADD COLUMN assigned_train_id UUID REFERENCES trains(id) ON DELETE SET NULL;

-- Alerts
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(100) NOT NULL,
    severity VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    station_name VARCHAR(255) DEFAULT NULL,
    related_train_id UUID REFERENCES trains(id) ON DELETE CASCADE,
    related_platform_id UUID REFERENCES platforms(id) ON DELETE CASCADE,
    resolved BOOLEAN DEFAULT false,
    priority_level VARCHAR(50) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Analytics
CREATE TABLE IF NOT EXISTS analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE UNIQUE NOT NULL,
    total_trains INT DEFAULT 0,
    delayed_trains INT DEFAULT 0,
    on_time_rate NUMERIC(5,2) DEFAULT 100.00,
    avg_delay NUMERIC(5,2) DEFAULT 0.00,
    platform_usage NUMERIC(5,2) DEFAULT 0.00,
    incidents INT DEFAULT 0,
    prediction_results JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Maintenance
CREATE TABLE IF NOT EXISTS maintenance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_type VARCHAR(100) NOT NULL,
    asset_id VARCHAR(255) NOT NULL,
    condition VARCHAR(50) NOT NULL,
    risk_level VARCHAR(50) NOT NULL,
    next_service_date TIMESTAMP NOT NULL,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'scheduled',
    risk_score NUMERIC(5,2) DEFAULT NULL,
    ai_status VARCHAR(50) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Logs
CREATE TABLE IF NOT EXISTS logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(255) NOT NULL,
    module VARCHAR(255) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Routes
CREATE TABLE IF NOT EXISTS routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_name VARCHAR(255) NOT NULL,
    source VARCHAR(255) NOT NULL,
    destination VARCHAR(255) NOT NULL,
    congestion_level VARCHAR(50) DEFAULT 'Low',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Indexes for 10,000+ train scale ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_trains_status       ON trains(status);
CREATE INDEX IF NOT EXISTS idx_trains_zone         ON trains(zone);
CREATE INDEX IF NOT EXISTS idx_trains_type         ON trains(train_type);
CREATE INDEX IF NOT EXISTS idx_trains_number       ON trains(train_number);
CREATE INDEX IF NOT EXISTS idx_trains_delay        ON trains(delay_minutes);
CREATE INDEX IF NOT EXISTS idx_trains_created      ON trains(created_at DESC);
-- Trigram indexes for fast ILIKE search on name/number/route
CREATE INDEX IF NOT EXISTS idx_trains_name_trgm    ON trains USING gin(train_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_trains_number_trgm  ON trains USING gin(train_number gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_trains_route_trgm   ON trains USING gin(route gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_alerts_resolved     ON alerts(resolved, severity);
CREATE INDEX IF NOT EXISTS idx_alerts_created      ON alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_station      ON alerts(station_name);
CREATE INDEX IF NOT EXISTS idx_users_role          ON users(role);
CREATE INDEX IF NOT EXISTS idx_trains_source       ON trains(source);
CREATE INDEX IF NOT EXISTS idx_trains_destination  ON trains(destination);
CREATE INDEX IF NOT EXISTS idx_trains_location     ON trains(current_location);

-- ── Data Integrity Constraints ────────────────────────────────────────────────
-- Trains: valid status values, non-negative speed/delay
ALTER TABLE trains
  ADD CONSTRAINT chk_train_status
    CHECK (status IN ('running','delayed','scheduled','halted','cancelled')),
  ADD CONSTRAINT chk_train_speed
    CHECK (speed >= 0),
  ADD CONSTRAINT chk_train_delay
    CHECK (delay_minutes >= 0);

-- Platforms: valid status values
ALTER TABLE platforms
  ADD CONSTRAINT chk_platform_status
    CHECK (status IN ('active','maintenance','reserved','closed'));

-- Alerts: valid severity and type
ALTER TABLE alerts
  ADD CONSTRAINT chk_alert_severity
    CHECK (severity IN ('critical','high','medium','low'));

-- Maintenance: valid condition and risk level
ALTER TABLE maintenance
  ADD CONSTRAINT chk_maintenance_condition
    CHECK (condition IN ('good','fair','poor','critical')),
  ADD CONSTRAINT chk_maintenance_risk
    CHECK (risk_level IN ('low','medium','high','critical')),
  ADD CONSTRAINT chk_maintenance_status
    CHECK (status IN ('scheduled','in_progress','completed','cancelled'));

-- Users: valid role values
ALTER TABLE users
  ADD CONSTRAINT chk_user_role
    CHECK (role IN ('admin','national_controller','zone_admin','station_master','traffic_controller','dispatcher','engineer','analyst','viewer')),
  ADD CONSTRAINT chk_user_status
    CHECK (status IN ('active','inactive','suspended'));

-- ── Audit log index ───────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_logs_user      ON logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_module    ON logs(module);
