# Auth Service Fix - Summary

## Problem
The error "Could not find the table 'public.users'" occurred because:
- Your auth_service was trying to query a custom `users` table
- This table doesn't exist in your Supabase database
- Supabase uses its own built-in `auth.users` table for authentication

## Solution Implemented

Updated `auth_service.py` to:
1. ✅ Use Supabase's built-in authentication system
2. ✅ Query the `teacher_profiles` table for additional user info
3. ✅ Maintain proper database-auth synchronization

## Files Updated

- **`/backend/auth_service.py`** - Updated to use `teacher_profiles` table
- **`/backend/create_teacher_profiles_table.py`** - New script to set up the table
- **`/backend/SUPABASE_SETUP.md`** - Complete setup guide

## What You Need to Do

### 1. Create the `teacher_profiles` Table

Run this SQL in your Supabase SQL Editor:

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

CREATE INDEX IF NOT EXISTS idx_teacher_profiles_email ON teacher_profiles(email);
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_department ON teacher_profiles(department);

ALTER TABLE teacher_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY teacher_profiles_select_own ON teacher_profiles FOR SELECT 
    USING (auth.uid() = id OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY teacher_profiles_update_own ON teacher_profiles FOR UPDATE 
    USING (auth.uid() = id OR auth.jwt() ->> 'role' = 'admin');
```

### 2. Test the Setup

```bash
cd /Users/adityabarve/Desktop/BE_PROJECT/backend
python main_with_auth.py
```

Try registering and logging in via the API.

## Architecture

```
Supabase Cloud
├── auth.users (built-in)
│   └── Handles authentication (passwords, tokens, etc.)
│
└── teacher_profiles (custom table)
    └── Stores teacher info (full_name, email, department, etc.)
```

## How Auth Flow Works

1. **Register**: Create `auth.users` entry + `teacher_profiles` entry
2. **Login**: Verify credentials + Check profile exists
3. **Access**: Verify token + Fetch profile data

## Important Notes

- The `teacher_profiles` table has RLS enabled for security
- Teachers can only access their own profile
- Admins can access all profiles
- Passwords are never stored in `teacher_profiles`

For detailed information, see `/backend/SUPABASE_SETUP.md`
