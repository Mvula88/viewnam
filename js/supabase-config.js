// ===========================
// ViewNam — Supabase Configuration
// ===========================
//
// SETUP INSTRUCTIONS:
// 1. Go to https://supabase.com and create a free project
// 2. Go to Project Settings → API
// 3. Copy your "Project URL" and "anon public" key below
// 4. Go to SQL Editor and run the schema below to create tables
//
// ===========================

const SUPABASE_URL = 'https://kjirzqtnwellolcdkpnk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqaXJ6cXRud2VsbG9sY2RrcG5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNzQ2NDYsImV4cCI6MjA5MDY1MDY0Nn0.381k1q0TifxvxJq9qi5uVGjUcXYw5qXF83oeF3EQIeQ';
// Initialize Supabase client
const supabase = window.supabase
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

if (!supabase) {
    console.warn('Supabase not loaded. Make sure the Supabase CDN script is included before this file.');
}

// ===========================
// SQL SCHEMA — Run this in Supabase SQL Editor
// ===========================
/*

-- Bookings table
CREATE TABLE bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reference TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'new' CHECK (status IN ('new','confirmed','assigned','in-progress','completed','cancelled')),

    -- Client
    client_name TEXT NOT NULL,
    client_phone TEXT NOT NULL,
    client_email TEXT,
    client_location TEXT,

    -- Vehicle
    vehicle_make TEXT,
    vehicle_model TEXT,
    vehicle_year TEXT,
    asking_price TEXT,
    vehicle_link TEXT,

    -- Inspection
    seller_location TEXT,
    seller_contact TEXT,
    services TEXT[], -- array of service IDs
    notes TEXT,

    -- Assignment
    assigned_inspector UUID REFERENCES inspectors(id),
    inspector_notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    confirmed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- Inspectors table
CREATE TABLE inspectors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    email TEXT,
    town TEXT,
    region TEXT,
    experience TEXT,
    has_obd TEXT DEFAULT 'no',
    has_transport TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','active','suspended')),
    pin TEXT, -- simple 4-digit PIN for login
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspectors ENABLE ROW LEVEL SECURITY;

-- Policies: allow anon to insert bookings (public form)
CREATE POLICY "Anyone can create bookings" ON bookings
    FOR INSERT TO anon WITH CHECK (true);

-- Policies: allow anon to read their own booking by reference
CREATE POLICY "Anyone can read booking by reference" ON bookings
    FOR SELECT TO anon USING (true);

-- Policies: allow anon to update bookings (admin uses anon key for now)
CREATE POLICY "Anyone can update bookings" ON bookings
    FOR UPDATE TO anon USING (true);

-- Policies: allow anon to delete bookings
CREATE POLICY "Anyone can delete bookings" ON bookings
    FOR DELETE TO anon USING (true);

-- Policies: inspectors
CREATE POLICY "Anyone can create inspector applications" ON inspectors
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anyone can read inspectors" ON inspectors
    FOR SELECT TO anon USING (true);

CREATE POLICY "Anyone can update inspectors" ON inspectors
    FOR UPDATE TO anon USING (true);

*/
