/**
 * ====================================================================
 * SUPABASE FUNCTIONS PARAMETER MANAGEMENT
 * TARGET: SUPABASE EDGE FUNCTIONS
 * ====================================================================
 */

const isNode = typeof window === 'undefined';

// FIXED: Proper Storage interface implementation
class ServerStorageMock implements Storage {
  private memoryMap = new Map<string, string>();
  
  get length(): number { return this.memoryMap.size; }
  clear(): void { this.memoryMap.clear(); }
  getItem(key: string): string | null { return this.memoryMap.get(key) ?? null; }
  key(index: number): string | null { return Array.from(this.memoryMap.keys())[index] ?? null; }
  removeItem(key: string): void { this.memoryMap.delete(key); }
  setItem(key: string, value: string): void { this.memoryMap.set(key, value); }
}

const storage: Storage = isNode ? new ServerStorageMock() : window.localStorage;

const toSnakeCase = (str: string): string => {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase();
};

interface GetAppParamOptions {
  defaultValue?: string;
  removeFromUrl?: boolean;
}

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
  
  if (removeFromUrl && searchParam) {
    urlParams.delete(paramName);
    const newUrl = `${window.location.pathname}${urlParams.toString() ? `?${urlParams.toString()}` : ""}${window.location.hash}`;
    window.history.replaceState({}, document.title, newUrl);
  }
  
  if (searchParam) {
    storage.setItem(storageKey, searchParam);
    return searchParam;
  }
  
  if (defaultValue) {
    storage.setItem(storageKey, defaultValue);
    return defaultValue;
  }
  
  const storedValue = storage.getItem(storageKey);
  if (storedValue) {
    return storedValue;
  }
  
  return null;
};

interface AppParams {
  supabaseUrl: string;
  anonKey: string;
  accessToken: string | null;
  fromUrl: string;
  functionsVersion: string;
  appBaseUrl: string;
}

const getAppParams = (): AppParams => {
  if (!isNode && getAppParamValue("clear_access_token") === 'true') {
    storage.removeItem('supabase_access_token');
    storage.removeItem('sb-access-token');
    storage.removeItem('sb-refresh-token');
  }
  
  return {
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    accessToken: getAppParamValue("access_token", { removeFromUrl: true }),
    fromUrl: getAppParamValue("from_url", { defaultValue: isNode ? '' : window.location.href }) || '',
    functionsVersion: getAppParamValue("functions_version", { defaultValue: import.meta.env.VITE_SUPABASE_FUNCTIONS_VERSION || 'v1' }) || '',
    appBaseUrl: getAppParamValue("app_base_url", { defaultValue: import.meta.env.VITE_APP_BASE_URL || 'https://smartbridge.co.za' }) || '',
  };
};

export const appParams: AppParams = {
  ...getAppParams()
};
