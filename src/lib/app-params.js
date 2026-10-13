import { appConfig } from './config.js';
/**
 * ====================================================================
 * SUPABASE FUNCTIONS PARAMETER MANAGEMENT
 * TARGET: SUPABASE EDGE FUNCTIONS
 * ====================================================================
 */

const isNode = typeof window === 'undefined';

// FIXED: Proper Storage interface implementation
class ServerStorageMock {
  memoryMap = new Map();

  get length() { return this.memoryMap.size; }
  clear() { this.memoryMap.clear(); }
  getItem(key) { return this.memoryMap.get(key) ?? null; }
  key(index) { return Array.from(this.memoryMap.keys())[index] ?? null; }
  removeItem(key) { this.memoryMap.delete(key); }
  setItem(key, value) { this.memoryMap.set(key, value); }
}

const storage = isNode ? new ServerStorageMock() : window.localStorage;

const toSnakeCase = (str) => {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase();
};


const getAppParamValue = (
  paramName,
  { defaultValue = undefined, removeFromUrl = false } = {}
) => {
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


const getAppParams = () => {
  if (!isNode && getAppParamValue("clear_access_token") === 'true') {
    storage.removeItem('supabase_access_token');
    storage.removeItem('sb-access-token');
    storage.removeItem('sb-refresh-token');
  }

  return {
    supabaseUrl: appConfig.supabaseUrl,
    anonKey: appConfig.supabaseKey,
    accessToken: getAppParamValue("access_token", { removeFromUrl: true }),
    fromUrl: getAppParamValue("from_url", { defaultValue: isNode ? '' : window.location.href }) || '',
    appBaseUrl: appConfig.appBaseUrl,
  };
};

export const appParams = {
  ...getAppParams()
};
