// src/lib/supabaseClient.js
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
    flowType: 'pkce',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// ============================================================
// 📡 Global Channel Manager (Prevents duplicate subscriptions)
// ============================================================

const activeChannels = new Map();
const MAX_CHANNELS = 20;

/**
 * Safely subscribe to a Supabase channel with deduplication.
 * @param {string} channelName - Unique name for the channel.
 * @param {Function} setupCallback - Callback that receives the channel and returns it after setting up listeners.
 * @returns {Promise<{ channel: any, error: Error | null }>}
 */
export const safeSubscribe = async (channelName, setupCallback) => {
  // If channel already exists, remove it first to avoid duplicates
  if (activeChannels.has(channelName)) {
    const existing = activeChannels.get(channelName);
    try {
      await supabase.removeChannel(existing);
    } catch (e) {
      console.warn(`⚠️ Failed to remove existing channel "${channelName}":`, e.message);
    }
    activeChannels.delete(channelName);
  }

  // Enforce max channels
  if (activeChannels.size >= MAX_CHANNELS) {
    console.warn(`⚠️ Too many active channels (${activeChannels.size}). Removing oldest.`);
    const oldestKey = activeChannels.keys().next().value;
    const oldest = activeChannels.get(oldestKey);
    try {
      await supabase.removeChannel(oldest);
    } catch (e) {}
    activeChannels.delete(oldestKey);
  }

  try {
    // Create a new channel
    let channel = supabase.channel(channelName);
    // Let the caller set up listeners
    channel = await setupCallback(channel);
    // Subscribe
    const subscription = channel.subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        console.log(`✅ Subscribed to channel: ${channelName}`);
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`❌ Channel error: ${channelName}`, err);
        // Remove from active map on error
        activeChannels.delete(channelName);
      } else if (status === 'TIMED_OUT') {
        console.warn(`⏱️ Channel timed out: ${channelName}`);
        activeChannels.delete(channelName);
      }
    });

    // Store in map
    activeChannels.set(channelName, subscription);
    return { channel: subscription, error: null };
  } catch (error) {
    console.error(`❌ Failed to subscribe to channel "${channelName}":`, error);
    return { channel: null, error };
  }
};

/**
 * Unsubscribe from a specific channel.
 */
export const unsafeUnsubscribe = async (channelName) => {
  if (activeChannels.has(channelName)) {
    const channel = activeChannels.get(channelName);
    try {
      await supabase.removeChannel(channel);
      activeChannels.delete(channelName);
      console.log(`✅ Unsubscribed from channel: ${channelName}`);
    } catch (error) {
      console.error(`❌ Failed to unsubscribe from "${channelName}":`, error);
    }
  } else {
    console.warn(`⚠️ Channel "${channelName}" not found in active map.`);
  }
};

/**
 * Unsubscribe from all active channels.
 */
export const unsubscribeAll = async () => {
  const keys = Array.from(activeChannels.keys());
  for (const key of keys) {
    await unsafeUnsubscribe(key);
  }
  activeChannels.clear();
  console.log('✅ All channels unsubscribed.');
};

/**
 * Get list of active channel names.
 */
export const getActiveChannels = () => {
  return Array.from(activeChannels.keys());
};

/**
 * Check if a channel is active.
 */
export const isChannelActive = (channelName) => {
  return activeChannels.has(channelName);
};

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
    // Unsubscribe all channels before signing out
    await unsubscribeAll();
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
// 🔌 Connection & Health Check
// ============================================================

/**
 * Check if Supabase connection is healthy.
 */
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

/**
 * Get real-time health status.
 */
export const getRealtimeHealth = () => {
  const count = activeChannels.size;
  const max = MAX_CHANNELS;
  const healthy = count < max;
  return {
    activeChannels: count,
    maxChannels: max,
    healthy,
    channelNames: Array.from(activeChannels.keys()),
  };
};

// ============================================================
// 🛑 Emergency Reset (for debugging infinite loops)
// ============================================================

/**
 * Emergency reset: kill all channels and clear everything.
 */
export const emergencyReset = async () => {
  console.warn('🔥 EMERGENCY RESET: Destroying all Supabase state.');
  await unsubscribeAll();
  // Optionally, force re-authentication? Not here.
  console.log('✅ Emergency reset complete.');
};

// Expose emergency reset globally for console debugging
if (typeof window !== 'undefined') {
  window.__supabaseEmergencyReset = emergencyReset;
  window.__supabaseChannels = getRealtimeHealth;
}