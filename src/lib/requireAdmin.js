// ─── Admin Role Verification Utility ──────────────────────────────────────────
// Checks Clerk user against Supabase users table to verify admin role.
// Used by <AdminGuard> component for route protection.
// 
// FIRST-TIME SETUP: If the users table doesn't exist, it reports TABLE_NOT_FOUND.
// If no admin user exists yet, the FIRST user to sign in gets promoted to admin.

import { supabase } from './supabase.js';

/**
 * Detects if a Supabase error means the table doesn't exist.
 * Checks ALL possible fields on the error object.
 */
function isTableMissing(error) {
  if (!error) return false;

  // Stringify the entire error to catch all possible fields
  const fullStr = JSON.stringify(error).toLowerCase();

  console.log('[requireAdmin] Error check:', {
    message: error.message,
    details: error.details,
    hint: error.hint,
    code: error.code,
    fullStr: fullStr.substring(0, 200),
  });

  return (
    fullStr.includes('does not exist') ||
    fullStr.includes('schema cache') ||
    fullStr.includes('could not find') ||
    fullStr.includes('relation') ||
    fullStr.includes('42p01') ||
    fullStr.includes('pgrst204') ||
    fullStr.includes('not found in the schema')
  );
}

/**
 * Syncs a Clerk user to the Supabase `users` table.
 * Creates the user row if it doesn't exist, returns the row if it does.
 * AUTO-PROMOTES first user to admin if no admins exist yet.
 * @param {Object} clerkUser - The Clerk user object
 * @returns {Promise<{success: boolean, user: Object|null, error: string|null, tableExists: boolean}>}
 */
export async function syncClerkUserToSupabase(clerkUser) {
  if (!clerkUser || !clerkUser.id) {
    return { success: false, user: null, error: 'No Clerk user provided', tableExists: true };
  }

  const clerkId = clerkUser.id;
  const email = clerkUser.primaryEmailAddress?.emailAddress
    || clerkUser.emailAddresses?.[0]?.emailAddress
    || clerkUser.phoneNumbers?.[0]?.phoneNumber
    || '';

  try {
    // Step 1: Check if user already exists
    const { data: existing, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_id', clerkId)
      .maybeSingle();

    // If table doesn't exist, return immediately
    if (fetchError) {
      console.log('[requireAdmin] fetchError detected:', fetchError);
      if (isTableMissing(fetchError)) {
        console.error('[requireAdmin] ❌ Users table NOT FOUND in Supabase');
        return { success: false, user: null, error: 'TABLE_NOT_FOUND', tableExists: false };
      }
      console.error('[requireAdmin] Fetch user error (non-table):', fetchError.message);
      return { success: false, user: null, error: fetchError.message, tableExists: true };
    }

    if (existing) {
      return { success: true, user: existing, error: null, tableExists: true };
    }

    // Step 2: Check if ANY admin exists
    const { data: admins, error: adminsError } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin')
      .limit(1);

    if (adminsError && isTableMissing(adminsError)) {
      return { success: false, user: null, error: 'TABLE_NOT_FOUND', tableExists: false };
    }

    const noAdminsExist = !adminsError && (!admins || admins.length === 0);

    // Step 3: Create new user — if no admins exist, auto-promote this user
    const assignedRole = noAdminsExist ? 'admin' : 'citizen';

    if (noAdminsExist) {
      console.log(`[requireAdmin] 🎉 No admins found! Auto-promoting ${email || clerkId} to admin.`);
    }

    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([{
        clerk_id: clerkId,
        email: email,
        role: assignedRole,
      }])
      .select()
      .single();

    if (insertError && isTableMissing(insertError)) {
      return { success: false, user: null, error: 'TABLE_NOT_FOUND', tableExists: false };
    }

    if (insertError) {
      console.error('[requireAdmin] Insert user error:', insertError.message);
      return { success: false, user: null, error: insertError.message, tableExists: true };
    }

    console.log(`[requireAdmin] ✅ User synced: ${email || clerkId} with role=${assignedRole}`);
    return { success: true, user: newUser, error: null, tableExists: true };
  } catch (err) {
    console.error('[requireAdmin] Unexpected error:', err);
    // Last-resort check — if the catch block fires with a table-related message
    const errMsg = (err?.message || '').toLowerCase();
    if (errMsg.includes('schema cache') || errMsg.includes('does not exist') || errMsg.includes('could not find')) {
      return { success: false, user: null, error: 'TABLE_NOT_FOUND', tableExists: false };
    }
    return { success: false, user: null, error: 'Unexpected error during user sync', tableExists: true };
  }
}

/**
 * Checks if a Clerk user has admin role in Supabase.
 * @param {Object} clerkUser - The Clerk user object
 * @returns {Promise<{isAdmin: boolean, user: Object|null, error: string|null, tableExists: boolean}>}
 */
export async function checkAdminRole(clerkUser) {
  const result = await syncClerkUserToSupabase(clerkUser);

  if (!result.tableExists) {
    return { isAdmin: false, user: null, error: 'TABLE_NOT_FOUND', tableExists: false };
  }

  if (!result.success || !result.user) {
    return { isAdmin: false, user: null, error: result.error, tableExists: true };
  }

  return {
    isAdmin: result.user.role === 'admin',
    user: result.user,
    error: null,
    tableExists: true,
  };
}

/**
 * Checks if a Clerk user has worker role in Supabase.
 * @param {Object} clerkUser - The Clerk user object
 * @returns {Promise<{isWorker: boolean, user: Object|null, error: string|null, tableExists: boolean}>}
 */
export async function checkWorkerRole(clerkUser) {
  const result = await syncClerkUserToSupabase(clerkUser);

  if (!result.tableExists) {
    return { isWorker: false, user: null, error: 'TABLE_NOT_FOUND', tableExists: false };
  }

  if (!result.success || !result.user) {
    return { isWorker: false, user: null, error: result.error, tableExists: true };
  }

  return {
    isWorker: result.user.role === 'worker',
    user: result.user,
    error: null,
    tableExists: true,
  };
}
