import {PRIVATE_BUCKETS,uploadPrivate} from './private-storage.js';
import {createQueryCache} from './query-cache.js';
import {createClientReporter,monitoredFetch} from './monitoring.js';
import { createClient } from '@supabase/supabase-js';

import { appConfig, configurationError } from './config.js';
export { configurationError };
const supabaseUrl = appConfig.supabaseUrl;
const supabaseAnonKey = appConfig.supabaseKey;

// Create Supabase client
let reportRequest=(_code)=>{};
export const supabase = configurationError ? null : createClient(supabaseUrl, supabaseAnonKey, {
  global: {fetch: monitoredFetch(globalThis.fetch.bind(globalThis),code=>reportRequest(code))},
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: typeof window === 'undefined' ? undefined : window.localStorage,
  },
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

reportRequest=createClientReporter(supabase);

// Optional: Helper function to check if user is authenticated
export const isAuthenticated = async () => {
  if (!supabase) return false;
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
};


const initError = configurationError ? new Error(configurationError) : null;
export const supabaseInitError = initError;
export const supbaseInitError = initError;

const activeChannels = new Map();
const MAX_CHANNELS = 20;

const generateSubscriberId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `sub_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

/**
 * Subscribe to a realtime channel with reference counting.
 * Multiple components can subscribe to the same channelName;
 * the underlying Supabase channel is only created once and torn
 * down when the last subscriber unsubscribes.
 *
 * @param {string} channelName
 * @param {(channel: any) => Promise<any>} setupCallback
 * @param {string} [subscriberId] - stable ID per caller (e.g. from useRef). Auto-generated if omitted.
 * @returns {Promise<{ channel: any, error: any, subscriberId: string }>}
 */
export const safeSubscribe = async (channelName, setupCallback, subscriberId = generateSubscriberId()) => {
  if (!supabase) {
    console.error('❌ Cannot subscribe: Supabase not initialized');
    return { channel: null, error: initError, subscriberId };
  }

  // Existing channel → just add another subscriber
  const existing = activeChannels.get(channelName);
  if (existing) {
    existing.subscribers.add(subscriberId);
    return { channel: existing.channel, error: null, subscriberId };
  }

  // Enforce channel ceiling
  if (activeChannels.size >= MAX_CHANNELS) {
    console.warn(`⚠️ Too many active channels (${activeChannels.size}). Removing oldest.`);
    const oldestKey = activeChannels.keys().next().value;
    const oldest = activeChannels.get(oldestKey);
    try {
      await supabase.removeChannel(oldest.channel);
    } catch (e) {
      // ignore
    }
    activeChannels.delete(oldestKey);
  }

  try {
    let channel = supabase.channel(channelName);
    channel = await setupCallback(channel);

    // Dev-only sanity check: channelName and topic should align
    if (import.meta.env.DEV && channel?.topic && channel.topic !== `realtime:${channelName}`) {
      console.warn(
        `⚠️ safeSubscribe("${channelName}") - setupCallback returned channel with topic "${channel.topic}". ` +
        `Cleanup may leak.`
      );
    }

    const subscription = channel.subscribe((status, err) => {
      if (import.meta.env.DEV && status === 'SUBSCRIBED') {
        console.log(`✅ Subscribed to channel: ${channelName}`);
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`❌ Channel error: ${channelName}`, err);
        activeChannels.delete(channelName);
      } else if (status === 'TIMED_OUT') {
        console.warn(`⏱️ Channel timed out: ${channelName}`);
        activeChannels.delete(channelName);
      }
    });

    activeChannels.set(channelName, {
      channel: subscription,
      subscribers: new Set([subscriberId]),
    });

    return { channel: subscription, error: null, subscriberId };
  } catch (error) {
    console.error(`❌ Failed to subscribe to channel "${channelName}":`, error);
    return { channel: null, error, subscriberId };
  }
};

/**
 * Unsubscribe. If a subscriberId is provided, only that subscriber is
 * removed; the underlying channel is torn down when the last subscriber
 * leaves. If omitted, the entire channel is removed (backward compatible).
 */
export const unsafeUnsubscribe = async (channelName, subscriberId) => {
  if (!supabase) return;

  const entry = activeChannels.get(channelName);
  if (!entry) {
    console.warn(`⚠️ Channel "${channelName}" not found in active map.`);
    return;
  }

  if (subscriberId) {
    entry.subscribers.delete(subscriberId);
    if (entry.subscribers.size > 0) {
      if (import.meta.env.DEV) {
        console.log(
          `↩️ Unsubscribed subscriber from "${channelName}" (${entry.subscribers.size} remaining).`
        );
      }
      return;
    }
  }

  try {
    await supabase.removeChannel(entry.channel);
    activeChannels.delete(channelName);
    if (import.meta.env.DEV) {
      console.log(`✅ Unsubscribed from channel: ${channelName}`);
    }
  } catch (error) {
    console.error(`❌ Failed to unsubscribe from "${channelName}":`, error);
  }
};

export const unsubscribeAll = async () => {
  if (!supabase) return;

  const keys = Array.from(activeChannels.keys());
  for (const key of keys) {
    await unsafeUnsubscribe(key);
  }
  activeChannels.clear();
  if (import.meta.env.DEV) {
    console.log('✅ All channels unsubscribed.');
  }
};

export const getActiveChannels = () => Array.from(activeChannels.keys());
export const isChannelActive = (channelName) => activeChannels.has(channelName);

// ============================================================
// 🛠️ Existing Helper Functions
// ============================================================

export const getCurrentUser = async () => {
  if (!supabase) return { user: null, error: initError };

  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return { user, error: null };
  } catch (error) {
    console.error('❌ getCurrentUser error:', error.message);
    return { user: null, error };
  }
};

export const getCurrentUserProfile = async () => {
  if (!supabase) return { profile: null, error: initError };

  try {
    const { user, error } = await getCurrentUser();
    if (error || !user) return { profile: null, error };
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle(); // tolerate missing profile row (e.g. during signup)
    if (profileError) throw profileError;
    return { profile, error: null };
  } catch (error) {
    console.error('❌ getCurrentUserProfile error:', error.message);
    return { profile: null, error };
  }
};

export const hasRole = async (allowedRoles) => {
  try {
    const { profile, error } = await getCurrentUserProfile();
    if (error || !profile || profile.is_active===false) return false;
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    return roles.includes(profile.is_super_admin===true?'admin':profile.role);
  } catch {
    return false;
  }
};

export const isAdmin = async () => {
 const {profile,error}=await getCurrentUserProfile();return !error&&profile?.is_active!==false&&profile?.is_super_admin===true;
};

export const signOut = async () => {
  if (!supabase) return { success: false, error: initError };

  try {
    await unsubscribeAll();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { success: true, error: null };
  } catch (error) {
    console.error('❌ signOut error:', error.message);
    return { success: false, error };
  }
};

export const db = (tableName) => {
  if (!supabase) throw initError;
  return supabase.from(tableName);
};
export const table = db;

// ============================================================
// 📁 Storage Helpers
// ============================================================

const DEFAULT_BUCKET = 'application_documents';
const PUBLIC_BUCKETS = new Set(['avatars','videos','caps_documents','prospectus','opportunity_guides']);

export const uploadFile = async (file, bucket = DEFAULT_BUCKET, path = '') => {
  if (!supabase) return { data: null, error: initError, publicUrl: null };

  try {
    if(PRIVATE_BUCKETS.has(bucket)){
      const uploaded=await uploadPrivate(supabase,bucket,file);
      return {data:{path:uploaded.path},error:null,reference:uploaded.reference,publicUrl:null};
    }
    if(!PUBLIC_BUCKETS.has(bucket)) throw new Error('Unsupported storage bucket');
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

export const deleteFile = async (filePath, bucket = DEFAULT_BUCKET) => {
  if (!supabase) return { data: null, error: initError };

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

export const invokeFunction = async (functionName, payload = {}) => {
  if (!supabase) return { data: null, error: initError };

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
// 📊 Activity Logging
// ============================================================

export const logActivity = async (eventType, description, metadata = {}) => {
  if (!supabase) return;

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
 * Ping the Supabase REST endpoint directly. This checks *connectivity*
 * only - it does NOT depend on auth state or table permissions.
 */
export const checkConnection = async () => {
  if (!supabase) return { success: false, error: initError?.message };

  try {
    // HEAD request against the REST root — always available, no auth needed
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'HEAD',
      headers: { apikey: supabaseAnonKey },
    });
    if (!res.ok && res.status !== 404) {
      // 404 is fine: REST root often has no route, but the server answered
      throw new Error(`HTTP ${res.status}`);
    }
    if (import.meta.env.DEV) {
      console.log('✅ Supabase connection successful');
    }
    return { success: true };
  } catch (error) {
    console.error('❌ Supabase connection failed:', error.message);
    return { success: false, error: error.message };
  }
};

export const getRealtimeHealth = () => ({
  activeChannels: activeChannels.size,
  maxChannels: MAX_CHANNELS,
  healthy: activeChannels.size < MAX_CHANNELS,
  channelNames: Array.from(activeChannels.keys()),
});

// ============================================================
// 🛑 Emergency Reset
// ============================================================

export const emergencyReset = async () => {
  console.warn('🔥 EMERGENCY RESET: Destroying all Supabase state.');
  await unsubscribeAll();
  console.log('✅ Emergency reset complete.');
};



// ============================================================
// 🧠 GLOBAL QUERY DEDUPLICATION
// ============================================================

const queryCache = createQueryCache();
const executeQuery = queryCache.execute;
supabase?.auth.onAuthStateChange(()=>queryCache.clear());

// ============================================================
// 🎯 WRAPPERS: Use these instead of direct supabase.from() calls
// ============================================================

export const fetchApprovedResources = (limit = 6, offset = 0) => {
  if (!supabase) {
    console.error('❌ fetchApprovedResources: Supabase not initialized');
    return Promise.reject(initError);
  }

  const cacheKey = `resources:approved:${limit}:${offset}`;
  return executeQuery(cacheKey, () =>
    supabase
      .from('resources')
      .select('*')
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
  );
};

export const fetchResourceById = (id) => {
  if (!supabase) {
    console.error('❌ fetchResourceById: Supabase not initialized');
    return Promise.reject(initError);
  }

  const cacheKey = `resource:${id}`;
  return executeQuery(cacheKey, () =>
    supabase
      .from('resources')
      .select('*')
      .eq('id', id)
      .single()
  );
};

export const fetchTutors = (limit = 5) => {
  if (!supabase) {
    console.error('❌ fetchTutors: Supabase not initialized');
    return Promise.reject(initError);
  }

  const cacheKey = `tutors:${limit}`;
  return executeQuery(cacheKey, () =>
    supabase
      .from('tutor_directory')
      .select('*')
      .eq('is_verified', true)
      .limit(limit)
  );
};

export const fetchStudentBookings = (studentEmail, limit = 20) => {
  if (!supabase) {
    console.error('❌ fetchStudentBookings: Supabase not initialized');
    return Promise.reject(initError);
  }

  const cacheKey = `bookings:${studentEmail}:${limit}`;
  return executeQuery(cacheKey, () =>
    supabase
      .from('tutor_bookings')
      .select('*')
      .eq('student_email', studentEmail)
      .order('date', { ascending: true })
      .limit(limit)
  );
};

export const clearQueryCache = ()=>queryCache.clear();
export const getCacheStats = ()=>({size:queryCache.size});
