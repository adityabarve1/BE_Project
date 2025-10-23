"""
Script to create the teacher_profiles table in Supabase if it doesn't exist
Run this once to set up the database schema
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

def create_teacher_profiles_table():
    """Create teacher_profiles table in Supabase"""
    
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    
    if not supabase_url or not supabase_key:
        raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in environment variables")
    
    client: Client = create_client(supabase_url, supabase_key)
    
    # SQL to create the teacher_profiles table
    sql = """
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
    """
    
    try:
        # Execute using the admin API
        response = client.postgrest.raw(method="POST", path="/rpc/create_tables", json={"sql": sql})
        print("✓ Table creation initiated")
        print(f"Response: {response}")
    except Exception as e:
        print(f"Note: RPC method might not exist. Error: {e}")
        print("\nInstead, run this SQL in your Supabase SQL Editor:")
        print("=" * 80)
        print(sql)
        print("=" * 80)
        print("\nSteps:")
        print("1. Go to https://app.supabase.com/")
        print("2. Open your project")
        print("3. Go to SQL Editor")
        print("4. Click 'New Query'")
        print("5. Paste the SQL above")
        print("6. Click 'Run'")

if __name__ == "__main__":
    create_teacher_profiles_table()
