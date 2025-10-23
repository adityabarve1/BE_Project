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
from auth_service import auth_service

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
    Get dashboard statistics
    
    Requires authentication
    """
    # TODO: Implement real statistics from database
    return {
        "total_students": 1250,
        "high_risk_students": 87,
        "medium_risk_students": 234,
        "low_risk_students": 929,
        "average_attendance": 87.5,
        "recent_predictions": 42
    }


@app.get("/api/v1/dashboard/high-risk-students")
async def get_high_risk_students(current_user: Dict = Depends(get_current_user)):
    """
    Get list of high-risk students
    
    Requires authentication
    """
    # TODO: Implement real data from database and ML predictions
    return [
        {
            "id": "1",
            "name": "John Doe",
            "roll_number": "CS2021001",
            "risk_level": "high",
            "risk_score": 0.85,
            "attendance": 65.0,
            "gpa": 2.1,
            "prediction_date": "2025-10-19"
        },
        {
            "id": "2",
            "name": "Jane Smith",
            "roll_number": "CS2021002",
            "risk_level": "high",
            "risk_score": 0.78,
            "attendance": 70.0,
            "gpa": 2.3,
            "prediction_date": "2025-10-19"
        },
        {
            "id": "3",
            "name": "Bob Johnson",
            "roll_number": "CS2021003",
            "risk_level": "high",
            "risk_score": 0.72,
            "attendance": 68.0,
            "gpa": 2.5,
            "prediction_date": "2025-10-18"
        }
    ]


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
    Get all students
    
    Requires authentication
    """
    # TODO: Implement real data from database
    return [
        {
            "id": "1",
            "name": "John Doe",
            "roll_number": "CS2021001",
            "email": "john.doe@example.com",
            "attendance": 65.0,
            "gpa": 2.1,
            "risk_level": "high"
        },
        {
            "id": "2",
            "name": "Jane Smith",
            "roll_number": "CS2021002",
            "email": "jane.smith@example.com",
            "attendance": 70.0,
            "gpa": 2.3,
            "risk_level": "high"
        }
    ]


@app.get("/api/v1/students/{student_id}")
async def get_student(student_id: str, current_user: Dict = Depends(get_current_user)):
    """
    Get student by ID
    
    Requires authentication
    """
    # TODO: Implement real data from database
    return {
        "id": student_id,
        "name": "John Doe",
        "roll_number": "CS2021001",
        "email": "john.doe@example.com",
        "attendance": 65.0,
        "gpa": 2.1,
        "risk_level": "high",
        "risk_score": 0.85,
        "prediction_history": [
            {"date": "2025-10-15", "risk_score": 0.82},
            {"date": "2025-10-19", "risk_score": 0.85}
        ]
    }


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
