-- GauDhara Dairy Health & Mastitis Screening
-- Production Supabase Schema with Row Level Security (RLS)

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Animals Table (Herd Inventory)
CREATE TABLE IF NOT EXISTS public.animals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    tag_id VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    breed VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    lactation_stage VARCHAR(30) NOT NULL DEFAULT 'Early', -- 'Early', 'Mid', 'Late', 'Dry'
    parity INTEGER NOT NULL DEFAULT 1,
    avg_daily_yield_liters NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
    status VARCHAR(30) NOT NULL DEFAULT 'healthy', -- 'healthy', 'subclinical_suspect', 'clinical_alert', 'in_recovery'
    barn_location VARCHAR(100) NOT NULL DEFAULT 'Shed 1',
    rfid_code VARCHAR(100),
    last_screened_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Screenings Table (Milk Sensor Telemetry & Nodus Compute Results)
CREATE TABLE IF NOT EXISTS public.screenings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    animal_id UUID REFERENCES public.animals(id) ON DELETE CASCADE,
    animal_tag VARCHAR(50) NOT NULL,
    animal_name VARCHAR(100) NOT NULL,
    screened_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    quarter VARCHAR(20) NOT NULL, -- 'FL', 'FR', 'RL', 'RR', 'composite'
    electrical_conductivity NUMERIC(5, 2) NOT NULL, -- mS/cm
    quarter_conductivities JSONB, -- { FL: 4.6, FR: 4.5, RL: 7.2, RR: 4.7 }
    ph_level NUMERIC(4, 2) NOT NULL,
    scc_estimate INTEGER NOT NULL, -- cells/mL
    temperature_c NUMERIC(4, 2) NOT NULL,
    optical_density NUMERIC(5, 3) NOT NULL,
    milk_yield_kg NUMERIC(5, 2),
    compute_result JSONB NOT NULL, -- Full Nodus Compute / Local Rule verification payload
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Alerts Table (Veterinary Clinical Notifications)
CREATE TABLE IF NOT EXISTS public.alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    animal_id UUID REFERENCES public.animals(id) ON DELETE CASCADE,
    animal_tag VARCHAR(50) NOT NULL,
    animal_name VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'warning', -- 'critical', 'warning', 'info'
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    affected_quarter VARCHAR(20),
    recommended_action TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'resolved', 'dismissed'
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Row Level Security (RLS) Configuration
ALTER TABLE public.animals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screenings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Allow users to manage only their own farm records
CREATE POLICY "Users can manage their own animals" 
    ON public.animals FOR ALL 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own screenings" 
    ON public.screenings FOR ALL 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own alerts" 
    ON public.alerts FOR ALL 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

-- Indexes for high-frequency veterinary dashboard queries
CREATE INDEX IF NOT EXISTS idx_animals_user_tag ON public.animals(user_id, tag_id);
CREATE INDEX IF NOT EXISTS idx_animals_status ON public.animals(user_id, status);
CREATE INDEX IF NOT EXISTS idx_screenings_animal_time ON public.screenings(animal_id, screened_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_user_status ON public.alerts(user_id, status);
