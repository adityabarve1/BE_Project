# Database Schema Diagram

## Entity Relationship Diagram (ERD)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         STUDENT DROPOUT PREDICTION                      │
│                            DATABASE SCHEMA                              │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│   auth.users     │ ← Supabase Authentication
│ (Supabase Auth)  │
└────────┬─────────┘
         │ 1:1
         ↓
┌──────────────────────────────────────────────────────┐
│            teacher_profiles                          │
├──────────────────────────────────────────────────────┤
│ • id (FK → auth.users.id)                           │
│ • full_name                                          │
│ • email                                              │
│ • department                                         │
│ • designation                                        │
└──────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────┐
│                    students ⭐                       │
├──────────────────────────────────────────────────────┤
│ • id (PK)                                           │
│ • roll_number (UNIQUE)                              │
│ • name                                              │
│ • email (UNIQUE)                                    │
│ • program                                           │
│ • semester                                          │
│ • current_gpa                                       │
│ • overall_gpa                                       │
│ • dropout_risk_level (low/medium/high)              │
│ • dropout_risk_score (0.0000 - 1.0000)             │
└────────┬─────────┬─────────┬─────────┬──────────┬───┘
         │         │         │         │          │
         │ 1:many  │ 1:many  │ 1:many  │ 1:many   │ 1:many
         ↓         ↓         ↓         ↓          ↓
    ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
    │attendance│ │academic │ │predictions│ │financial│ │extracur│
    │         │ │ records │ │         │ │ records │ │ ricul. │
    └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘
         ↓         ↓         ↓         ↓          ↓
         │         │         │         │          │
         │ 1:many  │ 1:many  │ 1:many  │ 1:many   │ 1:many
         ↓         ↓         ↓         ↓          ↓

┌──────────────────────────────────────────────────────┐
│               attendance                             │
├──────────────────────────────────────────────────────┤
│ • id (PK)                                           │
│ • student_id (FK → students.id)                     │
│ • date                                              │
│ • status (present/absent/late/excused)              │
│ • subject                                           │
│ • semester                                          │
│ • academic_year                                     │
│ UNIQUE (student_id, date, subject)                  │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│             academic_records                         │
├──────────────────────────────────────────────────────┤
│ • id (PK)                                           │
│ • student_id (FK → students.id)                     │
│ • semester                                          │
│ • academic_year                                     │
│ • subject_code                                      │
│ • subject_name                                      │
│ • credits                                           │
│ • grade (A+, A, B+, etc.)                          │
│ • grade_points (0.00 - 4.00)                       │
│ • status (ongoing/passed/failed)                    │
│ UNIQUE (student_id, semester, subject_code)         │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│               predictions                            │
├──────────────────────────────────────────────────────┤
│ • id (PK)                                           │
│ • student_id (FK → students.id)                     │
│ • prediction_date                                   │
│ • risk_level (low/medium/high)                      │
│ • risk_score (0.0000 - 1.0000)                     │
│ • confidence_score                                  │
│ • model_version                                     │
│ • features_used (JSONB)                             │
│ • prediction_factors (JSONB)                        │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│              interventions                           │
├──────────────────────────────────────────────────────┤
│ • id (PK)                                           │
│ • student_id (FK → students.id)                     │
│ • intervention_type                                 │
│ • description                                       │
│ • start_date                                        │
│ • end_date                                          │
│ • status (planned/ongoing/completed/cancelled)      │
│ • assigned_to (FK → auth.users.id)                  │
│ • created_by (FK → auth.users.id)                   │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│            financial_records                         │
├──────────────────────────────────────────────────────┤
│ • id (PK)                                           │
│ • student_id (FK → students.id)                     │
│ • semester                                          │
│ • academic_year                                     │
│ • total_fees                                        │
│ • amount_paid                                       │
│ • amount_pending                                    │
│ • scholarship_amount                                │
│ • payment_status (paid/pending/overdue/partial)     │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│        extracurricular_activities                    │
├──────────────────────────────────────────────────────┤
│ • id (PK)                                           │
│ • student_id (FK → students.id)                     │
│ • activity_name                                     │
│ • activity_type (sports/cultural/technical/social)  │
│ • role (participant/organizer/leader)               │
│ • hours_participated                                │
│ • achievements                                      │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│               system_logs                            │
├──────────────────────────────────────────────────────┤
│ • id (PK)                                           │
│ • user_id (FK → auth.users.id)                      │
│ • action                                            │
│ • resource_type (student/attendance/prediction)     │
│ • resource_id                                       │
│ • details (JSONB)                                   │
│ • ip_address                                        │
│ • created_at                                        │
└──────────────────────────────────────────────────────┘
```

---

## Analytics Views

```
┌──────────────────────────────────────────────────────┐
│          student_statistics (VIEW)                   │
├──────────────────────────────────────────────────────┤
│ • total_students                                    │
│ • active_students                                   │
│ • high_risk_students                                │
│ • medium_risk_students                              │
│ • low_risk_students                                 │
│ • average_gpa                                       │
│ • average_risk_score                                │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│      student_attendance_summary (VIEW)               │
├──────────────────────────────────────────────────────┤
│ • student_id                                        │
│ • semester                                          │
│ • academic_year                                     │
│ • total_classes                                     │
│ • classes_present                                   │
│ • classes_absent                                    │
│ • attendance_percentage                             │
└──────────────────────────────────────────────────────┘
```

---

## Key Relationships

### Primary Foreign Keys
- `students.created_by` → `auth.users.id`
- `attendance.student_id` → `students.id`
- `academic_records.student_id` → `students.id`
- `predictions.student_id` → `students.id`
- `interventions.student_id` → `students.id`
- `financial_records.student_id` → `students.id`
- `extracurricular_activities.student_id` → `students.id`
- `teacher_profiles.id` → `auth.users.id`
- `system_logs.user_id` → `auth.users.id`

### Cascading Deletes
When a student is deleted:
- ✅ All attendance records deleted
- ✅ All academic records deleted
- ✅ All predictions deleted
- ✅ All interventions deleted
- ✅ All financial records deleted
- ✅ All extracurricular activities deleted

---

## Indexes for Performance

### Students Table
- `idx_students_roll_number` on `roll_number`
- `idx_students_email` on `email`
- `idx_students_risk_level` on `dropout_risk_level`
- `idx_students_program` on `program`

### Attendance Table
- `idx_attendance_student_id` on `student_id`
- `idx_attendance_date` on `date`
- `idx_attendance_status` on `status`

### Academic Records Table
- `idx_academic_records_student_id` on `student_id`
- `idx_academic_records_semester` on `semester`

### Predictions Table
- `idx_predictions_student_id` on `student_id`
- `idx_predictions_date` on `prediction_date`
- `idx_predictions_risk_level` on `risk_level`

---

## Security (Row Level Security)

### Policies Applied
✅ **Students**: Authenticated users can view all, insert, update
✅ **Attendance**: Authenticated users full access
✅ **Academic Records**: Authenticated users full access
✅ **Predictions**: Authenticated users can view and insert
✅ **Interventions**: Authenticated users full access
✅ **Teacher Profiles**: Users can only view/edit their own
✅ **System Logs**: Read-only for authenticated users

---

## Triggers

### Auto-Update Timestamps
All tables with `updated_at` field have triggers:
- Automatically updates `updated_at` to current timestamp on any UPDATE

---

## Constraints & Validation

### GPA Validation
- `current_gpa` BETWEEN 0.00 AND 4.00
- `overall_gpa` BETWEEN 0.00 AND 4.00
- `grade_points` BETWEEN 0.00 AND 4.00

### Risk Score Validation
- `dropout_risk_score` BETWEEN 0.0000 AND 1.0000

### Enum Validations
- `dropout_risk_level`: 'low', 'medium', 'high'
- `attendance.status`: 'present', 'absent', 'late', 'excused'
- `academic_records.status`: 'ongoing', 'passed', 'failed', 'withdrawn'
- `payment_status`: 'paid', 'pending', 'overdue', 'partial'
- `intervention.status`: 'planned', 'ongoing', 'completed', 'cancelled'

---

## Data Flow

### Student Registration Flow
```
1. User creates student → students table
2. System creates profile → teacher_profiles table
3. Action logged → system_logs table
```

### Attendance Recording Flow
```
1. Mark attendance → attendance table
2. Calculate % → student_attendance_summary view
3. Action logged → system_logs table
```

### Prediction Flow
```
1. ML model runs → Creates prediction record
2. Save to predictions table
3. Update students.dropout_risk_level
4. Update students.dropout_risk_score
5. If high risk → Create intervention
```

### Intervention Flow
```
1. High-risk student detected
2. Create intervention record
3. Assign to teacher
4. Track status (planned → ongoing → completed)
5. Record outcome
```

---

## Query Examples

### Get Student Complete Profile
```sql
SELECT 
    s.*,
    (SELECT COUNT(*) FROM attendance WHERE student_id = s.id AND status = 'present') as total_present,
    (SELECT AVG(grade_points) FROM academic_records WHERE student_id = s.id) as avg_grade_points,
    (SELECT COUNT(*) FROM interventions WHERE student_id = s.id AND status = 'ongoing') as active_interventions
FROM students s
WHERE s.id = 'student-uuid';
```

### Get Risk Distribution by Program
```sql
SELECT 
    program,
    dropout_risk_level,
    COUNT(*) as count
FROM students
WHERE is_active = true
GROUP BY program, dropout_risk_level
ORDER BY program, dropout_risk_level;
```

### Get Students Needing Intervention
```sql
SELECT 
    s.roll_number,
    s.name,
    s.dropout_risk_score,
    a.attendance_percentage,
    f.amount_pending
FROM students s
LEFT JOIN student_attendance_summary a ON s.id = a.student_id
LEFT JOIN financial_records f ON s.id = f.student_id
WHERE s.dropout_risk_level = 'high'
    AND (a.attendance_percentage < 75 OR f.payment_status = 'overdue')
ORDER BY s.dropout_risk_score DESC;
```

---

This diagram shows the complete database structure with all relationships, constraints, and features!
