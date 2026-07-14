import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// ============================================================
// Configuration (Soft-coded for admin control)
// ============================================================

const appName = import.meta.env.VITE_APP_NAME || 'SmartBridge FET';

// ============================================================
// cn: Merge Tailwind CSS classes
// ============================================================

/**
 * Merges Tailwind CSS classes with clsx and tailwind-merge
 * 
 * @param {...any} inputs - Class names or conditional objects
 * @returns {string} Merged class string
 * 
 * @example
 * cn('bg-red-500', 'text-white', { 'hidden': isHidden })
 * // => 'bg-red-500 text-white'
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// ============================================================
// ✅ FIXED: isIframe with SSR compatibility
// ============================================================

/**
 * Check if the application is running inside an iframe
 * 
 * @returns {boolean} True if running inside an iframe
 * 
 * @example
 * if (isIframe()) {
 *   // Handle iframe-specific behavior
 * }
 */
export const isIframe = typeof window !== 'undefined' && window.self !== window.top;

// ============================================================
// ✅ NEW: Check if running on server (SSR)
// ============================================================

/**
 * Check if the code is running on the server (SSR)
 * 
 * @returns {boolean} True if running on server
 */
export const isServer = typeof window === 'undefined';

// ============================================================
// ✅ NEW: Check if running on client (browser)
// ============================================================

/**
 * Check if the code is running on the client (browser)
 * 
 * @returns {boolean} True if running on client
 */
export const isClient = typeof window !== 'undefined';

// ============================================================
// ✅ NEW: Safe localStorage access
// ============================================================

/**
 * Safely get an item from localStorage
 * 
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value if key not found
 * @returns {*} Stored value or default
 */
export const safeLocalStorageGet = (key, defaultValue = null) => {
  if (!isClient) return defaultValue;
  
  try {
    const item = localStorage.getItem(key);
    return item !== null ? item : defaultValue;
  } catch (_) {
    return defaultValue;
  }
};

/**
 * Safely set an item in localStorage
 * 
 * @param {string} key - Storage key
 * @param {*} value - Value to store
 * @returns {boolean} True if successful
 */
export const safeLocalStorageSet = (key, value) => {
  if (!isClient) return false;
  
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (_) {
    return false;
  }
};

/**
 * Safely remove an item from localStorage
 * 
 * @param {string} key - Storage key
 * @returns {boolean} True if successful
 */
export const safeLocalStorageRemove = (key) => {
  if (!isClient) return false;
  
  try {
    localStorage.removeItem(key);
    return true;
  } catch (_) {
    return false;
  }
};

/**
 * Safely clear localStorage
 * 
 * @returns {boolean} True if successful
 */
export const safeLocalStorageClear = () => {
  if (!isClient) return false;
  
  try {
    localStorage.clear();
    return true;
  } catch (_) {
    return false;
  }
};

// ============================================================
// ✅ NEW: Safe JSON parsing
// ============================================================

/**
 * Safely parse JSON with fallback
 * 
 * @param {string} jsonString - JSON string to parse
 * @param {*} fallback - Fallback value if parsing fails
 * @returns {*} Parsed object or fallback
 */
export const safeJsonParse = (jsonString, fallback = null) => {
  if (!jsonString || typeof jsonString !== 'string') return fallback;
  
  try {
    return JSON.parse(jsonString);
  } catch (_) {
    return fallback;
  }
};

/**
 * Safely stringify JSON with fallback
 * 
 * @param {*} value - Value to stringify
 * @param {*} fallback - Fallback value if stringifying fails
 * @returns {string} JSON string or fallback
 */
export const safeJsonStringify = (value, fallback = '{}') => {
  try {
    return JSON.stringify(value);
  } catch (_) {
    return fallback;
  }
};

// ============================================================
// ✅ NEW: URL helpers
// ============================================================

/**
 * Get the base URL of the application
 * 
 * @returns {string} Base URL
 */
export const getBaseUrl = () => {
  if (!isClient) return '';
  return `${window.location.protocol}//${window.location.host}`;
};

/**
 * Get the current pathname
 * 
 * @returns {string} Current pathname
 */
export const getPathname = () => {
  if (!isClient) return '';
  return window.location.pathname;
};

/**
 * Check if a URL is external
 * 
 * @param {string} url - URL to check
 * @returns {boolean} True if external URL
 */
export const isExternalUrl = (url) => {
  if (!url) return false;
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:');
};

// ============================================================
// ✅ NEW: String helpers
// ============================================================

/**
 * Truncate a string to a maximum length
 * 
 * @param {string} str - String to truncate
 * @param {number} maxLength - Maximum length
 * @param {string} suffix - Suffix to add (default: '…')
 * @returns {string} Truncated string
 */
export const truncate = (str, maxLength = 50, suffix = '…') => {
  if (!str || str.length <= maxLength) return str;
  return str.slice(0, maxLength) + suffix;
};

/**
 * Capitalize the first letter of a string
 * 
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Convert a string to slug format
 * 
 * @param {string} str - String to slugify
 * @returns {string} Slugified string
 */
export const slugify = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};
