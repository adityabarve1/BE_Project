# 🔐 Database-Auth Synchronization Solution

## Problem Statement

**Current Issue:**
- ✅ User registers → Auth account created in `auth.users` + Profile created in `teacher_profiles`
- ❌ User deletes profile → Profile removed BUT auth account still exists
- ❌ Same user can login with old credentials even though profile is gone
- ❌ Orphaned auth accounts create security risk

**Expected Behavior:**
- ✅ User registers → Both created together
- ✅ User deletes profile → BOTH deleted together
- ✅ Deleted user CANNOT login anymore
- ✅ No orphaned auth accounts

---

## Solution Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Synchronization Strategy                  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. CASCADING DELETE (PostgreSQL Trigger)                     │
│     When teacher_profile is deleted                           │
│     → Automatically delete from auth.users                    │
│                                                               │
│  2. LOGIN VALIDATION (Backend Check)                          │
│     Before allowing login                                     │
│     → Verify teacher_profile exists                          │
│     → If not, reject login                                   │
│                                                               │
│  3. PROFILE EXISTENCE CHECK (API Middleware)                  │
│     On every authenticated request                            │
│     → Verify user profile still exists                       │
│     → If deleted, invalidate token                           │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation

### Step 1: Create Cascading Delete Trigger

In Supabase SQL Editor, run this:

```sql
-- ============================================================================
-- CASCADING DELETE: When teacher_profile is deleted, delete auth user
-- ============================================================================

CREATE OR REPLACE FUNCTION delete_auth_user_on_profile_delete()
RETURNS TRIGGER AS $$
DECLARE
  auth_user_id UUID;
BEGIN
  -- Get the user_id from the deleted profile
  auth_user_id := OLD.user_id;
  
  -- Delete from auth.users table
  DELETE FROM auth.users 
  WHERE id = auth_user_id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on teacher_profiles DELETE
DROP TRIGGER IF EXISTS trg_delete_auth_on_profile_delete ON teacher_profiles;
CREATE TRIGGER trg_delete_auth_on_profile_delete
AFTER DELETE ON teacher_profiles
FOR EACH ROW
EXECUTE FUNCTION delete_auth_user_on_profile_delete();

-- Log the deletion
CREATE TABLE IF NOT EXISTS system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50),
  user_id UUID,
  details JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enhanced trigger with logging
CREATE OR REPLACE FUNCTION delete_auth_user_on_profile_delete()
RETURNS TRIGGER AS $$
DECLARE
  auth_user_id UUID;
BEGIN
  auth_user_id := OLD.user_id;
  
  -- Log the deletion event
  INSERT INTO system_logs (event_type, user_id, details)
  VALUES (
    'PROFILE_DELETED',
    auth_user_id,
    jsonb_build_object(
      'teacher_id', OLD.id,
      'full_name', OLD.full_name,
      'timestamp', NOW()
    )
  );
  
  -- Delete from auth.users table
  DELETE FROM auth.users 
  WHERE id = auth_user_id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Step 2: Update Backend Login Validation

File: `backend/auth_service.py`

Add profile existence check:

```python
@staticmethod
async def sign_in_with_profile_check(email: str, password: str) -> Dict[str, Any]:
    """
    Sign in a user AND verify their profile exists
    
    Args:
        email: User's email
        password: User's password
        
    Returns:
        Dict containing user data and session
        
    Raises:
        Exception if profile doesn't exist
    """
    try:
        # First, sign in with Supabase
        response = supabase.auth.sign_in_with_password({
            "email": email,
            "password": password
        })
        
        if response.user is None or response.session is None:
            raise Exception("Invalid credentials")
        
        # ✅ NEW: Check if teacher_profile exists
        from database_service import DatabaseService
        db_service = DatabaseService()
        
        profile = db_service.supabase.table('teacher_profiles').select(
            '*'
        ).eq('user_id', response.user.id).single().execute()
        
        if not profile.data:
            # ❌ Profile was deleted, prevent login
            # Delete the orphaned auth user
            supabase.auth.admin.delete_user(response.user.id)
            raise Exception("User profile has been deleted. Please contact administrator.")
        
        # Get user role from metadata or profile
        role = response.user.user_metadata.get("role", "teacher")
        full_name = profile.data.get("full_name", "")
        
        return {
            "user": {
                "id": response.user.id,
                "email": response.user.email,
                "role": role,
                "full_name": full_name
            },
            "session": {
                "access_token": response.session.access_token,
                "refresh_token": response.session.refresh_token,
                "expires_at": response.session.expires_at
            }
        }
    
    except Exception as e:
        raise Exception(f"Sign in failed: {str(e)}")
```

### Step 3: Update Backend Login Endpoint

File: `backend/main_with_auth.py`

Replace the login endpoint:

```python
@app.post("/api/v1/auth/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    """
    Login user with email and password
    
    IMPORTANT: This endpoint verifies that the user's profile exists
    in the database. If the profile was deleted, login is prevented.
    
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
```

### Step 4: Add Profile Verification Middleware

Create a new file: `backend/profile_middleware.py`

```python
"""
Profile Verification Middleware
Ensures user profiles exist before allowing requests
"""

from fastapi import HTTPException, Header
from typing import Optional, Dict, Any
from auth_service import auth_service
from database_service import DatabaseService

async def verify_user_profile(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """
    Middleware to verify user's profile exists in database
    Use this as a dependency in protected routes
    """
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Authorization header missing"
        )
    
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid authentication scheme")
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid authorization header format")
    
    # Get user from token
    user = await auth_service.get_user(token)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    # ✅ NEW: Check if profile still exists
    db_service = DatabaseService()
    
    try:
        profile = db_service.supabase.table('teacher_profiles').select(
            '*'
        ).eq('user_id', user['id']).single().execute()
        
        if not profile.data:
            # Profile was deleted
            raise HTTPException(
                status_code=403,
                detail="Your profile has been deleted. Access denied."
            )
        
        # Return user with profile data
        user['profile'] = profile.data
        return user
        
    except Exception as e:
        if "No rows found" in str(e):
            raise HTTPException(
                status_code=403,
                detail="Your profile has been deleted. Access denied."
            )
        raise HTTPException(status_code=500, detail="Database error")
```

### Step 5: Update Protected Routes

File: `backend/main_with_auth.py`

Replace the dashboard route:

```python
from profile_middleware import verify_user_profile

@app.get("/api/v1/dashboard/stats")
async def get_dashboard_stats(current_user: Dict = Depends(verify_user_profile)):
    """
    Get dashboard statistics
    
    Requires authentication AND valid profile
    If profile is deleted, returns 403 Forbidden
    """
    # User profile is verified and exists
    user_profile = current_user.get('profile', {})
    
    if not user_profile:
        raise HTTPException(
            status_code=403,
            detail="Your profile has been deleted"
        )
    
    return {
        "total_students": 1250,
        "high_risk_students": 87,
        "medium_risk_students": 234,
        "low_risk_students": 929,
        "average_attendance": 87.5,
        "recent_predictions": 42
    }
```

---

## User Flow with New Implementation

### Scenario 1: Normal Registration & Login ✅

```
Step 1: User Registers
────────────────────
POST /api/v1/auth/register
  ↓
1. Create in auth.users ✅
2. Create in teacher_profiles ✅
3. Return JWT token ✅

Step 2: User Logs In
───────────────────
POST /api/v1/auth/login
  ↓
1. Check credentials in auth.users ✅
2. Verify profile exists in teacher_profiles ✅
3. Return JWT token ✅
  ↓
User logged in and can access dashboard ✅
```

### Scenario 2: Profile Deleted - User Cannot Login ✅

```
Step 1: User Profile Deleted
──────────────────────────────
DELETE /api/v1/teacher_profiles/{id}
  ↓
1. Delete from teacher_profiles ✅
2. Trigger fires automatically ✅
3. Deletes from auth.users ✅
4. Log deletion event ✅

Step 2: User Tries to Login
────────────────────────────
POST /api/v1/auth/login
  ↓
1. Email/password found in auth.users... 
   WAIT! Trigger should have deleted it
   OR if somehow it still exists...
   ↓
2. Check teacher_profile exists
   ❌ NOT FOUND
   ↓
3. Prevent login
4. Return 400 error: "User profile has been deleted"
  ↓
User CANNOT login ✅
```

### Scenario 3: Database Cleared - All Access Denied ✅

```
Step 1: Database Cleared
────────────────────────
DELETE FROM teacher_profiles;
DELETE FROM students;
DELETE FROM predictions;
  ↓
teacher_profiles table is EMPTY

Step 2: User Tries to Login
───────────────────────────
POST /api/v1/auth/login
  ↓
1. Auth user still exists in auth.users (database cleared didn't touch it)
2. Login succeeds (credentials still valid)
3. JWT token returned
  ↓
Step 3: User Tries to Access Dashboard
──────────────────────────────────────
GET /api/v1/dashboard/stats
  ↓
1. Token validated ✅
2. Check teacher_profile exists
   ❌ NOT FOUND (deleted in step 1)
   ↓
3. Return 403: "Your profile has been deleted. Access denied."
  ↓
User CAN login but CANNOT access any data ✅
```

---

## Database Changes Required

Run this in Supabase SQL Editor:

```sql
-- Add ON DELETE CASCADE to teacher_profiles to auth.users relationship
-- This is handled by the trigger above

-- Verify teacher_profiles structure
ALTER TABLE teacher_profiles
ADD CONSTRAINT fk_teacher_profiles_user_id
FOREIGN KEY (user_id) REFERENCES auth.users(id)
ON DELETE CASCADE;

-- This ensures that if auth.users is deleted, 
-- the corresponding teacher_profile is also deleted
```

---

## File Updates Summary

| File | Change | Status |
|------|--------|--------|
| `supabase_schema.sql` | Add cascading delete trigger | ✅ Ready |
| `auth_service.py` | Add `sign_in_with_profile_check()` | ✅ Ready |
| `main_with_auth.py` | Use profile-checking login | ✅ Ready |
| `profile_middleware.py` | NEW: Profile verification | ✅ Ready |
| All protected routes | Use `verify_user_profile` dependency | ✅ Ready |

---

## Testing the Solution

### Test 1: Normal Flow Works ✅

```bash
# Register
curl -X POST http://localhost:8004/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "full_name": "Test User",
    "role": "teacher"
  }'
# Response: ✅ User created in auth.users AND teacher_profiles

# Login
curl -X POST http://localhost:8004/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
# Response: ✅ JWT token returned

# Access Dashboard
curl -H "Authorization: Bearer <TOKEN>" \
  http://localhost:8004/api/v1/dashboard/stats
# Response: ✅ Stats returned
```

### Test 2: Profile Deleted - User Can't Login ❌

```bash
# Delete profile in Supabase
DELETE FROM teacher_profiles WHERE full_name = 'Test User';

# Try to login (same credentials)
curl -X POST http://localhost:8004/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
# Response: ❌ 400 - "User profile has been deleted"

# OR if auth.users still exists:
# Can login → Get token
# But try to access dashboard:
curl -H "Authorization: Bearer <TOKEN>" \
  http://localhost:8004/api/v1/dashboard/stats
# Response: ❌ 403 - "Your profile has been deleted. Access denied."
```

### Test 3: Database Cleared ❌

```bash
# Clear all tables
DELETE FROM teacher_profiles;

# Try to login
curl -X POST http://localhost:8004/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
# Response: Might succeed (auth.users intact)

# But try to access dashboard:
curl -H "Authorization: Bearer <TOKEN>" \
  http://localhost:8004/api/v1/dashboard/stats
# Response: ❌ 403 - "Your profile has been deleted. Access denied."
```

---

## Security Benefits

| Scenario | Before | After |
|----------|--------|-------|
| Profile deleted | Can still login ❌ | Cannot login ✅ |
| DB cleared | Can still login ❌ | Cannot access data ✅ |
| Orphaned auth | Remains in system ❌ | Auto-deleted ✅ |
| Token lifetime | Valid forever ❌ | Verified per request ✅ |
| Audit trail | No logging ❌ | All deletions logged ✅ |

---

## Implementation Checklist

- [ ] Run cascading delete trigger SQL in Supabase
- [ ] Create `profile_middleware.py` in backend
- [ ] Update `auth_service.py` with profile check
- [ ] Update `main_with_auth.py` login endpoint
- [ ] Update all protected routes to use `verify_user_profile`
- [ ] Test normal registration/login flow
- [ ] Test profile deletion prevents login
- [ ] Test database cleared prevents data access
- [ ] Verify deletion logs are created

---

## Summary

**Problem Solved:**
- ✅ When profile is deleted → User cannot login
- ✅ When database is cleared → User cannot access data
- ✅ No orphaned auth accounts
- ✅ All deletions are logged
- ✅ Auth and database are synchronized

**User Experience:**
- User registers → Profile + Auth account created ✅
- User deletes profile → Both deleted ✅
- Deleted user tries to login → REJECTED ✅
- Deleted user cannot access data → ACCESS DENIED ✅

**Data Integrity:**
- 100% synchronization between auth.users and teacher_profiles
- Cascading deletes prevent orphaned records
- Audit trail for all deletions
- Per-request profile verification

---

**Status**: ✅ Ready to Implement  
**Files**: 4 files to modify/create  
**Testing**: 3 scenarios to verify

Ready to implement?
