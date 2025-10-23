"""
Profile Middleware - Verify user profiles exist before allowing access
Ensures database-auth synchronization
"""

from fastapi import HTTPException, Header
from typing import Optional, Dict, Any
from datetime import datetime

# Import these from your existing files
# from auth_service import auth_service
# from database_service import DatabaseService


async def verify_user_profile(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """
    Dependency to verify user's profile exists in database
    
    Use this as a dependency in all protected routes:
    
    Example:
    --------
    @app.get("/api/v1/dashboard/stats")
    async def get_stats(current_user: Dict = Depends(verify_user_profile)):
        # User profile is guaranteed to exist
        return {...}
    
    Args:
        authorization: Bearer token from Authorization header
        
    Returns:
        User dict with profile data attached
        
    Raises:
        401: Missing or invalid authorization header
        401: Invalid or expired token
        403: User profile has been deleted
        500: Database error
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
    
    # Import here to avoid circular imports
    from auth_service import auth_service
    from database_service import DatabaseService
    
    # Get user from token
    user = await auth_service.get_user(token)
    
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )
    
    # ✅ NEW: Check if teacher profile exists in database
    # Use the auth_service client directly to ensure we use the same instance
    try:
        # Query teacher_profiles table
        profile_response = auth_service.client.table('teacher_profiles').select(
            '*'
        ).eq('id', user.get('id')).execute()
        
        profile_data = profile_response.data
        
        if not profile_data or len(profile_data) == 0:
            # ❌ Profile was deleted or never existed
            raise HTTPException(
                status_code=403,
                detail="Your profile has been deleted or access denied. Please contact administrator."
            )
        
        # Attach profile data to user dict
        user['profile'] = profile_data[0]
        
        return user
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Log the error
        print(f"Profile verification error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Error verifying user profile"
        )


async def get_current_user_simple(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """
    Simple version: Only validate token, don't check profile
    Use for routes that don't need profile data
    
    Use this for:
    - Health check endpoints
    - Token refresh endpoints
    - Public endpoints that just need auth verification
    """
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Authorization header missing"
        )
    
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
    
    from auth_service import auth_service
    
    user = await auth_service.get_user(token)
    
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )
    
    return user


async def get_current_user_with_role_check(
    required_role: str,
    authorization: Optional[str] = Header(None)
) -> Dict[str, Any]:
    """
    Validate token AND check if user has required role
    
    Use this for admin-only endpoints
    
    Example:
    --------
    @app.delete("/api/v1/users/{user_id}")
    async def delete_user(
        user_id: str,
        current_user: Dict = Depends(lambda: get_current_user_with_role_check("admin"))
    ):
        # Only admins can access this
        return {...}
    """
    # First verify profile exists
    user = await verify_user_profile(authorization)
    
    # Check role
    user_role = user.get('role', 'teacher').lower()
    
    if user_role != required_role.lower():
        raise HTTPException(
            status_code=403,
            detail=f"This action requires {required_role} role. You have {user_role} role."
        )
    
    return user
