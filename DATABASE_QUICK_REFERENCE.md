# Supabase Database Quick Reference

## 🚀 Quick Start

### 1. Run Schema in Supabase
```sql
-- Go to https://app.supabase.com → SQL Editor
-- Copy content from supabase_schema.sql and run it
```

### 2. Verify Setup
```sql
-- Check all tables exist
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- View dashboard stats
SELECT * FROM student_statistics;
```

### 3. Test Connection
```bash
cd /Users/adityabarve/Desktop/BE_PROJECT
source backend/venv/bin/activate
python -c "from supabase import create_client; import os; from dotenv import load_dotenv; load_dotenv(); print('✅ Connected' if create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_KEY')) else '❌ Failed')"
```

---

## 📊 Database Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| **students** | Core student data | roll_number, name, email, gpa, dropout_risk_level |
| **attendance** | Daily attendance | student_id, date, status, subject |
| **academic_records** | Grades & courses | student_id, semester, grade, grade_points |
| **predictions** | ML predictions | student_id, risk_level, risk_score, features_used |
| **interventions** | Support actions | student_id, type, status, outcome |
| **financial_records** | Fee payments | student_id, amount_paid, payment_status |
| **extracurricular_activities** | Student activities | student_id, activity_name, hours |
| **teacher_profiles** | User profiles | full_name, department, designation |
| **system_logs** | Audit trail | user_id, action, resource_type |

---

## 🔧 Common Database Operations

### Using Python (DatabaseService)

```python
from database_service import DatabaseService
from supabase import create_client
import os

# Initialize
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
db = DatabaseService(supabase)

# Create student
await db.create_student({
    "roll_number": "CS2021001",
    "name": "John Doe",
    "email": "john@example.com",
    "program": "Computer Science",
    "semester": 5
})

# Get all students
students = await db.get_all_students()

# Record attendance
await db.record_attendance({
    "student_id": "uuid-here",
    "date": "2024-01-15",
    "status": "present",
    "subject": "Data Structures",
    "semester": 5,
    "academic_year": "2023-24"
})

# Save prediction
await db.save_prediction({
    "student_id": "uuid-here",
    "risk_level": "high",
    "risk_score": 0.8523,
    "confidence_score": 0.92,
    "model_version": "tabnet-v1.0"
})

# Get dashboard stats
stats = await db.get_dashboard_statistics()
```

### Using SQL Directly

```sql
-- Get all high-risk students
SELECT roll_number, name, dropout_risk_score
FROM students
WHERE dropout_risk_level = 'high' AND is_active = true
ORDER BY dropout_risk_score DESC;

-- Calculate attendance percentage
SELECT 
    s.name,
    COUNT(*) FILTER (WHERE a.status = 'present') * 100.0 / COUNT(*) as attendance_pct
FROM students s
JOIN attendance a ON s.id = a.student_id
WHERE a.semester = 5
GROUP BY s.id, s.name;

-- Recent predictions
SELECT 
    s.name,
    p.risk_level,
    p.risk_score,
    p.prediction_date
FROM predictions p
JOIN students s ON p.student_id = s.id
ORDER BY p.prediction_date DESC
LIMIT 10;

-- Students with pending fees
SELECT 
    s.name,
    f.amount_pending,
    f.payment_status
FROM students s
JOIN financial_records f ON s.id = f.student_id
WHERE f.payment_status IN ('pending', 'overdue')
ORDER BY f.amount_pending DESC;
```

---

## 🔐 Security (RLS Policies)

All tables have Row Level Security enabled:

- ✅ **Authenticated users** (teachers) can:
  - View all student data
  - Create/update attendance
  - Manage academic records
  - View and create predictions
  - Manage interventions

- ✅ **Teacher profiles**: Users can only view/edit their own profile
- ✅ **System logs**: Read-only for all authenticated users

---

## 📈 Analytics Views

### student_statistics
```sql
SELECT * FROM student_statistics;
-- Returns: total_students, active_students, high/medium/low risk counts, avg_gpa
```

### student_attendance_summary
```sql
SELECT * FROM student_attendance_summary WHERE student_id = 'uuid-here';
-- Returns: total_classes, classes_present, attendance_percentage
```

---

## 🛠️ Useful Functions

### Update Student Risk
```python
await db.update_student_risk("student-uuid", "high", 0.8523)
```

### Calculate Semester GPA
```python
gpa = await db.calculate_semester_gpa("student-uuid", semester=5)
```

### Get Attendance Percentage
```python
pct = await db.get_attendance_percentage("student-uuid", semester=5)
```

### Get High-Risk Students
```python
high_risk = await db.get_high_risk_students()
```

---

## 🔄 Data Import/Export

### Export Students to CSV
```sql
COPY (SELECT * FROM students) TO '/tmp/students.csv' WITH CSV HEADER;
```

### Bulk Insert from Python
```python
# Prepare batch data
students_batch = [
    {"roll_number": "CS2021001", "name": "Student 1", ...},
    {"roll_number": "CS2021002", "name": "Student 2", ...},
]

# Insert using Supabase
for student in students_batch:
    await db.create_student(student)
```

---

## 📝 Sample Data Queries

### Insert Test Student
```sql
INSERT INTO students (roll_number, name, email, program, admission_date, semester)
VALUES ('TEST001', 'Test Student', 'test@example.com', 'Computer Science', '2021-08-01', 5)
RETURNING *;
```

### Insert Attendance for Last 30 Days
```sql
INSERT INTO attendance (student_id, date, status, subject, semester, academic_year)
SELECT 
    (SELECT id FROM students WHERE roll_number = 'TEST001'),
    generate_series(CURRENT_DATE - 30, CURRENT_DATE, '1 day'::interval)::date,
    CASE WHEN random() > 0.2 THEN 'present' ELSE 'absent' END,
    'Data Structures',
    5,
    '2023-24';
```

### Generate Random Grades
```sql
INSERT INTO academic_records (student_id, semester, academic_year, subject_code, subject_name, credits, grade, grade_points)
VALUES 
    ((SELECT id FROM students WHERE roll_number = 'TEST001'), 4, '2022-23', 'CS401', 'Database Systems', 4, 'A', 4.00),
    ((SELECT id FROM students WHERE roll_number = 'TEST001'), 4, '2022-23', 'CS402', 'Operating Systems', 4, 'B+', 3.30);
```

---

## 🚨 Troubleshooting

### Clear All Data (⚠️ CAUTION)
```sql
TRUNCATE students CASCADE; -- Deletes all students and related data
```

### Reset Auto-Increment (if needed)
```sql
-- Not needed for UUID primary keys
```

### Check Table Sizes
```sql
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### View Active Connections
```sql
SELECT * FROM pg_stat_activity WHERE datname = current_database();
```

---

## 📚 Next Steps

1. ✅ Database schema created
2. **→ Run schema in Supabase SQL Editor**
3. **→ Update backend routes to use DatabaseService**
4. **→ Test API endpoints with real data**
5. **→ Connect frontend to backend**

---

## 🔗 Helpful Links

- [Supabase Dashboard](https://app.supabase.com)
- [Supabase SQL Editor](https://app.supabase.com/project/_/sql)
- [Full Setup Guide](./DATABASE_SETUP_GUIDE.md)
- [Database Service Docs](./backend/database_service.py)
