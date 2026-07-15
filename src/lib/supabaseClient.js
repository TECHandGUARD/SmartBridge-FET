// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

// ============================================================
// 🔧 Environment Variables (Soft-coded)
// ============================================================

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ============================================================
// 🚨 Environment Validation
// ============================================================

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('🚨 Missing Supabase environment variables:');
  console.error('  VITE_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
  console.error('  VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Set' : '❌ Missing');
  console.error('Please set these in your Amplify environment or .env.local file.');
  
  // In production, fail fast to prevent runtime errors
  if (import.meta.env.PROD) {
    throw new Error('Supabase environment variables are required.');
  }
}

// ============================================================
// 🚀 Create Supabase Client
// ============================================================

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce', // Recommended for security
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  // Optional: add custom fetch timeout (30s default)
  // fetch: (url, options) => fetch(url, { ...options, timeout: 30000 }),
});

// ============================================================
// 🛠️ Helper Functions
// ============================================================

/**
 * Get the currently authenticated user.
 */
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return { user, error: null };
  } catch (error) {
    console.error('❌ getCurrentUser error:', error.message);
    return { user: null, error };
  }
};

/**
 * Get the current user's profile from the `users` table.
 */
export const getCurrentUserProfile = async () => {
  try {
    const { user, error } = await getCurrentUser();
    if (error || !user) return { profile: null, error };
    
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profileError) throw profileError;
    return { profile, error: null };
  } catch (error) {
    console.error('❌ getCurrentUserProfile error:', error.message);
    return { profile: null, error };
  }
};

/**
 * Check if the current user has one of the allowed roles.
 */
export const hasRole = async (allowedRoles) => {
  try {
    const { profile, error } = await getCurrentUserProfile();
    if (error || !profile) return false;
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    return roles.includes(profile.role);
  } catch {
    return false;
  }
};

/**
 * Check if the current user is an admin.
 */
export const isAdmin = async () => hasRole('admin');

/**
 * Sign out the current user.
 */
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { success: true, error: null };
  } catch (error) {
    console.error('❌ signOut error:', error.message);
    return { success: false, error };
  }
};

/**
 * Shortcut for supabase.from(tableName)
 */
export const db = (tableName) => supabase.from(tableName);

// Alias for convenience
export const table = db;

// ============================================================
// 📁 Storage Helpers
// ============================================================

const DEFAULT_BUCKET = import.meta.env.VITE_STORAGE_BUCKET || 'documents';

/**
 * Upload a file to Supabase Storage.
 */
export const uploadFile = async (file, bucket = DEFAULT_BUCKET, path = '') => {
  try {
    const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
    const filePath = path ? `${path}/${fileName}` : fileName;
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });
    
    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);
    
    return { data, error: null, publicUrl };
  } catch (error) {
    console.error('❌ uploadFile error:', error.message);
    return { data: null, error, publicUrl: null };
  }
};

/**
 * Delete a file from Supabase Storage.
 */
export const deleteFile = async (filePath, bucket = DEFAULT_BUCKET) => {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('❌ deleteFile error:', error.message);
    return { data: null, error };
  }
};

// ============================================================
// ⚡ Edge Functions
// ============================================================

/**
 * Invoke a Supabase Edge Function.
 */
export const invokeFunction = async (functionName, payload = {}) => {
  try {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: payload,
    });
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error(`❌ invokeFunction("${functionName}") error:`, error.message);
    return { data: null, error };
  }
};

// ============================================================
// 📊 Activity Logging (POPIA compliant)
// ============================================================

/**
 * Log an activity event for auditing.
 */
export const logActivity = async (eventType, description, metadata = {}) => {
  try {
    const { user } = await getCurrentUser();
    await supabase
      .from('activity_log')
      .insert({
        event_type: eventType,
        user_email: user?.email || 'system',
        user_id: user?.id || null,
        description: description,
        metadata: metadata,
        created_at: new Date().toISOString(),
      });
  } catch (error) {
    console.warn('⚠️ Failed to log activity:', error.message);
  }
};

// ============================================================
// 🔌 Connection Check (for debugging)
// ============================================================

export const checkConnection = async () => {
  try {
    const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });
    if (error) throw error;
    console.log('✅ Supabase connection successful');
    return { success: true };
  } catch (error) {
    console.error('❌ Supabase connection failed:', error.message);
    return { success: false, error: error.message };
  }
};
