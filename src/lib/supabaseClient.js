// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// ============================================================
// 🔧 Environment Variables (Soft-coded)
// ============================================================

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (import.meta.env.DEV) {
  console.log('🔍 Environment Check:');
  console.log('   VITE_SUPABASE_URL:', supabaseUrl ? '✅ Present' : '❌ MISSING');
  console.log('   VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Present' : '❌ MISSING');
}

// ============================================================
// 🚨 Environment Validation - DO NOT THROW, JUST WARN
// ============================================================

let supabaseClient = null;
let initError = null;

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMessage = `Missing Supabase environment variables. VITE_SUPABASE_URL: ${supabaseUrl ? '✅' : '❌'}, VITE_SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✅' : '❌'}`;
  console.error('🚨 ' + errorMessage);
  initError = new Error(errorMessage);
  // DO NOT THROW - let app load with graceful degradation
} else {
  // ============================================================
  // 🚀 Create Supabase Client (ONLY if credentials exist)
  // ============================================================

  try {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
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
    if (import.meta.env.DEV) {
      console.log('✅ Supabase client initialized successfully');
    }
  } catch (error) {
    console.error('❌ Failed to create Supabase client:', error);
    initError = error;
    supabaseClient = null;
  }
}

// ✅ CRITICAL: Export supabaseClient (not undefined)
export const supabase = supabaseClient;

// Corrected spelling (was: supbaseInitError)
export const supabaseInitError = initError;
// @deprecated - typo alias kept for backward compatibility. Migrate imports to `supabaseInitError`.
export const supbaseInitError = initError;

// ============================================================
// 📡 Global Channel Manager (Reference-Counted)
// ============================================================

// Map<channelName, { channel, subscribers: Set<string> }>
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
    if (error || !profile) return false;
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    return roles.includes(profile.role);
  } catch {
    return false;
  }
};

export const isAdmin = async () => hasRole('admin');

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

const DEFAULT_BUCKET = import.meta.env.VITE_STORAGE_BUCKET || 'documents';

export const uploadFile = async (file, bucket = DEFAULT_BUCKET, path = '') => {
  if (!supabase) return { data: null, error: initError, publicUrl: null };

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

if (typeof window !== 'undefined') {
  window.__supabaseEmergencyReset = emergencyReset;
  window.__supabaseChannels = getRealtimeHealth;
}

// ============================================================
// 🧠 GLOBAL QUERY DEDUPLICATION
// ============================================================

const requestCache = new Map();

/**
 * Deduplicate in-flight queries and cache successful results for `ttl` ms.
 *
 * Handles two distinct failure modes:
 *   1. PostgrestError returned as `{ data: null, error }` (Supabase does not reject)
 *   2. Genuine thrown exceptions (network, JSON parse, etc.)
 * Both are memoized so a burst of callers does not stampede a failing endpoint.
 *
 * @param {string} cacheKey
 * @param {() => Promise<any>} queryFn
 * @param {number} [ttl=10000]
 */
const executeQuery = (cacheKey, queryFn, ttl = 10000) => {
  const now = Date.now();
  const cached = requestCache.get(cacheKey);

  if (cached && now - cached.timestamp < ttl) {
    if (cached.failed) {
      return Promise.reject(cached.error);
    }
    return cached.promise;
  }

  const promise = (async () => {
    try {
      const result = await queryFn();

      // Supabase returns { data, error } rather than rejecting
      if (result && typeof result === 'object' && 'error' in result && result.error) {
        requestCache.set(cacheKey, {
          failed: true,
          timestamp: Date.now(),
          error: result.error,
        });
        // Still return the result so callers can inspect { data, error }
        return result;
      }

      // Success: keep the resolved promise in cache for the TTL
      return result;
    } catch (error) {
      requestCache.set(cacheKey, {
        failed: true,
        timestamp: Date.now(),
        error,
      });
      throw error;
    }
  })();

  requestCache.set(cacheKey, {
    promise,
    timestamp: now,
    failed: false,
  });

  // Schedule eviction regardless of outcome
  setTimeout(() => {
    const current = requestCache.get(cacheKey);
    if (current && current.promise === promise) {
      requestCache.delete(cacheKey);
    }
  }, ttl);

  return promise;
};

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
      .from('tutor_profiles')
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

export const clearQueryCache = () => requestCache.clear();
export const getCacheStats = () => {
  const stats = { size: requestCache.size, keys: [] };
  for (const [key, value] of requestCache) {
    stats.keys.push({ key, failed: value.failed || false, timestamp: value.timestamp });
  }
  return stats;
};

if (typeof window !== 'undefined') {
  window.__supabaseCacheStats = getCacheStats;
  window.__supabaseClearCache = clearQueryCache;
}
