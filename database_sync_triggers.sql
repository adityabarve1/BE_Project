-- ============================================================================
-- DATABASE-AUTH SYNCHRONIZATION TRIGGERS
-- ============================================================================
-- These triggers ensure that when a teacher_profile is deleted,
-- the corresponding auth.users entry is also deleted
-- This prevents orphaned auth accounts and security issues
-- ============================================================================

-- ============================================================================
-- 1. CASCADING DELETE TRIGGER
-- ============================================================================
-- When a teacher_profile is deleted, automatically delete the auth user
-- ============================================================================

CREATE OR REPLACE FUNCTION delete_auth_user_on_profile_delete()
RETURNS TRIGGER AS $$
DECLARE
  auth_user_id UUID;
BEGIN
  -- Get the user_id from the deleted profile (id = user_id in teacher_profiles)
  auth_user_id := OLD.id;
  
  -- Log the deletion event
  INSERT INTO system_logs (action, user_id, resource_type, resource_id, details)
  VALUES (
    'PROFILE_DELETED',
    auth_user_id,
    'teacher_profile',
    OLD.id,
    jsonb_build_object(
      'profile_id', OLD.id,
      'full_name', OLD.full_name,
      'department', OLD.department,
      'deleted_at', NOW(),
      'reason', 'Profile manually deleted'
    )
  );
  
  -- Delete from auth.users table (CASCADE)
  DELETE FROM auth.users 
  WHERE id = auth_user_id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trg_delete_auth_on_profile_delete ON teacher_profiles;

-- Create trigger that fires AFTER DELETE on teacher_profiles
CREATE TRIGGER trg_delete_auth_on_profile_delete
AFTER DELETE ON teacher_profiles
FOR EACH ROW
EXECUTE FUNCTION delete_auth_user_on_profile_delete();

-- ============================================================================
-- 2. BULK DELETE HANDLING
-- ============================================================================
-- Handle cases where teacher_profiles are deleted in bulk
-- ============================================================================

CREATE OR REPLACE FUNCTION log_bulk_profile_deletions()
RETURNS TRIGGER AS $$
BEGIN
  -- This is called for each row deletion
  INSERT INTO system_logs (action, user_id, resource_type, resource_id, details)
  VALUES (
    'PROFILE_DELETED',
    OLD.id,
    'teacher_profile',
    OLD.id,
    jsonb_build_object(
      'profile_id', OLD.id,
      'full_name', OLD.full_name,
      'deleted_at', NOW(),
      'trigger', 'bulk_delete'
    )
  );
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. FOREIGN KEY CONSTRAINT
-- ============================================================================
-- Note: teacher_profiles already has ON DELETE CASCADE in schema
-- The id column in teacher_profiles references auth.users(id)
-- No additional constraint needed - cascading delete is automatic
-- ============================================================================

-- Verify the constraint exists
-- SELECT constraint_name FROM information_schema.table_constraints 
-- WHERE table_name = 'teacher_profiles' AND constraint_type = 'PRIMARY KEY';

-- ============================================================================
-- 4. ORPHANED ACCOUNT DETECTION
-- ============================================================================
-- View to find auth users without corresponding profiles
-- ============================================================================

CREATE OR REPLACE VIEW orphaned_auth_users AS
SELECT 
  au.id,
  au.email,
  au.created_at,
  au.updated_at,
  'NO_PROFILE' as issue
FROM auth.users au
LEFT JOIN teacher_profiles tp ON au.id = tp.id
WHERE tp.id IS NULL;

-- ============================================================================
-- 5. CLEANUP PROCEDURE
-- ============================================================================
-- Procedure to clean up any orphaned accounts
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_orphaned_auth_users()
RETURNS TABLE(deleted_count INT, details TEXT) AS $$
DECLARE
  v_count INT;
  v_deleted_ids UUID[];
BEGIN
  -- Find orphaned auth users (those without a teacher_profile)
  SELECT ARRAY_AGG(au.id)
  INTO v_deleted_ids
  FROM auth.users au
  LEFT JOIN teacher_profiles tp ON au.id = tp.id
  WHERE tp.id IS NULL;
  
  v_count := COALESCE(ARRAY_LENGTH(v_deleted_ids, 1), 0);
  
  -- Log the cleanup
  INSERT INTO system_logs (action, resource_type, details)
  VALUES (
    'CLEANUP_ORPHANED_USERS',
    'system',
    jsonb_build_object(
      'count', v_count,
      'deleted_ids', v_deleted_ids,
      'timestamp', NOW()
    )
  );
  
  -- Delete orphaned users (if any)
  IF v_count > 0 THEN
    DELETE FROM auth.users
    WHERE id = ANY(v_deleted_ids);
  END IF;
  
  RETURN QUERY SELECT v_count, 'Orphaned auth users cleaned up: ' || v_count::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. AUDIT LOG FOR PROFILE CHANGES
-- ============================================================================
-- Log all profile modifications for security and compliance
-- ============================================================================

CREATE OR REPLACE FUNCTION audit_profile_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO system_logs (action, user_id, resource_type, resource_id, details)
    VALUES (
      'PROFILE_DELETED',
      OLD.id,
      'teacher_profile',
      OLD.id,
      jsonb_build_object(
        'old_data', row_to_json(OLD),
        'deleted_at', NOW()
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO system_logs (action, user_id, resource_type, resource_id, details)
    VALUES (
      'PROFILE_UPDATED',
      NEW.id,
      'teacher_profile',
      NEW.id,
      jsonb_build_object(
        'old_data', row_to_json(OLD),
        'new_data', row_to_json(NEW),
        'updated_at', NOW()
      )
    );
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO system_logs (action, user_id, resource_type, resource_id, details)
    VALUES (
      'PROFILE_CREATED',
      NEW.id,
      'teacher_profile',
      NEW.id,
      jsonb_build_object(
        'new_data', row_to_json(NEW),
        'created_at', NOW()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trg_audit_profile_changes ON teacher_profiles;

-- Create audit trigger
CREATE TRIGGER trg_audit_profile_changes
AFTER INSERT OR UPDATE OR DELETE ON teacher_profiles
FOR EACH ROW
EXECUTE FUNCTION audit_profile_changes();

-- ============================================================================
-- 7. VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify synchronization is working
-- ============================================================================

/*
-- Check if cascading delete is working:
SELECT COUNT(*) FROM auth.users;  -- Note the count
SELECT COUNT(*) FROM teacher_profiles;  -- Note the count
-- They should be equal!

-- View orphaned accounts (should be empty):
SELECT * FROM orphaned_auth_users;

-- View system logs:
SELECT action, user_id, created_at, details 
FROM system_logs 
WHERE action IN ('PROFILE_DELETED', 'PROFILE_CREATED')
ORDER BY created_at DESC;

-- Clean up orphaned users (if any):
SELECT * FROM cleanup_orphaned_auth_users();

-- Check recent profile changes:
SELECT action, user_id, created_at, details
FROM system_logs
WHERE action IN ('PROFILE_DELETED', 'PROFILE_UPDATED', 'PROFILE_CREATED')
ORDER BY created_at DESC
LIMIT 20;
*/

-- ============================================================================
-- 8. SYSTEM LOGS TABLE
-- ============================================================================
-- Note: system_logs table already exists in supabase_schema.sql
-- It has columns: id, user_id, action, resource_type, resource_id, details, ip_address, created_at
-- Indexes are already created in the base schema
-- ============================================================================

-- ============================================================================
-- TESTING COMMANDS
-- ============================================================================

/*
-- TEST 1: Create a profile manually (note: id is the primary key, should match auth.users.id)
-- First, get a user_id from auth.users table, then insert profile with that id
INSERT INTO teacher_profiles (id, full_name, email, department)
VALUES ('some-uuid-here', 'Test Teacher', 'test@example.com', 'Computer Science');

-- TEST 2: Delete the profile and verify auth user is also deleted
DELETE FROM teacher_profiles WHERE full_name = 'Test Teacher';
-- Check: SELECT * FROM auth.users WHERE id = 'some-uuid-here';
-- Result: Should be empty! (deleted by CASCADE trigger)

-- TEST 3: Check system logs
SELECT * FROM system_logs WHERE action = 'PROFILE_DELETED' ORDER BY created_at DESC LIMIT 1;
*/

-- ============================================================================
-- END OF SYNCHRONIZATION SETUP
-- ============================================================================
