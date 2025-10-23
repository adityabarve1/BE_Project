# 🔐 Implementing Database-Auth Synchronization

## 📋 Implementation Checklist

Follow these steps in order:

### Step 1: Create Database Triggers ✅

**File**: `database_sync_triggers.sql`

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy entire content from `database_sync_triggers.sql`
4. Paste into SQL Editor
5. Click "Run" button
6. Wait for completion ✅

```
Expected Output:
✅ Trigger created: trg_delete_auth_on_profile_delete
✅ Function created: delete_auth_user_on_profile_delete
✅ View created: orphaned_auth_users
✅ Indexes created
```

### Step 2: Update Backend - Profile Middleware

**File**: `backend/profile_middleware.py` (NEW FILE)

✅ Already created - Contains:
- `verify_user_profile()` - Main dependency
- `get_current_user_simple()` - Token-only check
- `get_current_user_with_role_check()` - Role-based access

### Step 3: Update Backend - Auth Service

**File**: `backend/auth_service.py`

✅ Already updated - Added:
- `sign_in_with_profile_check()` method

This method now:
1. Validates credentials
2. Checks if profile exists
3. Prevents login if profile deleted

### Step 4: Update Backend - Main Routes

**File**: `backend/main_with_auth.py`

✅ Already updated - Login endpoint now:
- Uses `sign_in_with_profile_check()` instead of `sign_in()`
- Prevents login if profile doesn't exist

### Step 5: Update Protected Routes (YOUR TASK)

**Files to Update**:
- `backend/main_with_auth.py`
- Any other route files

**Change From**:
```python
from auth_service import auth_service

@app.get("/api/v1/dashboard/stats")
async def get_dashboard_stats(current_user: Dict = Depends(get_current_user)):
    # current_user might be deleted
    ...
```

**Change To**:
```python
from profile_middleware import verify_user_profile

@app.get("/api/v1/dashboard/stats")
async def get_dashboard_stats(current_user: Dict = Depends(verify_user_profile)):
    # current_user is GUARANTEED to exist
    ...
```

---

## 🔧 Step-by-Step Implementation

### Phase 1: Database Setup (5 minutes)

```sql
-- Run in Supabase SQL Editor
-- File: database_sync_triggers.sql

-- This creates:
✅ Cascading delete trigger
✅ Foreign key constraint
✅ System logs table
✅ Orphaned account detection view
✅ Cleanup procedure
```

**Verify it worked:**
```sql
-- In SQL Editor, run:
SELECT * FROM orphaned_auth_users;
-- Should return: Empty result set (no orphaned users yet)
```

### Phase 2: Backend Updates (10 minutes)

Files already updated:
```
✅ backend/profile_middleware.py (NEW)
✅ backend/auth_service.py (MODIFIED - added sign_in_with_profile_check)
✅ backend/main_with_auth.py (MODIFIED - login endpoint updated)
```

**Next**: Update all protected routes in `main_with_auth.py`

### Phase 3: Testing (10 minutes)

See "Testing" section below

---

## 📝 How to Update Protected Routes

### Current Code (Before):
```python
@app.get("/api/v1/dashboard/stats")
async def get_dashboard_stats(current_user: Dict = Depends(get_current_user)):
    """Get dashboard statistics"""
    return {
        "total_students": 1250,
        ...
    }
```

### Updated Code (After):
```python
from profile_middleware import verify_user_profile

@app.get("/api/v1/dashboard/stats")
async def get_dashboard_stats(current_user: Dict = Depends(verify_user_profile)):
    """
    Get dashboard statistics
    
    NOTE: This endpoint now verifies user profile exists.
    If profile is deleted, returns 403 Forbidden.
    """
    # User profile is verified and exists ✅
    profile = current_user.get('profile', {})
    user_id = current_user.get('id')
    
    return {
        "total_students": 1250,
        ...
    }
```

### All Routes to Update:

Find all these patterns in `main_with_auth.py`:

```python
# Pattern 1: Current pattern
async def route_name(current_user: Dict = Depends(get_current_user)):

# Pattern 2: New pattern
async def route_name(current_user: Dict = Depends(verify_user_profile)):
```

**Routes to update:**
1. `/api/v1/dashboard/stats` ✅
2. `/api/v1/dashboard/high-risk-students` 
3. `/api/v1/dashboard/recent-predictions`
4. `/api/v1/students` (GET)
5. `/api/v1/students/{student_id}` (GET, PUT, DELETE)
6. Any other protected route

---

## 🧪 Testing the Implementation

### Test 1: Normal Registration & Login ✅

```bash
# Step 1: Register a new user
curl -X POST http://localhost:8004/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "full_name": "Test User",
    "role": "teacher"
  }'

# Expected Response:
{
  "user": {
    "id": "user-uuid-123",
    "email": "test@example.com",
    "role": "teacher",
    "full_name": "Test User"
  },
  "session": {
    "access_token": "jwt-token-here",
    "refresh_token": "refresh-token-here"
  }
}
```

✅ Result: Both auth.users and teacher_profiles created

### Test 2: Login Works ✅

```bash
# Step 2: Login with same credentials
curl -X POST http://localhost:8004/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!"
  }'

# Expected Response:
{
  "user": {...},
  "session": {...}
}
```

✅ Result: Login successful, JWT token returned

### Test 3: Access Protected Route ✅

```bash
# Step 3: Access dashboard with token
curl -H "Authorization: Bearer <JWT_TOKEN>" \
  http://localhost:8004/api/v1/dashboard/stats

# Expected Response:
{
  "total_students": 1250,
  ...
}
```

✅ Result: Dashboard accessible with token

### Test 4: Delete Profile - Cannot Login ❌

```bash
# Step 4: Delete the profile from Supabase
# Go to Supabase Dashboard
# SQL Editor → Run:
DELETE FROM teacher_profiles WHERE full_name = 'Test User';
```

**Verify it worked:**
```sql
-- Check what was deleted
SELECT * FROM system_logs 
WHERE event_type = 'PROFILE_DELETED' 
ORDER BY created_at DESC 
LIMIT 1;

-- Verify auth user is also deleted (CASCADE)
SELECT * FROM auth.users WHERE email = 'test@example.com';
-- Result: Should be empty!

-- Check orphaned accounts
SELECT * FROM orphaned_auth_users;
-- Result: Should be empty (no orphaned accounts)
```

```bash
# Step 5: Try to login with same credentials
curl -X POST http://localhost:8004/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!"
  }'

# Expected Response:
{
  "detail": "Invalid credentials"  ← Or "User profile has been deleted"
}
```

❌ Result: Login BLOCKED - User cannot login anymore! ✅

### Test 5: Database Cleared - No Data Access ❌

```bash
# Step 6: Clear database
# In Supabase SQL Editor:
DELETE FROM teacher_profiles;
DELETE FROM students;
DELETE FROM attendance;

# If somehow auth.users still exists:

# Step 7: Try to login
curl -X POST http://localhost:8004/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "TestPassword123!"}'

# Might get: "Invalid credentials" (because auth user was also deleted)
# OR if auth.users somehow still exists:
# Result: 400 - "User profile has been deleted"

# Step 8: Try to access dashboard (if somehow logged in)
curl -H "Authorization: Bearer <JWT_TOKEN>" \
  http://localhost:8004/api/v1/dashboard/stats

# Expected Response:
{
  "detail": "Your profile has been deleted. Access denied."
}
```

❌ Result: Cannot access any data! ✅

---

## ✅ Verification Checklist

After implementation, run these SQL commands to verify:

```sql
-- 1. Check profile-auth count matches
SELECT 'auth.users count' as label, COUNT(*) as count FROM auth.users
UNION ALL
SELECT 'teacher_profiles count' as label, COUNT(*) as count FROM teacher_profiles;
-- Should return same count!

-- 2. Check for orphaned accounts
SELECT * FROM orphaned_auth_users;
-- Should be empty!

-- 3. View recent profile operations
SELECT event_type, user_id, created_at FROM system_logs 
WHERE event_type IN ('PROFILE_CREATED', 'PROFILE_DELETED')
ORDER BY created_at DESC 
LIMIT 10;

-- 4. Test cascade delete
INSERT INTO teacher_profiles (user_id, full_name, department)
VALUES ('test-uuid-12345', 'Test Name', 'CS');

DELETE FROM teacher_profiles WHERE full_name = 'Test Name';

SELECT * FROM auth.users WHERE id = 'test-uuid-12345';
-- Should be empty! (Cascade delete worked)

-- 5. Check triggers are active
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE event_object_table = 'teacher_profiles';
-- Should show: trg_delete_auth_on_profile_delete
```

---

## 🚨 Troubleshooting

### Issue 1: Profile deleted but auth user still exists

**Problem**: Cascade delete not working

**Solution**:
```sql
-- Re-run the trigger setup
DROP TRIGGER IF EXISTS trg_delete_auth_on_profile_delete ON teacher_profiles;

-- Re-create it
CREATE TRIGGER trg_delete_auth_on_profile_delete
AFTER DELETE ON teacher_profiles
FOR EACH ROW
EXECUTE FUNCTION delete_auth_user_on_profile_delete();
```

### Issue 2: Can login even after profile deleted

**Problem**: Backend not checking profile

**Solution**:
1. Verify `auth_service.py` has `sign_in_with_profile_check()` method
2. Verify `main_with_auth.py` login endpoint uses it
3. Restart backend server
4. Try login again

### Issue 3: "Profile verification error" on dashboard

**Problem**: `verify_user_profile` dependency not found

**Solution**:
1. Ensure `profile_middleware.py` exists in `backend/` folder
2. Update route to import it:
   ```python
   from profile_middleware import verify_user_profile
   ```
3. Restart backend

### Issue 4: Database queries failing in middleware

**Problem**: DatabaseService import issues

**Solution**:
1. Ensure `database_service.py` exists
2. Check import path is correct
3. Verify Supabase credentials in environment

---

## 📊 Data Flow Summary

```
User Registration:
─────────────────
1. POST /register
2. auth_service.sign_up()
3. Create in auth.users ✅
4. Create in teacher_profiles ✅ (via trigger)
5. Return JWT token

User Login:
──────────
1. POST /login
2. auth_service.sign_in_with_profile_check()
3. Validate credentials ✅
4. Check teacher_profile exists ✅
5. If exists → Return JWT ✅
6. If not exists → Reject ❌

User Accesses Dashboard:
───────────────────────
1. GET /dashboard/stats + JWT
2. verify_user_profile middleware
3. Validate token ✅
4. Check teacher_profile exists ✅
5. If exists → Return data ✅
6. If not exists → Return 403 ❌

User Profile Deleted:
──────────────────────
1. DELETE /teacher_profiles/{id}
2. Trigger: delete_auth_user_on_profile_delete()
3. Log deletion to system_logs ✅
4. Delete from auth.users ✅ (CASCADE)
5. Both are now gone

User Tries to Login After Deletion:
────────────────────────────────────
1. POST /login (same credentials)
2. Credentials check fails (auth user deleted) ❌
3. Return 400 - "Invalid credentials" ❌
4. User CANNOT login anymore ✅
```

---

## 🎯 Summary

**Problem Solved**: ✅
- Profile deleted → Cannot login anymore
- Database cleared → Cannot access data
- Orphaned accounts → Automatically cleaned
- Security → Audit trail maintained

**Files Modified**: 
```
✅ backend/auth_service.py (added profile check)
✅ backend/main_with_auth.py (updated login)
✅ backend/profile_middleware.py (NEW - route protection)
✅ database_sync_triggers.sql (NEW - database level)
```

**Status**: Ready to implement

Ready to apply these changes to your backend?
