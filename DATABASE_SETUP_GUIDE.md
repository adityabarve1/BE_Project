# Supabase Database Setup Guide

## Overview
This guide will help you set up the complete database schema for the Student Dropout Prediction System using Supabase.

## Prerequisites
- Supabase account ([sign up here](https://supabase.com))
- Supabase project created
- Backend environment configured with Supabase credentials

## Step 1: Access Supabase SQL Editor

1. Go to your Supabase project dashboard: https://app.supabase.com
2. Click on your project
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New Query**

## Step 2: Run the Schema Script

1. Open the file `supabase_schema.sql` in this project
2. Copy the entire contents
3. Paste it into the Supabase SQL Editor
4. Click **Run** or press `Ctrl+Enter` (Windows/Linux) or `Cmd+Enter` (Mac)

**Expected Result:** You should see a success message indicating all tables, indexes, and policies were created.

## Step 3: Verify Database Setup

### Check Tables Created
Run this query to verify all tables:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

**Expected tables:**
- academic_records
- attendance
- extracurricular_activities
- financial_records
- interventions
- predictions
- students
- system_logs
- teacher_profiles

### Check Row Level Security (RLS)
Run this query to verify RLS is enabled:

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

All tables should have `rowsecurity = true`.

## Step 4: Database Schema Details

### Core Tables

#### 1. **students**
Main table for student information
- **Primary Key:** `id` (UUID)
- **Key Fields:**
  - `roll_number` (unique identifier)
  - `name`, `email`, `phone`
  - `program`, `semester`
  - `current_gpa`, `overall_gpa`
  - `dropout_risk_level` ('low', 'medium', 'high')
  - `dropout_risk_score` (0.0000 - 1.0000)

#### 2. **attendance**
Student attendance records
- **Foreign Key:** `student_id` → students.id
- **Key Fields:**
  - `date`, `status` ('present', 'absent', 'late', 'excused')
  - `subject`, `semester`, `academic_year`
  - Unique constraint: (student_id, date, subject)

#### 3. **academic_records**
Student grades and academic performance
- **Foreign Key:** `student_id` → students.id
- **Key Fields:**
  - `semester`, `academic_year`
  - `subject_code`, `subject_name`, `credits`
  - `grade`, `grade_points` (0.00 - 4.00)
  - `status` ('ongoing', 'passed', 'failed', 'withdrawn')

#### 4. **predictions**
ML model predictions for dropout risk
- **Foreign Key:** `student_id` → students.id
- **Key Fields:**
  - `prediction_date`
  - `risk_level`, `risk_score`, `confidence_score`
  - `model_version`
  - `features_used`, `prediction_factors` (JSONB)

#### 5. **interventions**
Actions taken to help at-risk students
- **Foreign Keys:**
  - `student_id` → students.id
  - `assigned_to`, `created_by` → auth.users.id
- **Key Fields:**
  - `intervention_type` (counseling, academic_support, etc.)
  - `description`, `start_date`, `end_date`
  - `status` ('planned', 'ongoing', 'completed', 'cancelled')

#### 6. **financial_records**
Student fee payment tracking
- **Foreign Key:** `student_id` → students.id
- **Key Fields:**
  - `total_fees`, `amount_paid`, `amount_pending`
  - `scholarship_amount`, `payment_status`

#### 7. **extracurricular_activities**
Student participation in activities
- **Foreign Key:** `student_id` → students.id
- **Key Fields:**
  - `activity_name`, `activity_type`, `role`
  - `hours_participated`, `achievements`

#### 8. **teacher_profiles**
Extended information for authenticated users
- **Foreign Key:** `id` → auth.users.id
- **Key Fields:**
  - `full_name`, `email`, `department`, `designation`

#### 9. **system_logs**
Audit trail for all system actions
- **Foreign Key:** `user_id` → auth.users.id
- **Key Fields:**
  - `action`, `resource_type`, `resource_id`
  - `details` (JSONB), `ip_address`

### Analytics Views

#### **student_statistics**
Aggregated statistics across all students:
- Total/active students count
- Risk level distribution
- Average GPA and risk scores

#### **student_attendance_summary**
Per-student attendance metrics:
- Total classes, present, absent, late
- Attendance percentage

## Step 5: Test Database Connection

Create a test file to verify the connection:

```python
# test_database.py
import asyncio
from supabase import create_client
import os
from dotenv import load_dotenv
from backend.database_service import DatabaseService

load_dotenv()

async def test_connection():
    # Initialize Supabase client
    supabase = create_client(
        os.getenv("SUPABASE_URL"),
        os.getenv("SUPABASE_KEY")
    )
    
    # Initialize database service
    db = DatabaseService(supabase)
    
    # Test: Get dashboard statistics
    print("Testing database connection...")
    stats = await db.get_dashboard_statistics()
    print(f"Dashboard stats: {stats}")
    
    # Test: Get all students
    students = await db.get_all_students()
    print(f"Total students in database: {len(students)}")
    
    print("✅ Database connection successful!")

if __name__ == "__main__":
    asyncio.run(test_connection())
```

Run the test:
```bash
source backend/venv/bin/activate
python test_database.py
```

## Step 6: Insert Sample Data (Optional)

If you want to test with sample data, run this SQL:

```sql
-- Sample student
INSERT INTO students (
    roll_number, name, email, phone, gender, date_of_birth,
    admission_date, program, semester, current_gpa, overall_gpa
) VALUES (
    'CS2021001', 'John Doe', 'john.doe@example.com', '1234567890',
    'Male', '2003-05-15', '2021-08-01', 'Computer Science', 5, 3.75, 3.65
);

-- Get the student ID for next inserts
SELECT id, name FROM students WHERE roll_number = 'CS2021001';

-- Sample attendance (replace <student_id> with actual ID)
INSERT INTO attendance (
    student_id, date, status, subject, semester, academic_year
) VALUES (
    '<student_id>', '2024-01-15', 'present', 'Data Structures', 5, '2023-24'
);

-- Sample academic record
INSERT INTO academic_records (
    student_id, semester, academic_year, subject_code, subject_name,
    credits, grade, grade_points, marks_obtained, total_marks
) VALUES (
    '<student_id>', 4, '2022-23', 'CS401', 'Database Systems',
    4, 'A', 4.00, 85, 100
);
```

## Step 7: Security Configuration

### RLS Policies Already Configured
The schema includes Row Level Security policies that:
- Allow authenticated users (teachers) to view all student data
- Allow teachers to manage attendance, records, and interventions
- Restrict teacher profiles to owner-only access
- Make system logs read-only

### Additional Security (Optional)

If you want to add role-based access:

```sql
-- Create custom role for admins
CREATE POLICY "Admins have full access"
    ON students FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM teacher_profiles
            WHERE id = auth.uid() AND designation = 'Admin'
        )
    );
```

## Step 8: Environment Variables

Ensure your `.env` file has these variables:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
```

## Step 9: Update Backend Code

The database service is now available. Update `backend/main_with_auth.py` to use it:

```python
from database_service import DatabaseService

# Initialize in startup
db_service = DatabaseService(supabase)

# Use in routes
@app.get("/api/v1/students")
async def get_students(current_user: dict = Depends(get_current_user)):
    students = await db_service.get_all_students()
    return {"students": students}
```

## Troubleshooting

### Error: "relation does not exist"
- Make sure you ran the entire schema script
- Check that you're connected to the correct database

### Error: "permission denied"
- Verify RLS policies are enabled
- Check that your API key has correct permissions
- Make sure you're authenticated when making requests

### Error: "duplicate key value"
- This is normal when re-running inserts
- Clear the table first: `TRUNCATE students CASCADE;`

### Slow Queries
- Indexes are already created
- For large datasets, consider adding more indexes:
  ```sql
  CREATE INDEX idx_custom ON table_name(column_name);
  ```

## Next Steps

1. ✅ Database schema created
2. ✅ RLS policies configured
3. ✅ Database service implemented
4. 🔄 Update backend routes to use real database
5. 🔄 Connect frontend to backend API
6. 🔄 Implement ML model prediction
7. 🔄 Add data visualization

## Useful SQL Queries

### Count Records
```sql
SELECT 
    'students' as table_name, COUNT(*) as count FROM students
UNION ALL
SELECT 'attendance', COUNT(*) FROM attendance
UNION ALL
SELECT 'predictions', COUNT(*) FROM predictions;
```

### View Recent Activity
```sql
SELECT * FROM system_logs ORDER BY created_at DESC LIMIT 10;
```

### Check High-Risk Students
```sql
SELECT roll_number, name, dropout_risk_level, dropout_risk_score
FROM students
WHERE dropout_risk_level = 'high'
ORDER BY dropout_risk_score DESC;
```

---

## Support

If you encounter any issues:
1. Check Supabase logs in Dashboard → Logs
2. Review RLS policies in Dashboard → Authentication → Policies
3. Test queries in SQL Editor before using in code
4. Refer to [Supabase Documentation](https://supabase.com/docs)
