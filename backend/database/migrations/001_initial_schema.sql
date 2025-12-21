-- Enable PostGIS extension for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create users table (simplified for MVP)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create graves table (main location and payment info)
CREATE TABLE IF NOT EXISTS graves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Geolocation
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    accuracy DOUBLE PRECISION,
    
    -- Location information
    cemetery_name VARCHAR(255),
    grave_number VARCHAR(50),
    sector VARCHAR(50),
    notes TEXT,
    
    -- Payment tracking for grave plot
    payment_expiry_date DATE,
    last_payment_amount DECIMAL(10, 2),
    payment_duration_months INTEGER,
    payment_currency VARCHAR(3) DEFAULT 'PLN',
    
    -- Metadata
    photos TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create deceased_persons table (many people can be in one grave)
CREATE TABLE IF NOT EXISTS deceased_persons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grave_id UUID REFERENCES graves(id) ON DELETE CASCADE,
    
    -- Person information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    birth_date DATE,
    death_date DATE,
    
    -- Optional details
    maiden_name VARCHAR(100),
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_graves_user_id ON graves(user_id);
CREATE INDEX IF NOT EXISTS idx_graves_location ON graves(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_graves_created_at ON graves(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_graves_payment_expiry ON graves(payment_expiry_date) WHERE payment_expiry_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_deceased_persons_grave_id ON deceased_persons(grave_id);
CREATE INDEX IF NOT EXISTS idx_deceased_persons_last_name ON deceased_persons(last_name);

-- Create a function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update updated_at
DROP TRIGGER IF EXISTS update_graves_updated_at ON graves;
CREATE TRIGGER update_graves_updated_at
    BEFORE UPDATE ON graves
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_deceased_persons_updated_at ON deceased_persons;
CREATE TRIGGER update_deceased_persons_updated_at
    BEFORE UPDATE ON deceased_persons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Optional: Create a spatial index using PostGIS (for future geospatial queries)
-- This requires converting lat/lng to geography type in the future
-- CREATE INDEX idx_graves_geography ON graves USING GIST(
--     geography(ST_MakePoint(longitude, latitude))
-- );

-- Insert demo user for testing
INSERT INTO users (id, email) 
VALUES ('00000000-0000-0000-0000-000000000001', 'demo@gravemap.app')
ON CONFLICT (email) DO NOTHING;

-- Grant permissions (adjust based on your RLS policies)
ALTER TABLE graves ENABLE ROW LEVEL SECURITY;
ALTER TABLE deceased_persons ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own graves
CREATE POLICY "Users can view their own graves" ON graves
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own graves" ON graves
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own graves" ON graves
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own graves" ON graves
    FOR DELETE USING (auth.uid() = user_id);

-- Policy: Users can see deceased persons in their graves
CREATE POLICY "Users can view deceased persons in their graves" ON deceased_persons
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM graves 
            WHERE graves.id = deceased_persons.grave_id 
            AND graves.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert deceased persons in their graves" ON deceased_persons
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM graves 
            WHERE graves.id = deceased_persons.grave_id 
            AND graves.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update deceased persons in their graves" ON deceased_persons
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM graves 
            WHERE graves.id = deceased_persons.grave_id 
            AND graves.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete deceased persons in their graves" ON deceased_persons
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM graves 
            WHERE graves.id = deceased_persons.grave_id 
            AND graves.user_id = auth.uid()
        )
    );

-- For development: Allow service role to bypass RLS
-- (Remove in production or adjust based on your auth strategy)
