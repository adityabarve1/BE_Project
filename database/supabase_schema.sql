-- SUPABASE DATABASE SCHEMA
-- Run this in the Supabase SQL editor to create all necessary tables

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('teacher', 'student', 'admin')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Students table for student information
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    name TEXT NOT NULL,
    student_id TEXT NOT NULL,
    class_year TEXT NOT NULL CHECK (class_year IN ('FE', 'SE', 'TE', 'BE')),
    branch TEXT NOT NULL,
    division TEXT NOT NULL CHECK (division IN ('A', 'B', 'C')),
    risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, class_year, branch, division)
);

-- Enable RLS
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Student details table for all the attributes used for prediction
CREATE TABLE IF NOT EXISTS student_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id),
    attendance_rate FLOAT,
    gpa FLOAT,
    family_income FLOAT,
    parent_education TEXT,
    age INTEGER,
    gender TEXT,
    study_hours_per_week FLOAT,
    extracurricular_activities BOOLEAN,
    previous_failures INTEGER,
    health_status TEXT,
    transport_time FLOAT,
    internet_access BOOLEAN,
    family_support BOOLEAN,
    romantic_relationship BOOLEAN,
    free_time FLOAT,
    social_activities FLOAT,
    alcohol_consumption FLOAT,
    stress_level INTEGER,
    motivation_level INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id)
);

-- Enable RLS
ALTER TABLE student_details ENABLE ROW LEVEL SECURITY;

-- Document uploads table
CREATE TABLE IF NOT EXISTS uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_year TEXT NOT NULL CHECK (class_year IN ('FE', 'SE', 'TE', 'BE')),
    branch TEXT NOT NULL,
    division TEXT NOT NULL CHECK (division IN ('A', 'B', 'C')),
    document_type TEXT NOT NULL CHECK (document_type IN ('attendance', 'academic', 'personal', 'financial', 'other')),
    file_path TEXT NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    uploaded_by UUID REFERENCES users(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;

-- Upload logs table
CREATE TABLE IF NOT EXISTS upload_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    upload_id UUID REFERENCES uploads(id),
    rows_processed INTEGER,
    students_registered INTEGER DEFAULT 0,
    students_updated INTEGER DEFAULT 0,
    status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE upload_logs ENABLE ROW LEVEL SECURITY;

-- Predictions table
CREATE TABLE IF NOT EXISTS predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id),
    risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
    confidence_score FLOAT NOT NULL,
    prediction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create Row Level Security Policies

-- Users RLS policies
CREATE POLICY users_select_own ON users FOR SELECT 
    USING (auth.uid() = id OR auth.jwt() ->> 'role' = 'admin');

-- Students RLS policies
CREATE POLICY students_select_all ON students FOR SELECT 
    USING (true); -- Everyone can select students

CREATE POLICY students_insert_teacher ON students FOR INSERT 
    TO authenticated
    USING (auth.jwt() ->> 'role' IN ('teacher', 'admin'));

CREATE POLICY students_update_teacher ON students FOR UPDATE 
    TO authenticated
    USING (auth.jwt() ->> 'role' IN ('teacher', 'admin'));

-- Student details RLS policies
CREATE POLICY student_details_select_all ON student_details FOR SELECT 
    USING (true); -- Everyone can select student details

CREATE POLICY student_details_insert_teacher ON student_details FOR INSERT 
    TO authenticated
    USING (auth.jwt() ->> 'role' IN ('teacher', 'admin'));

CREATE POLICY student_details_update_teacher ON student_details FOR UPDATE 
    TO authenticated
    USING (auth.jwt() ->> 'role' IN ('teacher', 'admin'));

-- Uploads RLS policies
CREATE POLICY uploads_select_teacher ON uploads FOR SELECT 
    TO authenticated
    USING (auth.jwt() ->> 'role' IN ('teacher', 'admin'));

CREATE POLICY uploads_insert_teacher ON uploads FOR INSERT 
    TO authenticated
    USING (auth.jwt() ->> 'role' IN ('teacher', 'admin'));

CREATE POLICY uploads_update_teacher ON uploads FOR UPDATE 
    TO authenticated
    USING (auth.jwt() ->> 'role' IN ('teacher', 'admin'));

-- Upload logs RLS policies
CREATE POLICY upload_logs_select_teacher ON upload_logs FOR SELECT 
    TO authenticated
    USING (auth.jwt() ->> 'role' IN ('teacher', 'admin'));

-- Predictions RLS policies
CREATE POLICY predictions_select_teacher_or_own ON predictions FOR SELECT 
    TO authenticated
    USING (
        auth.jwt() ->> 'role' IN ('teacher', 'admin')
        OR EXISTS (
            SELECT 1 FROM students 
            WHERE students.id = predictions.student_id 
            AND students.user_id = auth.uid()
        )
    );

CREATE POLICY predictions_insert_teacher ON predictions FOR INSERT 
    TO authenticated
    USING (auth.jwt() ->> 'role' IN ('teacher', 'admin'));

-- Notifications RLS policies
CREATE POLICY notifications_select_own ON notifications FOR SELECT 
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY notifications_insert_teacher ON notifications FOR INSERT 
    TO authenticated
    USING (auth.jwt() ->> 'role' IN ('teacher', 'admin'));

CREATE POLICY notifications_update_own ON notifications FOR UPDATE 
    TO authenticated
    USING (user_id = auth.uid());

-- Create default admin user (password: Admin123!)
INSERT INTO users (email, password, role)
VALUES ('admin@example.com', '$2b$12$CwT1CtIeSHPZMU9DjEoTXOR6LGJmgCJDfXgFGy7edg53CPiqEPPZO', 'admin')
ON CONFLICT (email) DO NOTHING;