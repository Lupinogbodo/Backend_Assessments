-- Create briefings table
CREATE TABLE briefings (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    ticker VARCHAR(20) NOT NULL,
    sector VARCHAR(255) NOT NULL,
    analyst_name VARCHAR(255) NOT NULL,
    summary TEXT NOT NULL,
    recommendation TEXT NOT NULL,
    generated BOOLEAN NOT NULL DEFAULT FALSE,
    generated_html TEXT,
    generated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create briefing_points table
CREATE TABLE briefing_points (
    id SERIAL PRIMARY KEY,
    briefing_id INTEGER NOT NULL REFERENCES briefings(id) ON DELETE CASCADE,
    point_type VARCHAR(20) NOT NULL CHECK (point_type IN ('key_point', 'risk')),
    content TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create briefing_metrics table
CREATE TABLE briefing_metrics (
    id SERIAL PRIMARY KEY,
    briefing_id INTEGER NOT NULL REFERENCES briefings(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    value VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (briefing_id, name)
);

-- Create indexes
CREATE INDEX idx_briefing_points_briefing_id ON briefing_points(briefing_id);
CREATE INDEX idx_briefing_metrics_briefing_id ON briefing_metrics(briefing_id);
CREATE INDEX idx_briefings_ticker ON briefings(ticker);
