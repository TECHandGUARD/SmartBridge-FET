/**
 * ====================================================================
 * VIEWPORT MONITORING LAYOUT ENGINE: SMARTBRIDGE FET
 * PURPOSE: DYNAMIC MOBILE MEDIA LOOKUPS WITHOUT DESIGN FLASHES
 * COMPLIANCE PROTECTION: OPTIMIZED RESIZE HANDLERS FOR MOBILE COMPATIBILITY
 * ====================================================================
 */
import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  // FIXED: Default to false instead of undefined to provide an explicit initial boolean state
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    // Return early if executed within server-side compilation trees
    if (typeof window === "undefined") return;

    const mediaQueryList = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    
    // FIXED: Simplified evaluator matches the strict MediaQuery event state
    const handleMediaQueryChange = (event) => {
      setIsMobile(event.matches);
    };

    // Initialize state accurately on Mount pass
    setIsMobile(mediaQueryList.matches);

    // Bind event tracking hooks securely across all modern viewports
    mediaQueryList.addEventListener("change", handleMediaQueryChange);
    
    return () => {
      mediaQueryList.removeEventListener("change", handleMediaQueryChange);
    };
  }, []);

  return isMobile;
}
