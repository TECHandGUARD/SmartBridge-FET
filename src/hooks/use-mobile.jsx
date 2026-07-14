/**
 * ====================================================================
 * VIEWPORT MONITORING LAYOUT ENGINE: SMARTBRIDGE FET
 * PURPOSE: DYNAMIC MOBILE MEDIA LOOKUPS WITHOUT DESIGN FLASHES
 * COMPLIANCE PROTECTION: OPTIMIZED RESIZE HANDLERS FOR MOBILE COMPATIBILITY
 * ====================================================================
 */
import * as React from "react";
import { useSyncExternalStore } from "react";

// ============================================================
// Configuration (Soft-coded for admin control)
// ============================================================

const appName = import.meta.env.VITE_APP_NAME || 'SmartBridge FET';
const MOBILE_BREAKPOINT = import.meta.env.VITE_MOBILE_BREAKPOINT 
  ? parseInt(import.meta.env.VITE_MOBILE_BREAKPOINT, 10) 
  : 768;

// ============================================================
// ✅ OPTIMIZED: Pre-computed media query string (stable reference)
// ============================================================

const MOBILE_MEDIA_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

// ============================================================
// ✅ OPTIMIZED: Store subscription with useSyncExternalStore
// ============================================================

/**
 * Subscribe to media query changes
 * Returns an unsubscribe function
 */
const subscribe = (callback) => {
  if (typeof window === "undefined") {
    return () => {};
  }

  const mediaQueryList = window.matchMedia(MOBILE_MEDIA_QUERY);
  
  const handleChange = (event) => {
    callback();
  };

  mediaQueryList.addEventListener("change", handleChange);
  
  return () => {
    mediaQueryList.removeEventListener("change", handleChange);
  };
};

/**
 * Get the current snapshot of the media query state
 */
const getSnapshot = () => {
  if (typeof window === "undefined") {
    return false;
  }
  return window.matchMedia(MOBILE_MEDIA_QUERY).matches;
};

// ============================================================
// ✅ OPTIMIZED: Server-side snapshot (no window object)
// ============================================================

const getServerSnapshot = () => false;

// ============================================================
// Main Hook
// ============================================================

export function useIsMobile() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
