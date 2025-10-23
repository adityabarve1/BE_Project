-- ============================================================================
-- Student Dropout Prediction System - Supabase Database Schema
-- ============================================================================
-- This script creates all necessary tables, indexes, and RLS policies
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. STUDENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    roll_number VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    gender VARCHAR(20),
    date_of_birth DATE,
    address TEXT,
    admission_date DATE NOT NULL,
    program VARCHAR(100) NOT NULL,
    semester INTEGER NOT NULL DEFAULT 1,
    current_gpa DECIMAL(3, 2) DEFAULT 0.00,
    overall_gpa DECIMAL(3, 2) DEFAULT 0.00,
    credits_completed INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    dropout_risk_level VARCHAR(20) DEFAULT 'low', -- 'low', 'medium', 'high'
    dropout_risk_score DECIMAL(5, 4) DEFAULT 0.0000,
    last_prediction_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT valid_gpa CHECK (current_gpa >= 0.00 AND current_gpa <= 4.00),
    CONSTRAINT valid_overall_gpa CHECK (overall_gpa >= 0.00 AND overall_gpa <= 4.00),
    CONSTRAINT valid_risk_level CHECK (dropout_risk_level IN ('low', 'medium', 'high')),
    CONSTRAINT valid_risk_score CHECK (dropout_risk_score >= 0.0000 AND dropout_risk_score <= 1.0000)
);

-- Create index for faster queries
CREATE INDEX idx_students_roll_number ON students(roll_number);
CREATE INDEX idx_students_email ON students(email);
CREATE INDEX idx_students_risk_level ON students(dropout_risk_level);
CREATE INDEX idx_students_program ON students(program);
CREATE INDEX idx_students_is_active ON students(is_active);

-- ============================================================================
-- 2. ATTENDANCE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(20) NOT NULL, -- 'present', 'absent', 'late', 'excused'
    subject VARCHAR(100),
    semester INTEGER NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    recorded_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT valid_attendance_status CHECK (status IN ('present', 'absent', 'late', 'excused')),
    CONSTRAINT unique_attendance_record UNIQUE (student_id, date, subject)
);

-- Create indexes
CREATE INDEX idx_attendance_student_id ON attendance(student_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_attendance_status ON attendance(status);
CREATE INDEX idx_attendance_semester ON attendance(semester);

-- ============================================================================
-- 3. ACADEMIC RECORDS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS academic_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    semester INTEGER NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    subject_code VARCHAR(50) NOT NULL,
    subject_name VARCHAR(255) NOT NULL,
    credits INTEGER NOT NULL,
    grade VARCHAR(5), -- 'A+', 'A', 'B+', 'B', etc.
    grade_points DECIMAL(3, 2), -- 4.00, 3.70, etc.
    marks_obtained DECIMAL(5, 2),
    total_marks DECIMAL(5, 2),
    percentage DECIMAL(5, 2),
    status VARCHAR(20) DEFAULT 'ongoing', -- 'ongoing', 'passed', 'failed', 'withdrawn'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_grade_points CHECK (grade_points >= 0.00 AND grade_points <= 4.00),
    CONSTRAINT valid_status CHECK (status IN ('ongoing', 'passed', 'failed', 'withdrawn')),
    CONSTRAINT unique_subject_semester UNIQUE (student_id, semester, subject_code)
);

-- Create indexes
CREATE INDEX idx_academic_records_student_id ON academic_records(student_id);
CREATE INDEX idx_academic_records_semester ON academic_records(semester);
CREATE INDEX idx_academic_records_status ON academic_records(status);

-- ============================================================================
-- 4. EXTRACURRICULAR ACTIVITIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS extracurricular_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    activity_name VARCHAR(255) NOT NULL,
    activity_type VARCHAR(100), -- 'sports', 'cultural', 'technical', 'social'
    role VARCHAR(100), -- 'participant', 'organizer', 'leader'
    start_date DATE,
    end_date DATE,
    hours_participated INTEGER DEFAULT 0,
    achievements TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_extracurricular_student_id ON extracurricular_activities(student_id);
CREATE INDEX idx_extracurricular_type ON extracurricular_activities(activity_type);

-- ============================================================================
-- 5. FINANCIAL RECORDS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS financial_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    semester INTEGER NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    total_fees DECIMAL(10, 2) NOT NULL,
    amount_paid DECIMAL(10, 2) DEFAULT 0.00,
    amount_pending DECIMAL(10, 2) NOT NULL,
    scholarship_amount DECIMAL(10, 2) DEFAULT 0.00,
    payment_status VARCHAR(20) DEFAULT 'pending', -- 'paid', 'pending', 'overdue'
    due_date DATE,
    payment_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_payment_status CHECK (payment_status IN ('paid', 'pending', 'overdue', 'partial'))
);

-- Create indexes
CREATE INDEX idx_financial_student_id ON financial_records(student_id);
CREATE INDEX idx_financial_payment_status ON financial_records(payment_status);

-- ============================================================================
-- 6. PREDICTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    prediction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    risk_level VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high'
    risk_score DECIMAL(5, 4) NOT NULL,
    confidence_score DECIMAL(5, 4),
    model_version VARCHAR(50),
    features_used JSONB, -- Store the features used for prediction
    prediction_factors JSONB, -- Store contributing factors
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_pred_risk_level CHECK (risk_level IN ('low', 'medium', 'high')),
    CONSTRAINT valid_pred_risk_score CHECK (risk_score >= 0.0000 AND risk_score <= 1.0000)
);

-- Create indexes
CREATE INDEX idx_predictions_student_id ON predictions(student_id);
CREATE INDEX idx_predictions_date ON predictions(prediction_date);
CREATE INDEX idx_predictions_risk_level ON predictions(risk_level);

-- ============================================================================
-- 7. INTERVENTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS interventions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    intervention_type VARCHAR(100) NOT NULL, -- 'counseling', 'academic_support', 'financial_aid', etc.
    description TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(20) DEFAULT 'planned', -- 'planned', 'ongoing', 'completed', 'cancelled'
    outcome TEXT,
    assigned_to UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT valid_intervention_status CHECK (status IN ('planned', 'ongoing', 'completed', 'cancelled'))
);

-- Create indexes
CREATE INDEX idx_interventions_student_id ON interventions(student_id);
CREATE INDEX idx_interventions_status ON interventions(status);
CREATE INDEX idx_interventions_assigned_to ON interventions(assigned_to);

-- ============================================================================
-- 8. TEACHER PROFILES TABLE (Extended user info)
-- ============================================================================
CREATE TABLE IF NOT EXISTS teacher_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    department VARCHAR(100),
    designation VARCHAR(100),
    specialization TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index
CREATE INDEX idx_teacher_profiles_email ON teacher_profiles(email);
CREATE INDEX idx_teacher_profiles_department ON teacher_profiles(department);

-- ============================================================================
-- 9. SYSTEM LOGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100), -- 'student', 'attendance', 'prediction', etc.
    resource_id UUID,
    details JSONB,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_system_logs_user_id ON system_logs(user_id);
CREATE INDEX idx_system_logs_action ON system_logs(action);
CREATE INDEX idx_system_logs_created_at ON system_logs(created_at);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all tables with updated_at
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON attendance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_academic_records_updated_at BEFORE UPDATE ON academic_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_extracurricular_updated_at BEFORE UPDATE ON extracurricular_activities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_financial_updated_at BEFORE UPDATE ON financial_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interventions_updated_at BEFORE UPDATE ON interventions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teacher_profiles_updated_at BEFORE UPDATE ON teacher_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TRIGGER TO AUTO-CREATE TEACHER PROFILE ON USER SIGNUP
-- ============================================================================

-- Function to create teacher profile when user signs up
CREATE OR REPLACE FUNCTION create_teacher_profile_on_signup()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert into teacher_profiles table
    INSERT INTO public.teacher_profiles (id, full_name, email, is_active)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.email,
        true
    );
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the user creation
        RAISE WARNING 'Failed to create teacher profile: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_teacher_profile_on_signup();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE extracurricular_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users (teachers/admins)
-- Allow teachers to read all student data
CREATE POLICY "Teachers can view all students"
    ON students FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Teachers can insert students"
    ON students FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Teachers can update students"
    ON students FOR UPDATE
    TO authenticated
    USING (true);

-- Similar policies for other tables
CREATE POLICY "Teachers can view all attendance"
    ON attendance FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Teachers can manage attendance"
    ON attendance FOR ALL
    TO authenticated
    USING (true);

CREATE POLICY "Teachers can view academic records"
    ON academic_records FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Teachers can manage academic records"
    ON academic_records FOR ALL
    TO authenticated
    USING (true);

CREATE POLICY "Teachers can view extracurricular"
    ON extracurricular_activities FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Teachers can manage extracurricular"
    ON extracurricular_activities FOR ALL
    TO authenticated
    USING (true);

CREATE POLICY "Teachers can view financial records"
    ON financial_records FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Teachers can view predictions"
    ON predictions FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Teachers can create predictions"
    ON predictions FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Teachers can view interventions"
    ON interventions FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Teachers can manage interventions"
    ON interventions FOR ALL
    TO authenticated
    USING (true);

-- Teacher profiles - users can only view and update their own profile
CREATE POLICY "Users can view own profile"
    ON teacher_profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON teacher_profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON teacher_profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- System logs - read only
CREATE POLICY "Authenticated users can view logs"
    ON system_logs FOR SELECT
    TO authenticated
    USING (true);

-- ============================================================================
-- VIEWS FOR ANALYTICS
-- ============================================================================

-- View for student statistics
CREATE OR REPLACE VIEW student_statistics AS
SELECT 
    COUNT(*) as total_students,
    COUNT(*) FILTER (WHERE is_active = true) as active_students,
    COUNT(*) FILTER (WHERE dropout_risk_level = 'high') as high_risk_students,
    COUNT(*) FILTER (WHERE dropout_risk_level = 'medium') as medium_risk_students,
    COUNT(*) FILTER (WHERE dropout_risk_level = 'low') as low_risk_students,
    AVG(overall_gpa) as average_gpa,
    AVG(dropout_risk_score) as average_risk_score
FROM students;

-- View for attendance summary per student
CREATE OR REPLACE VIEW student_attendance_summary AS
SELECT 
    student_id,
    semester,
    academic_year,
    COUNT(*) as total_classes,
    COUNT(*) FILTER (WHERE status = 'present') as classes_present,
    COUNT(*) FILTER (WHERE status = 'absent') as classes_absent,
    COUNT(*) FILTER (WHERE status = 'late') as classes_late,
    ROUND((COUNT(*) FILTER (WHERE status = 'present')::DECIMAL / COUNT(*)) * 100, 2) as attendance_percentage
FROM attendance
GROUP BY student_id, semester, academic_year;

-- ============================================================================
-- SAMPLE DATA (for testing)
-- ============================================================================

-- Insert sample students (optional - remove in production)
-- This is just for testing the schema
/*
INSERT INTO students (roll_number, name, email, phone, gender, date_of_birth, admission_date, program, semester)
VALUES 
    ('CS2021001', 'John Doe', 'john.doe@example.com', '1234567890', 'Male', '2003-05-15', '2021-08-01', 'Computer Science', 5),
    ('CS2021002', 'Jane Smith', 'jane.smith@example.com', '1234567891', 'Female', '2003-07-20', '2021-08-01', 'Computer Science', 5),
    ('IT2021001', 'Bob Johnson', 'bob.johnson@example.com', '1234567892', 'Male', '2003-03-10', '2021-08-01', 'Information Technology', 5);
*/

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$ 
BEGIN 
    RAISE NOTICE 'Database schema created successfully!';
    RAISE NOTICE 'Tables created: students, attendance, academic_records, extracurricular_activities, financial_records, predictions, interventions, teacher_profiles, system_logs';
    RAISE NOTICE 'RLS policies enabled for all tables';
    RAISE NOTICE 'Views created for analytics';
    RAISE NOTICE 'You can now start using the database!';
END $$;
