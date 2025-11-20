"""
Student Dropout Prediction System - Backend with Supabase Auth
FastAPI backend with full Supabase authentication integration
"""

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import List, Dict, Any, Optional
from enum import Enum
import os
from datetime import datetime
from dotenv import load_dotenv
from auth_service import auth_service
from database_service import DatabaseService
from supabase import create_client, Client

# Load environment variables from .env file
load_dotenv()

# Initialize Supabase client and database service
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")  # Use service role for admin operations

if not supabase_url or not supabase_key:
    raise ValueError("Missing Supabase configuration. Please check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.")

supabase: Client = create_client(supabase_url, supabase_key)
db_service = DatabaseService(supabase)

app = FastAPI(
    title="Student Dropout Prediction System API",
    description="API for predicting student dropout risk using ML",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# Models
# ============================================================================

class UserRole(str, Enum):
    TEACHER = "teacher"
    ADMIN = "admin"


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: UserRole = UserRole.TEACHER


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    user: Dict[str, Any]
    session: Dict[str, Any]


class UserResponse(BaseModel):
    id: str
    email: str
    role: str
    full_name: Optional[str] = None


class MessageResponse(BaseModel):
    message: str


# ============================================================================
# Dependency: Get Current User
# ============================================================================

async def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """
    Dependency to get current user from Authorization header
    """
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Authorization header missing"
        )
    
    # Extract token from "Bearer <token>"
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication scheme"
            )
    except ValueError:
        raise HTTPException(
            status_code=401,
            detail="Invalid authorization header format"
        )
    
    # Get user from token
    user = await auth_service.get_user(token)
    
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )
    
    return user


# ============================================================================
# Public Routes
# ============================================================================

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Student Dropout Prediction System API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat()
    }


# ============================================================================
# Authentication Routes
# ============================================================================

@app.post("/api/v1/auth/register", response_model=AuthResponse)
async def register(request: RegisterRequest):
    """
    Register a new user
    
    Args:
        request: Registration data (email, password, full_name, role)
        
    Returns:
        User data and authentication session
    """
    try:
        result = await auth_service.sign_up(
            email=request.email,
            password=request.password,
            full_name=request.full_name,
            role=request.role
        )
        
        return {
            "user": result["user"],
            "session": result.get("session", {})
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )


@app.post("/api/v1/auth/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    """
    Login user with email and password
    
    IMPORTANT: This endpoint verifies that the user's profile exists
    in the database. If the profile was deleted, login is prevented.
    
    This ensures database-auth synchronization:
    - User registers → Profile created + Auth created
    - User deletes profile → CANNOT login anymore
    - User clears database → CANNOT access protected routes
    
    Args:
        request: Login credentials (email, password)
        
    Returns:
        User data and authentication session
        
    Raises:
        400: If credentials are invalid or profile doesn't exist
    """
    try:
        # Use the profile-checking version of sign_in
        result = await auth_service.sign_in_with_profile_check(
            email=request.email,
            password=request.password
        )
        
        return {
            "user": result["user"],
            "session": result.get("session", {})
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )


@app.post("/api/v1/auth/logout", response_model=MessageResponse)
async def logout(current_user: Dict = Depends(get_current_user)):
    """
    Logout current user
    
    Args:
        current_user: Current authenticated user (from dependency)
        
    Returns:
        Success message
    """
    try:
        # Note: Supabase handles logout on client side by clearing tokens
        # Server-side logout is handled by invalidating the session
        return {"message": "Logged out successfully"}
    
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )


@app.get("/api/v1/auth/me", response_model=UserResponse)
async def get_me(current_user: Dict = Depends(get_current_user)):
    """
    Get current user information
    
    Args:
        current_user: Current authenticated user (from dependency)
        
    Returns:
        Current user data
    """
    return UserResponse(**current_user)


# ============================================================================
# Protected Routes - Dashboard
# ============================================================================

@app.get("/api/v1/dashboard/stats")
async def get_dashboard_stats(current_user: Dict = Depends(get_current_user)):
    """
    Get dashboard statistics from database
    
    Requires authentication
    """
    try:
        # Get all students for statistics
        all_students = await db_service.get_all_students(active_only=True)
        
        total_students = len(all_students)
        
        # Count by risk levels
        high_risk = len([s for s in all_students if s.get("dropout_risk_level") == "high"])
        medium_risk = len([s for s in all_students if s.get("dropout_risk_level") == "medium"])
        low_risk = len([s for s in all_students if s.get("dropout_risk_level") == "low"])
        
        # Calculate average GPA
        gpas = [s.get("current_gpa", 0) for s in all_students if s.get("current_gpa")]
        average_gpa = sum(gpas) / len(gpas) if gpas else 0.0
        
        # Get recent predictions count (you might want to implement this in database service)
        recent_predictions = high_risk + medium_risk  # Simplified for now
        
        return {
            "total_students": total_students,
            "high_risk_students": high_risk,
            "medium_risk_students": medium_risk,
            "low_risk_students": low_risk,
            "average_gpa": round(average_gpa, 2),
            "recent_predictions": recent_predictions
        }
        
    except Exception as e:
        print(f"Error fetching dashboard stats: {e}")
        # Return default stats if there's an error
        return {
            "total_students": 0,
            "high_risk_students": 0,
            "medium_risk_students": 0,
            "low_risk_students": 0,
            "average_gpa": 0.0,
            "recent_predictions": 0
        }


@app.get("/api/v1/dashboard/high-risk-students")
async def get_high_risk_students(current_user: Dict = Depends(get_current_user)):
    """
    Get list of high-risk students from database
    
    Requires authentication
    """
    try:
        high_risk_students = await db_service.get_high_risk_students()
        
        formatted_students = []
        for student in high_risk_students:
            formatted_student = {
                "id": student.get("id"),
                "name": student.get("name"),
                "roll_number": student.get("roll_number"),
                "risk_level": student.get("dropout_risk_level", "high"),
                "risk_score": student.get("dropout_risk_score", 0.0),
                "gpa": student.get("current_gpa", 0.0),
                "program": student.get("program"),
                "semester": student.get("semester"),
                "prediction_date": student.get("updated_at", datetime.now().isoformat())
            }
            formatted_students.append(formatted_student)
            
        return formatted_students
        
    except Exception as e:
        print(f"Error fetching high-risk students: {e}")
        # Return empty list if there's an error, don't break the dashboard
        return []


@app.get("/api/v1/dashboard/recent-predictions")
async def get_recent_predictions(current_user: Dict = Depends(get_current_user)):
    """
    Get recent dropout predictions
    
    Requires authentication
    """
    # TODO: Implement real predictions from ML model
    return [
        {
            "id": "1",
            "student_name": "John Doe",
            "prediction_date": "2025-10-19",
            "risk_level": "high",
            "confidence": 0.85
        },
        {
            "id": "2",
            "student_name": "Jane Smith",
            "prediction_date": "2025-10-19",
            "risk_level": "high",
            "confidence": 0.78
        }
    ]


# ============================================================================
# Protected Routes - Students
# ============================================================================

@app.get("/api/v1/students")
async def get_students(current_user: Dict = Depends(get_current_user)):
    """
    Get all students from database
    
    Requires authentication
    """
    try:
        students = await db_service.get_all_students(active_only=True)
        
        # Transform database format to frontend format
        formatted_students = []
        for student in students:
            formatted_student = {
                "id": student.get("id"),
                "name": student.get("name"),
                "roll_number": student.get("roll_number"),
                "email": student.get("email"),
                "phone": student.get("phone"),
                "gender": student.get("gender"),
                "program": student.get("program"),
                "semester": student.get("semester"),
                "current_gpa": student.get("current_gpa", 0.0),
                "overall_gpa": student.get("overall_gpa", 0.0),
                "credits_completed": student.get("credits_completed", 0),
                "dropout_risk_level": student.get("dropout_risk_level", "low"),
                "dropout_risk_score": student.get("dropout_risk_score", 0.0),
                "is_active": student.get("is_active", True),
                "created_at": student.get("created_at"),
                "updated_at": student.get("updated_at"),
                # Legacy fields for frontend compatibility
                "gpa": student.get("current_gpa", 0.0),
                "risk_level": student.get("dropout_risk_level", "low"),
                "department": student.get("program", "Unknown")
            }
            formatted_students.append(formatted_student)
            
        return formatted_students
        
    except Exception as e:
        print(f"Error fetching students: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch students: {str(e)}"
        )


@app.get("/api/v1/students/{student_id}")
async def get_student(student_id: str, current_user: Dict = Depends(get_current_user)):
    """
    Get student by ID from database
    
    Requires authentication
    """
    try:
        student = await db_service.get_student_by_id(student_id)
        
        if not student:
            raise HTTPException(
                status_code=404,
                detail="Student not found"
            )
            
        # Get additional data
        predictions = await db_service.get_student_predictions(student_id, limit=10)
        
        formatted_student = {
            "id": student.get("id"),
            "name": student.get("name"),
            "roll_number": student.get("roll_number"),
            "email": student.get("email"),
            "phone": student.get("phone"),
            "gender": student.get("gender"),
            "date_of_birth": student.get("date_of_birth"),
            "address": student.get("address"),
            "program": student.get("program"),
            "semester": student.get("semester"),
            "admission_date": student.get("admission_date"),
            "current_gpa": student.get("current_gpa", 0.0),
            "overall_gpa": student.get("overall_gpa", 0.0),
            "credits_completed": student.get("credits_completed", 0),
            "dropout_risk_level": student.get("dropout_risk_level", "low"),
            "dropout_risk_score": student.get("dropout_risk_score", 0.0),
            "guardian_name": student.get("guardian_name"),
            "guardian_phone": student.get("guardian_phone"),
            "emergency_contact": student.get("emergency_contact"),
            "blood_group": student.get("blood_group"),
            "nationality": student.get("nationality"),
            "category": student.get("category"),
            "is_active": student.get("is_active", True),
            "created_at": student.get("created_at"),
            "updated_at": student.get("updated_at"),
            # Legacy fields for frontend compatibility
            "gpa": student.get("current_gpa", 0.0),
            "risk_level": student.get("dropout_risk_level", "low"),
            "risk_score": student.get("dropout_risk_score", 0.0),
            "prediction_history": predictions
        }
        
        return formatted_student
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching student {student_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch student: {str(e)}"
        )


@app.post("/api/v1/students")
async def create_student(student_data: dict, current_user: Dict = Depends(get_current_user)):
    """
    Create a new student in database
    
    Requires authentication
    """
    try:
        # Check if student with same roll number already exists
        existing_student = await db_service.get_student_by_roll_number(student_data.get("roll_number"))
        if existing_student:
            raise HTTPException(
                status_code=400,
                detail="Student with this roll number already exists"
            )
        
        # Create student record in database
        result = await db_service.create_student(student_data)
        
        if not result.get("success"):
            raise HTTPException(
                status_code=400,
                detail=result.get("error", "Failed to create student")
            )
            
        return {
            "success": True,
            "message": "Student created successfully",
            "data": result.get("data")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating student: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


# ============================================================================
# Run the application
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", "8004"))
    
    print(f"""
    ╔══════════════════════════════════════════════════════════════════╗
    ║  Student Dropout Prediction System API                          ║
    ╠══════════════════════════════════════════════════════════════════╣
    ║  🚀 Server running at: http://localhost:{port}                   ║
    ║  📚 API Documentation: http://localhost:{port}/docs              ║
    ║  🔒 Supabase Auth: Enabled                                      ║
    ╚══════════════════════════════════════════════════════════════════╝
    """)
    
    uvicorn.run(app, host="0.0.0.0", port=port)
