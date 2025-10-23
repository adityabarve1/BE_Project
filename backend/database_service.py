"""
Database Service for Student Dropout Prediction System
Handles all Supabase database operations
"""

from typing import List, Dict, Optional, Any
from datetime import datetime, date
from supabase import Client
import os
from dotenv import load_dotenv

load_dotenv()

class DatabaseService:
    def __init__(self, supabase_client: Client):
        self.db = supabase_client
    
    # ============================================================================
    # STUDENT OPERATIONS
    # ============================================================================
    
    async def create_student(self, student_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new student record"""
        try:
            response = self.db.table('students').insert(student_data).execute()
            return {"success": True, "data": response.data[0] if response.data else None}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def get_student_by_id(self, student_id: str) -> Optional[Dict[str, Any]]:
        """Get student by ID"""
        try:
            response = self.db.table('students').select("*").eq('id', student_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error fetching student: {e}")
            return None
    
    async def get_student_by_roll_number(self, roll_number: str) -> Optional[Dict[str, Any]]:
        """Get student by roll number"""
        try:
            response = self.db.table('students').select("*").eq('roll_number', roll_number).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error fetching student: {e}")
            return None
    
    async def get_all_students(self, active_only: bool = True) -> List[Dict[str, Any]]:
        """Get all students"""
        try:
            query = self.db.table('students').select("*")
            if active_only:
                query = query.eq('is_active', True)
            response = query.execute()
            return response.data
        except Exception as e:
            print(f"Error fetching students: {e}")
            return []
    
    async def update_student(self, student_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update student record"""
        try:
            response = self.db.table('students').update(update_data).eq('id', student_id).execute()
            return {"success": True, "data": response.data[0] if response.data else None}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def update_student_risk(self, student_id: str, risk_level: str, risk_score: float) -> Dict[str, Any]:
        """Update student dropout risk information"""
        try:
            update_data = {
                "dropout_risk_level": risk_level,
                "dropout_risk_score": risk_score,
                "last_prediction_date": datetime.now().isoformat()
            }
            return await self.update_student(student_id, update_data)
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def get_high_risk_students(self) -> List[Dict[str, Any]]:
        """Get all high-risk students"""
        try:
            response = self.db.table('students').select("*").eq('dropout_risk_level', 'high').eq('is_active', True).execute()
            return response.data
        except Exception as e:
            print(f"Error fetching high-risk students: {e}")
            return []
    
    # ============================================================================
    # ATTENDANCE OPERATIONS
    # ============================================================================
    
    async def record_attendance(self, attendance_data: Dict[str, Any]) -> Dict[str, Any]:
        """Record attendance for a student"""
        try:
            response = self.db.table('attendance').insert(attendance_data).execute()
            return {"success": True, "data": response.data[0] if response.data else None}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def get_student_attendance(self, student_id: str, semester: Optional[int] = None) -> List[Dict[str, Any]]:
        """Get attendance records for a student"""
        try:
            query = self.db.table('attendance').select("*").eq('student_id', student_id)
            if semester:
                query = query.eq('semester', semester)
            response = query.order('date', desc=True).execute()
            return response.data
        except Exception as e:
            print(f"Error fetching attendance: {e}")
            return []
    
    async def get_attendance_percentage(self, student_id: str, semester: int) -> float:
        """Calculate attendance percentage for a student in a semester"""
        try:
            response = self.db.table('student_attendance_summary')\
                .select("attendance_percentage")\
                .eq('student_id', student_id)\
                .eq('semester', semester)\
                .execute()
            
            if response.data:
                return float(response.data[0]['attendance_percentage'])
            return 0.0
        except Exception as e:
            print(f"Error calculating attendance: {e}")
            return 0.0
    
    # ============================================================================
    # ACADEMIC RECORDS OPERATIONS
    # ============================================================================
    
    async def add_academic_record(self, record_data: Dict[str, Any]) -> Dict[str, Any]:
        """Add an academic record for a student"""
        try:
            response = self.db.table('academic_records').insert(record_data).execute()
            return {"success": True, "data": response.data[0] if response.data else None}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def get_student_academic_records(self, student_id: str) -> List[Dict[str, Any]]:
        """Get all academic records for a student"""
        try:
            response = self.db.table('academic_records')\
                .select("*")\
                .eq('student_id', student_id)\
                .order('semester', desc=True)\
                .execute()
            return response.data
        except Exception as e:
            print(f"Error fetching academic records: {e}")
            return []
    
    async def calculate_semester_gpa(self, student_id: str, semester: int) -> float:
        """Calculate GPA for a specific semester"""
        try:
            records = await self.get_student_academic_records(student_id)
            semester_records = [r for r in records if r['semester'] == semester and r['grade_points'] is not None]
            
            if not semester_records:
                return 0.0
            
            total_credits = sum(r['credits'] for r in semester_records)
            total_grade_points = sum(r['grade_points'] * r['credits'] for r in semester_records)
            
            return round(total_grade_points / total_credits, 2) if total_credits > 0 else 0.0
        except Exception as e:
            print(f"Error calculating GPA: {e}")
            return 0.0
    
    # ============================================================================
    # PREDICTION OPERATIONS
    # ============================================================================
    
    async def save_prediction(self, prediction_data: Dict[str, Any]) -> Dict[str, Any]:
        """Save a dropout prediction"""
        try:
            response = self.db.table('predictions').insert(prediction_data).execute()
            
            # Also update student's risk information
            if response.data:
                await self.update_student_risk(
                    prediction_data['student_id'],
                    prediction_data['risk_level'],
                    prediction_data['risk_score']
                )
            
            return {"success": True, "data": response.data[0] if response.data else None}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def get_student_predictions(self, student_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Get prediction history for a student"""
        try:
            response = self.db.table('predictions')\
                .select("*")\
                .eq('student_id', student_id)\
                .order('prediction_date', desc=True)\
                .limit(limit)\
                .execute()
            return response.data
        except Exception as e:
            print(f"Error fetching predictions: {e}")
            return []
    
    async def get_latest_prediction(self, student_id: str) -> Optional[Dict[str, Any]]:
        """Get the most recent prediction for a student"""
        try:
            response = self.db.table('predictions')\
                .select("*")\
                .eq('student_id', student_id)\
                .order('prediction_date', desc=True)\
                .limit(1)\
                .execute()
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error fetching latest prediction: {e}")
            return None
    
    # ============================================================================
    # INTERVENTION OPERATIONS
    # ============================================================================
    
    async def create_intervention(self, intervention_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create an intervention for a student"""
        try:
            response = self.db.table('interventions').insert(intervention_data).execute()
            return {"success": True, "data": response.data[0] if response.data else None}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def get_student_interventions(self, student_id: str) -> List[Dict[str, Any]]:
        """Get all interventions for a student"""
        try:
            response = self.db.table('interventions')\
                .select("*")\
                .eq('student_id', student_id)\
                .order('created_at', desc=True)\
                .execute()
            return response.data
        except Exception as e:
            print(f"Error fetching interventions: {e}")
            return []
    
    async def update_intervention(self, intervention_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update an intervention"""
        try:
            response = self.db.table('interventions').update(update_data).eq('id', intervention_id).execute()
            return {"success": True, "data": response.data[0] if response.data else None}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    # ============================================================================
    # FINANCIAL OPERATIONS
    # ============================================================================
    
    async def add_financial_record(self, financial_data: Dict[str, Any]) -> Dict[str, Any]:
        """Add a financial record for a student"""
        try:
            response = self.db.table('financial_records').insert(financial_data).execute()
            return {"success": True, "data": response.data[0] if response.data else None}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def get_student_financial_records(self, student_id: str) -> List[Dict[str, Any]]:
        """Get financial records for a student"""
        try:
            response = self.db.table('financial_records')\
                .select("*")\
                .eq('student_id', student_id)\
                .order('semester', desc=True)\
                .execute()
            return response.data
        except Exception as e:
            print(f"Error fetching financial records: {e}")
            return []
    
    # ============================================================================
    # STATISTICS & ANALYTICS
    # ============================================================================
    
    async def get_dashboard_statistics(self) -> Dict[str, Any]:
        """Get statistics for dashboard"""
        try:
            # Get student statistics
            stats_response = self.db.table('student_statistics').select("*").execute()
            stats = stats_response.data[0] if stats_response.data else {}
            
            # Get recent predictions
            recent_predictions = self.db.table('predictions')\
                .select("*")\
                .order('prediction_date', desc=True)\
                .limit(5)\
                .execute()
            
            # Get active interventions count
            interventions = self.db.table('interventions')\
                .select("id", count='exact')\
                .in_('status', ['planned', 'ongoing'])\
                .execute()
            
            return {
                "success": True,
                "data": {
                    "total_students": stats.get('total_students', 0),
                    "active_students": stats.get('active_students', 0),
                    "high_risk_students": stats.get('high_risk_students', 0),
                    "medium_risk_students": stats.get('medium_risk_students', 0),
                    "low_risk_students": stats.get('low_risk_students', 0),
                    "average_gpa": float(stats.get('average_gpa', 0.0)),
                    "average_risk_score": float(stats.get('average_risk_score', 0.0)),
                    "recent_predictions": recent_predictions.data,
                    "active_interventions": interventions.count if hasattr(interventions, 'count') else 0
                }
            }
        except Exception as e:
            print(f"Error fetching dashboard statistics: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_risk_distribution(self) -> Dict[str, int]:
        """Get distribution of students by risk level"""
        try:
            response = self.db.table('students')\
                .select("dropout_risk_level")\
                .eq('is_active', True)\
                .execute()
            
            distribution = {"low": 0, "medium": 0, "high": 0}
            for student in response.data:
                risk_level = student.get('dropout_risk_level', 'low')
                distribution[risk_level] = distribution.get(risk_level, 0) + 1
            
            return distribution
        except Exception as e:
            print(f"Error fetching risk distribution: {e}")
            return {"low": 0, "medium": 0, "high": 0}
    
    # ============================================================================
    # TEACHER PROFILE OPERATIONS
    # ============================================================================
    
    async def create_or_update_teacher_profile(self, user_id: str, profile_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create or update teacher profile"""
        try:
            # Try to insert, if exists, update
            profile_data['id'] = user_id
            response = self.db.table('teacher_profiles').upsert(profile_data).execute()
            return {"success": True, "data": response.data[0] if response.data else None}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def get_teacher_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get teacher profile"""
        try:
            response = self.db.table('teacher_profiles').select("*").eq('id', user_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error fetching teacher profile: {e}")
            return None
    
    # ============================================================================
    # SYSTEM LOGGING
    # ============================================================================
    
    async def log_action(self, log_data: Dict[str, Any]) -> None:
        """Log a system action"""
        try:
            self.db.table('system_logs').insert(log_data).execute()
        except Exception as e:
            print(f"Error logging action: {e}")
