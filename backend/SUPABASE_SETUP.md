# Supabase Database Setup Guide

## Problem Summary

Your auth_service was failing because it was trying to query a `users` table that doesn't exist in your Supabase database. Supabase uses its own built-in `auth.users` table for authentication instead of a custom `users` table.

## Solution

The updated auth_service now:

1. **Uses Supabase's built-in authentication** (`auth.users` table)
2. **Creates and queries a `teacher_profiles` table** to store additional teacher information
3. **Properly synchronizes** between authentication and database

## Setup Steps

### Step 1: Create the `teacher_profiles` Table

You need to run SQL in Supabase to create the `teacher_profiles` table:

**Option A: Automatic (via script)**
```bash
python create_teacher_profiles_table.py
```

**Option B: Manual (recommended)**

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Open your project
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste this SQL:

```sql
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_email ON teacher_profiles(email);
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_department ON teacher_profiles(department);

-- Enable Row Level Security
ALTER TABLE teacher_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY teacher_profiles_select_own ON teacher_profiles FOR SELECT 
    USING (auth.uid() = id OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY teacher_profiles_update_own ON teacher_profiles FOR UPDATE 
    USING (auth.uid() = id OR auth.jwt() ->> 'role' = 'admin');
```

6. Click **Run**

### Step 2: Verify Setup

Test the auth service:

```bash
cd /Users/adityabarve/Desktop/BE_PROJECT/backend
python -c "from auth_service import auth_service; print('✓ auth_service imported successfully')"
```

### Step 3: Test Registration

1. Start the backend:
```bash
python main_with_auth.py
```

2. Register a new teacher via the API:
```bash
curl -X POST "http://localhost:8000/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher@example.com",
    "password": "SecurePassword123!",
    "full_name": "John Teacher",
    "role": "teacher"
  }'
```

3. Try logging in:
```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher@example.com",
    "password": "SecurePassword123!"
  }'
```

## How It Works

### User Registration Flow

1. FastAPI receives registration request
2. `auth_service.sign_up()`:
   - Creates user in Supabase's `auth.users` table (via `auth.sign_up()`)
   - Gets the new user's UUID
   - Creates corresponding record in `teacher_profiles` table
   - Returns user data and session token

### User Login Flow

1. FastAPI receives login request
2. `auth_service.sign_in_with_profile_check()`:
   - Authenticates with Supabase's `auth.sign_in_with_password()`
   - Gets the user's UUID
   - **Verifies** the user's profile exists in `teacher_profiles` table
   - Returns user data and session token
   - If profile doesn't exist, login fails

### Token Verification

1. Frontend sends API request with `Authorization: Bearer <token>`
2. `auth_service.get_user()`:
   - Verifies JWT token with Supabase
   - Fetches full profile from `teacher_profiles` table
   - Returns complete user information

## Database Schema

### auth.users (Supabase Built-in)
```
- id (UUID) - Primary key
- email (VARCHAR) - User's email
- encrypted_password (VARCHAR) - Hashed password
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- ... other Supabase fields
```

### teacher_profiles (Custom Table)
```
- id (UUID) - Foreign key to auth.users(id)
- full_name (VARCHAR) - Teacher's full name
- email (VARCHAR) - Email (unique)
- phone (VARCHAR) - Phone number
- department (VARCHAR) - Department/Faculty
- designation (VARCHAR) - Job title
- specialization (TEXT) - Area of expertise
- is_active (BOOLEAN) - Whether account is active
- created_at (TIMESTAMP) - Creation time
- updated_at (TIMESTAMP) - Last update time
```

## Troubleshooting

### Error: "Could not find the table 'public.teacher_profiles'"

**Solution:** Run the SQL creation script from Step 1.

### Error: "Teacher profile not found"

**Possible Causes:**
- User registered but profile wasn't created in `teacher_profiles`
- Database connection error during registration
- Deleted the profile manually

**Solution:** 
- Re-register the user
- Check Supabase logs for errors

### Error: "Invalid email or password"

**Possible Causes:**
- Wrong credentials provided
- User account doesn't exist in `auth.users`

**Solution:**
- Verify credentials
- Register new account if needed

## Architecture Diagram

```
┌─────────────────────────────────────────────┐
│         FastAPI Backend (main.py)           │
│  - /api/v1/auth/register                    │
│  - /api/v1/auth/login                       │
│  - /api/v1/auth/me                          │
└────────────┬────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────┐
│      auth_service.py (Authentication)       │
│  - sign_up()                                │
│  - sign_in_with_profile_check()             │
│  - get_user()                               │
│  - refresh_token()                          │
└────────┬──────────────────────────┬─────────┘
         │                          │
         ▼                          ▼
    ┌─────────────┐        ┌──────────────────┐
    │ auth.users  │        │ teacher_profiles │
    │ (Supabase)  │        │  (Custom Table)  │
    └─────────────┘        └──────────────────┘
```

## Security Notes

1. **Row Level Security (RLS)** is enabled on `teacher_profiles`
   - Teachers can only access their own profile
   - Admins can access all profiles

2. **Password Management**
   - Passwords are handled by Supabase
   - Never stored in `teacher_profiles`
   - Use Supabase's built-in password reset

3. **JWT Tokens**
   - Access tokens expire (default: 1 hour)
   - Refresh tokens used to get new access tokens
   - Validate tokens before each protected request

## Next Steps

1. ✅ Create `teacher_profiles` table
2. ✅ Test user registration and login
3. Add role-based access control (RBAC)
4. Implement frontend authentication UI
5. Add password reset functionality
6. Implement two-factor authentication (optional)

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [FastAPI Security Documentation](https://fastapi.tiangolo.com/tutorial/security/)
