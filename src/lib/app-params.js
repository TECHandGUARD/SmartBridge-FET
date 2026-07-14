/**
 * ====================================================================
 * SUPABASE FUNCTIONS PARAMETER MANAGEMENT
 * TARGET: SUPABASE EDGE FUNCTIONS
 * SECURITY: ACCESS TOKENS ARE HANDLED WITH CARE - NEVER LOGGED
 * ====================================================================
 */

const isNode = typeof window === 'undefined';

// ============================================================
// Server Storage Mock (for SSR)
// ============================================================

class ServerStorageMock {
  private memoryMap = new Map<string, string>();
  
  get length(): number { return this.memoryMap.size; }
  clear(): void { this.memoryMap.clear(); }
  getItem(key: string): string | null { return this.memoryMap.get(key) ?? null; }
  key(index: number): string | null { return Array.from(this.memoryMap.keys())[index] ?? null; }
  removeItem(key: string): void { this.memoryMap.delete(key); }
  setItem(key: string, value: string): void { this.memoryMap.set(key, value); }
}

// ============================================================
// Storage (browser localStorage or server mock)
// ============================================================

const storage: Storage = isNode ? new ServerStorageMock() as unknown as Storage : window.localStorage;

// ============================================================
// Helper: Convert camelCase to snake_case
// ============================================================

const toSnakeCase = (str: string): string => {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase();
};

// ============================================================
// Types
// ============================================================

interface GetAppParamOptions {
  defaultValue?: string;
  removeFromUrl?: boolean;
}

interface AppParams {
  supabaseUrl: string;
  anonKey: string;
  accessToken: string | null;
  fromUrl: string;
  functionsVersion: string;
  appBaseUrl: string;
}

// ============================================================
// Get App Parameter Value
// ============================================================

const getAppParamValue = (
  paramName: string, 
  { defaultValue = undefined, removeFromUrl = false }: GetAppParamOptions = {}
): string | null => {
  if (isNode) {
    return defaultValue ?? null;
  }
  
  const storageKey = `supabase_${toSnakeCase(paramName)}`;
  const urlParams = new URLSearchParams(window.location.search);
  const searchParam = urlParams.get(paramName);
  
  // Remove from URL if requested (cleanup)
  if (removeFromUrl && searchParam) {
    urlParams.delete(paramName);
    const newUrl = `${window.location.pathname}${urlParams.toString() ? `?${urlParams.toString()}` : ""}${window.location.hash}`;
    window.history.replaceState({}, document.title, newUrl);
  }
  
  // Priority: URL param > defaultValue > stored value
  if (searchParam) {
    try {
      storage.setItem(storageKey, searchParam);
    } catch (_) {
      // localStorage may be full or unavailable
    }
    return searchParam;
  }
  
  if (defaultValue) {
    try {
      storage.setItem(storageKey, defaultValue);
    } catch (_) {
      // localStorage may be full or unavailable
    }
    return defaultValue;
  }
  
  try {
    const storedValue = storage.getItem(storageKey);
    if (storedValue) {
      return storedValue;
    }
  } catch (_) {
    // localStorage may be unavailable
  }
  
  return null;
};

// ============================================================
// Get All App Parameters
// ============================================================

const getAppParams = (): AppParams => {
  // Clean up tokens if requested
  if (!isNode && getAppParamValue("clear_access_token") === 'true') {
    try {
      storage.removeItem('supabase_access_token');
      storage.removeItem('sb-access-token');
      storage.removeItem('sb-refresh-token');
    } catch (_) {
      // localStorage may be unavailable
    }
  }
  
  return {
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    // ✅ SECURITY: Access token is read once and never logged
    accessToken: getAppParamValue("access_token", { removeFromUrl: true }),
    fromUrl: getAppParamValue("from_url", { defaultValue: isNode ? '' : window.location.href }) || '',
    functionsVersion: getAppParamValue("functions_version", { defaultValue: import.meta.env.VITE_SUPABASE_FUNCTIONS_VERSION || 'v1' }) || '',
    appBaseUrl: getAppParamValue("app_base_url", { defaultValue: import.meta.env.VITE_APP_BASE_URL || 'https://smartbridge.co.za' }) || '',
  };
};

// ============================================================
// ✅ FIXED: Static export with getter for reactivity
// ============================================================

// Static snapshot - good for most use cases
export const appParams: AppParams = {
  ...getAppParams()
};

// ✅ NEW: Reactive getter - good for dynamic URL parameters
export const getAppParamsReactive = (): AppParams => {
  return getAppParams();
};

// ✅ NEW: Get a single param reactively
export const getAppParam = (paramName: string, options?: GetAppParamOptions): string | null => {
  return getAppParamValue(paramName, options);
};

// ✅ NEW: Clear all stored parameters (for logout)
export const clearAppParams = (): void => {
  if (isNode) return;
  
  const keys = [
    'supabase_access_token',
    'supabase_from_url',
    'supabase_functions_version',
    'supabase_app_base_url',
    'sb-access-token',
    'sb-refresh-token',
  ];
  
  for (const key of keys) {
    try {
      storage.removeItem(key);
    } catch (_) {
      // localStorage may be unavailable
    }
  }
};

// ============================================================
// Security Notes (documentation)
// ============================================================

/**
 * SECURITY NOTES:
 * 
 * 1. ACCESS TOKENS: Never log access tokens to console or send them in
 *    plain text. This module removes them from the URL as soon as they're read.
 * 
 * 2. STORAGE: Tokens are stored in localStorage, which is accessible to
 *    JavaScript on the same domain. Ensure proper Content Security Policy (CSP).
 * 
 * 3. ALTERNATIVES: For production, consider using:
 *    - HttpOnly cookies (preferred for security)
 *    - Authorization headers instead of URL parameters
 *    - Session storage for tokens that should be cleared on tab close
 * 
 * 4. CLEANUP: The clear_access_token URL parameter will clean up stored tokens.
 */

console.info(`🔐 ${appParams.appBaseUrl} - Parameter manager initialized`);
