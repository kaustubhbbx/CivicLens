// ─── Supabase Browser Client ──────────────────────────────────────────────
// Safe for client-side usage — uses the anon (public) key only.
// Security is enforced by Row Level Security (RLS) policies on the database.
// NEVER import or use the service_role key in this file.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        'Missing Supabase environment variables. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env.local'
    );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
    },
});

// ─── Health Check ─────────────────────────────────────────────────────────
export async function checkSupabaseConnection() {
    try {
        const { data, error } = await supabase
            .from('complaints')
            .select('id')
            .limit(1);

        if (error) {
            console.error('[Supabase] Connection check failed:', error.message);
            return { status: 'error', message: error.message };
        }

        return { status: 'connected', rowCount: data?.length ?? 0 };
    } catch (err) {
        console.error('[Supabase] Unexpected connection error:', err);
        return { status: 'error', message: 'Unexpected connection error' };
    }
}

// ─── Complaint Operations ─────────────────────────────────────────────────

export async function insertComplaint(complaint) {
    try {
        const payload = {
            uid: complaint.id,
            description: complaint.description,
            category: complaint.category,
            priority: complaint.priority,
            image_url: complaint.image_url || null,
            damage_level: complaint.damage_level || null,
            risk_type: complaint.risk_type || null,
            authority: complaint.authority || complaint.assigned_dept || null,
            escalation_required: complaint.escalation_required || false,
            estimated_resolution_time: complaint.estimated_resolution_time || null,
            ai_confidence: complaint.ai_confidence || null,
            ai_reasoning: complaint.ai_reasoning || null,
            ai_score: complaint.ai_score || null,
            location: complaint.location || null,
            zone: complaint.zone || null,
            status: complaint.status || 'Reported',
            votes: complaint.votes || 0,
            is_emergency: complaint.is_emergency || false,
        };

        console.log('[Supabase] Inserting complaint:', payload.uid);

        const { data, error } = await supabase
            .from('complaints')
            .insert([payload])
            .select()
            .single();

        if (error) {
            console.error('[Supabase] Insert failed:', error.message);
            return { success: false, error: error.message };
        }

        console.log('[Supabase] Insert success:', data.uid);
        return { success: true, data };
    } catch (err) {
        console.error('[Supabase] Unexpected insert error:', err);
        return { success: false, error: 'Unexpected error during insert' };
    }
}

export async function fetchComplaints() {
    // Strategy: Try backend first (service-role, bypasses RLS), fallback to direct Supabase query
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000); // 3s timeout
        const response = await fetch('http://localhost:5000/api/admin/complaints', { signal: controller.signal });
        clearTimeout(timeout);
        const result = await response.json();

        if (!response.ok || !result.success) {
            console.warn('[Supabase] Backend fetch failed, falling back to direct query:', result.error);
            return await fetchComplaintsDirect();
        }

        console.log('[Supabase] Fetched complaints via backend:', result.data?.length);
        return { success: true, data: result.data || [] };
    } catch (err) {
        console.warn('[Supabase] Backend unreachable, using direct Supabase query:', err.message);
        return await fetchComplaintsDirect();
    }
}

// Direct Supabase query fallback (uses anon key — requires RLS SELECT policy)
async function fetchComplaintsDirect() {
    try {
        const { data, error } = await supabase
            .from('complaints')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[Supabase Direct] Query error:', error.message);
            return { success: false, error: error.message, data: [] };
        }

        console.log('[Supabase Direct] Fetched complaints:', data?.length);
        return { success: true, data: data || [] };
    } catch (err) {
        console.error('[Supabase Direct] Unexpected error:', err);
        return { success: false, error: 'Direct Supabase query failed', data: [] };
    }
}

export async function updateComplaintVotes(uid, newVotes) {
    try {
        const { error } = await supabase
            .from('complaints')
            .update({ votes: newVotes })
            .eq('uid', uid);

        if (error) {
            console.error('[Supabase] Vote update failed:', error.message);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (err) {
        console.error('[Supabase] Unexpected vote error:', err);
        return { success: false, error: 'Unexpected error during vote update' };
    }
}

export async function updateComplaintStatus(uid, newStatus) {
    try {
        const { error } = await supabase
            .from('complaints')
            .update({ status: newStatus })
            .eq('uid', uid);

        if (error) {
            console.error('[Supabase] Status update failed:', error.message);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (err) {
        console.error('[Supabase] Unexpected status error:', err);
        return { success: false, error: 'Unexpected error during status update' };
    }
}

// ─── Image Upload (Storage Bucket) ────────────────────────────────────────

export async function uploadComplaintImage(file, complaintUid) {
    try {
        if (!file) return { success: true, url: null };

        const ext = file.name?.split('.').pop() || 'jpg';
        const fileName = `${complaintUid}_${Date.now()}.${ext}`;
        const filePath = `complaints/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('complaint-media')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false,
                contentType: file.type || 'image/jpeg',
            });

        if (uploadError) {
            console.error('[Supabase Storage] Upload failed:', uploadError.message);
            return { success: false, error: uploadError.message, url: null };
        }

        const { data: urlData } = supabase.storage
            .from('complaint-media')
            .getPublicUrl(filePath);

        const publicUrl = urlData?.publicUrl || null;
        console.log('[Supabase Storage] Image uploaded:', publicUrl);
        return { success: true, url: publicUrl };
    } catch (err) {
        console.error('[Supabase Storage] Unexpected upload error:', err);
        return { success: false, error: 'Unexpected error during upload', url: null };
    }
}

export async function updateComplaintImageUrl(uid, imageUrl) {
    try {
        const { error } = await supabase
            .from('complaints')
            .update({ image_url: imageUrl })
            .eq('uid', uid);

        if (error) {
            console.error('[Supabase] Image URL update failed:', error.message);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (err) {
        console.error('[Supabase] Unexpected image URL error:', err);
        return { success: false, error: 'Unexpected error during image URL update' };
    }
}

// ─── Activity Logs ────────────────────────────────────────────────────────

export async function insertActivityLog(type, message, complaintUid = null, level = 'info') {
    try {
        const { error } = await supabase
            .from('activity_logs')
            .insert([{
                type,
                message,
                complaint_uid: complaintUid,
                level,
            }]);

        if (error) {
            console.error('[Supabase] Log insert failed:', error.message);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (err) {
        console.error('[Supabase] Unexpected log error:', err);
        return { success: false, error: 'Unexpected error during log insert' };
    }
}

export async function fetchActivityLogs(limit = 50) {
    try {
        const { data, error } = await supabase
            .from('activity_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('[Supabase] Fetch logs failed:', error.message);
            return { success: false, error: error.message, data: [] };
        }

        return { success: true, data: data || [] };
    } catch (err) {
        console.error('[Supabase] Unexpected fetch logs error:', err);
        return { success: false, error: 'Unexpected fetch logs error', data: [] };
    }
}
