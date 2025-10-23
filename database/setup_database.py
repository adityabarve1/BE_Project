#!/usr/bin/env python3
"""
Database setup script for Student Dropout Prediction System

This script:
1. Connects to Supabase
2. Creates necessary tables and triggers
3. Seeds initial data

Usage:
    python setup_database.py
"""

import os
from dotenv import load_dotenv
import requests
from supabase import create_client, Client
import pandas as pd
import json
import time
from pprint import pprint

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing Supabase credentials in .env file")

def create_tables(supabase: Client):
    """Create necessary tables in Supabase"""
    print("Creating tables in Supabase...")
    
    # Using the REST API with the supabase-py client for raw SQL execution
    # This is because supabase-py doesn't have direct SQL execution methods
    
    # Define the SQL queries for each table
    queries = [
        """
        -- Users table
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            email TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
            department TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        """,
        
        """
        -- Students table
        CREATE TABLE IF NOT EXISTS students (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            student_id TEXT UNIQUE NOT NULL,
            batch TEXT NOT NULL,
            program TEXT NOT NULL,
            enrollment_year INTEGER NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        """,
        
        """
        -- Attendance table
        CREATE TABLE IF NOT EXISTS attendance (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            student_id UUID REFERENCES students(id) ON DELETE CASCADE,
            date DATE NOT NULL,
            subject TEXT NOT NULL,
            status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late')),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE (student_id, date, subject)
        );
        """,
        
        """
        -- Academic records table
        CREATE TABLE IF NOT EXISTS academic_records (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            student_id UUID REFERENCES students(id) ON DELETE CASCADE,
            semester INTEGER NOT NULL,
            subject TEXT NOT NULL,
            marks NUMERIC NOT NULL,
            max_marks NUMERIC NOT NULL,
            grade TEXT,
            exam_type TEXT NOT NULL,
            exam_date DATE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE (student_id, semester, subject, exam_type)
        );
        """,
        
        """
        -- Student profile table
        CREATE TABLE IF NOT EXISTS student_profiles (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            student_id UUID REFERENCES students(id) ON DELETE CASCADE,
            age INTEGER,
            gender TEXT,
            family_income INTEGER,
            parent_education INTEGER,
            study_hours_per_week NUMERIC,
            extracurricular_activities INTEGER,
            previous_failures INTEGER,
            health_status INTEGER,
            transport_time INTEGER,
            internet_access BOOLEAN,
            family_support INTEGER,
            romantic_relationship BOOLEAN,
            free_time INTEGER,
            social_activities INTEGER,
            alcohol_consumption INTEGER,
            stress_level INTEGER,
            motivation_level INTEGER,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE (student_id)
        );
        """,
        
        """
        -- Risk predictions table
        CREATE TABLE IF NOT EXISTS risk_predictions (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            student_id UUID REFERENCES students(id) ON DELETE CASCADE,
            prediction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            risk_level INTEGER NOT NULL CHECK (risk_level IN (0, 1, 2)), -- 0: low, 1: medium, 2: high
            confidence NUMERIC,
            features JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        """,
        
        """
        -- Documents table
        CREATE TABLE IF NOT EXISTS documents (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            uploaded_by UUID REFERENCES users(id) ON DELETE CASCADE,
            status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'error')),
            rows_processed INTEGER DEFAULT 0,
            error_message TEXT,
            file_path TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        """
    ]
    
    # Execute each query
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }
    
    for query in queries:
        try:
            response = requests.post(
                f"{SUPABASE_URL}/rest/v1/rpc/execute",
                headers=headers,
                json={"query": query}
            )
            if response.status_code != 200:
                print(f"Error executing query: {response.status_code}")
                print(response.text)
            else:
                print("Query executed successfully")
        except Exception as e:
            print(f"Error executing query: {e}")
    
    print("Tables created successfully")

def seed_initial_data(supabase: Client):
    """Seed initial data into Supabase tables"""
    print("Seeding initial data...")
    
    # Create admin user
    admin_user = {
        "email": "admin@example.com",
        "name": "Admin User",
        "role": "admin"
    }
    
    # Create teacher user
    teacher_user = {
        "email": "teacher@example.com",
        "name": "Teacher User",
        "role": "teacher",
        "department": "Computer Science"
    }
    
    # Insert users
    try:
        supabase.table("users").insert([admin_user, teacher_user]).execute()
        print("Users seeded successfully")
    except Exception as e:
        print(f"Error seeding users: {e}")
    
    # Create some student users
    student_users = [
        {"email": f"student{i}@example.com", "name": f"Student {i}", "role": "student"}
        for i in range(1, 6)
    ]
    
    # Insert student users
    try:
        student_users_result = supabase.table("users").insert(student_users).execute()
        student_user_ids = [record['id'] for record in student_users_result.data]
        print("Student users seeded successfully")
    except Exception as e:
        print(f"Error seeding student users: {e}")
        return
    
    # Create student records
    student_records = [
        {
            "user_id": student_user_ids[i],
            "student_id": f"2025CS{10001+i}",
            "batch": "2025",
            "program": "Computer Science",
            "enrollment_year": 2021
        }
        for i in range(len(student_user_ids))
    ]
    
    # Insert student records
    try:
        student_records_result = supabase.table("students").insert(student_records).execute()
        student_ids = [record['id'] for record in student_records_result.data]
        print("Student records seeded successfully")
    except Exception as e:
        print(f"Error seeding student records: {e}")
        return
    
    # Create some student profiles
    student_profiles = [
        {
            "student_id": student_ids[i],
            "age": 20 + i % 3,
            "gender": "male" if i % 2 == 0 else "female",
            "family_income": 3 + i % 3,  # Scale 1-5
            "parent_education": 2 + i % 3,  # Scale 1-4
            "study_hours_per_week": 15 + i * 3,
            "extracurricular_activities": i % 4,
            "previous_failures": i % 3,
            "health_status": 4 - i % 3,  # Scale 1-5
            "transport_time": 15 + i * 10,
            "internet_access": True,
            "family_support": 3 + i % 3,  # Scale 1-5
            "romantic_relationship": i % 2 == 0,
            "free_time": 2 + i % 4,  # Scale 1-5
            "social_activities": 3 + i % 3,  # Scale 1-5
            "alcohol_consumption": 1 + i % 3,  # Scale 1-5
            "stress_level": 3 + i % 3,  # Scale 1-5
            "motivation_level": 5 - i % 3  # Scale 1-5
        }
        for i in range(len(student_ids))
    ]
    
    # Insert student profiles
    try:
        supabase.table("student_profiles").insert(student_profiles).execute()
        print("Student profiles seeded successfully")
    except Exception as e:
        print(f"Error seeding student profiles: {e}")
    
    # Create some attendance records
    subjects = ["Data Structures", "Algorithms", "Database Systems", "Computer Networks", "Operating Systems"]
    attendance_records = []
    
    for i, student_id in enumerate(student_ids):
        for day in range(1, 30):  # For one month
            for subject in subjects:
                # Simulate some absences
                status = "absent" if (i + day) % 10 == 0 else "present"
                
                attendance_records.append({
                    "student_id": student_id,
                    "date": f"2023-09-{day:02d}",
                    "subject": subject,
                    "status": status
                })
    
    # Insert attendance records in batches to avoid request size limits
    batch_size = 100
    for i in range(0, len(attendance_records), batch_size):
        batch = attendance_records[i:i+batch_size]
        try:
            supabase.table("attendance").insert(batch).execute()
        except Exception as e:
            print(f"Error seeding attendance batch {i//batch_size}: {e}")
    
    print("Attendance records seeded successfully")
    
    # Create some academic records
    academic_records = []
    
    for i, student_id in enumerate(student_ids):
        for semester in range(1, 3):  # Two semesters
            for subject in subjects:
                # Midterm exam
                marks = 70 + i * 2 + semester * 3
                if marks > 100:
                    marks = 95
                
                academic_records.append({
                    "student_id": student_id,
                    "semester": semester,
                    "subject": subject,
                    "marks": marks,
                    "max_marks": 100,
                    "grade": "A" if marks >= 90 else "B" if marks >= 80 else "C" if marks >= 70 else "D",
                    "exam_type": "midterm",
                    "exam_date": f"2023-0{semester}-15"
                })
                
                # Final exam
                marks = 75 + i * 2 + semester * 2
                if marks > 100:
                    marks = 98
                
                academic_records.append({
                    "student_id": student_id,
                    "semester": semester,
                    "subject": subject,
                    "marks": marks,
                    "max_marks": 100,
                    "grade": "A" if marks >= 90 else "B" if marks >= 80 else "C" if marks >= 70 else "D",
                    "exam_type": "final",
                    "exam_date": f"2023-0{semester+2}-30"
                })
    
    # Insert academic records in batches
    batch_size = 100
    for i in range(0, len(academic_records), batch_size):
        batch = academic_records[i:i+batch_size]
        try:
            supabase.table("academic_records").insert(batch).execute()
        except Exception as e:
            print(f"Error seeding academic records batch {i//batch_size}: {e}")
    
    print("Academic records seeded successfully")

def main():
    # Initialize the Supabase client
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Create the tables
    create_tables(supabase)
    
    # Seed initial data
    seed_initial_data(supabase)
    
    print("Database setup completed successfully!")

if __name__ == "__main__":
    main()