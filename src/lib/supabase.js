// ============================================================
// Supabase Client Configuration
// Author: SmartBridge FET Migration
// Date: 2026-07-07
// ============================================================

import { createClient } from '@supabase/supabase-js'

// ============================================================
// Environment Variables
// ============================================================

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// ============================================================
// Environment Validation
// ============================================================

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('🚨 Missing Supabase environment variables:')
  console.error('  VITE_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing')
  console.error('  VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Set' : '❌ Missing')
  throw new Error('Missing Supabase environment variables. Check your .env.local file.')
}

// ============================================================
// Create Supabase Client
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
})

// ============================================================
// Helper: Get Current User
// ============================================================

export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) throw error
    return { user, error: null }
  } catch (error) {
    console.error('Error getting current user:', error)
    return { user: null, error }
  }
}

// ============================================================
// Helper: Get Current User Profile
// ============================================================

export const getCurrentUserProfile = async () => {
  try {
    const { user, error } = await getCurrentUser()
    if (error || !user) return { profile: null, error }
    
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()
    
    if (profileError) throw profileError
    return { profile, error: null }
  } catch (error) {
    console.error('Error getting user profile:', error)
    return { profile: null, error }
  }
}

// ============================================================
// Helper: Check User Role
// ============================================================

export const hasRole = async (allowedRoles) => {
  try {
    const { profile, error } = await getCurrentUserProfile()
    if (error || !profile) return false
    
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]
    return roles.includes(profile.role)
  } catch {
    return false
  }
}

export const isAdmin = async () => {
  return hasRole('admin')
}

// ============================================================
// Helper: Table Reference
// ============================================================

export const table = (tableName) => {
  return supabase.from(tableName)
}

// ============================================================
// Helper: Upload File
// ============================================================

export const uploadFile = async (file, bucket = 'documents', path = '') => {
  try {
    const fileName = `${Date.now()}_${file.name}`
    const filePath = path ? `${path}/${fileName}` : fileName
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })
    
    if (error) throw error
    
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath)
    
    return { data, error: null, publicUrl }
  } catch (error) {
    console.error('File upload error:', error)
    return { data: null, error, publicUrl: null }
  }
}

// ============================================================
// Helper: Delete File
// ============================================================

export const deleteFile = async (filePath, bucket = 'documents') => {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .remove([filePath])
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('File delete error:', error)
    return { data: null, error }
  }
}

// ============================================================
// Helper: Invoke Edge Function
// ============================================================

export const invokeFunction = async (functionName, payload = {}) => {
  try {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: payload,
    })
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error(`Edge function "${functionName}" error:`, error)
    return { data: null, error }
  }
}

// ============================================================
// Helper: Log Activity (POPIA Compliance)
// ============================================================

export const logActivity = async (eventType, description, metadata = {}) => {
  try {
    const { user } = await getCurrentUser()
    
    await supabase
      .from('activity_log')
      .insert({
        event_type: eventType,
        user_email: user?.email || 'system',
        user_id: user?.id || null,
        description: description,
        metadata: metadata,
        created_at: new Date().toISOString(),
      })
  } catch (error) {
    console.warn('Failed to log activity:', error)
  }
}

export default {
  supabase,
  getCurrentUser,
  getCurrentUserProfile,
  hasRole,
  isAdmin,
  table,
  uploadFile,
  deleteFile,
  invokeFunction,
  logActivity,
}
