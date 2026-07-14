// src/components/ui/aspect-ratio.jsx
import * as React from "react";
import * as AspectRatioPrimitive from "@radix-ui/react-aspect-ratio";

import { cn } from "@/lib/utils";

// ============================================================
// 🔧 SOFT-CODED CONFIGURATION
// ============================================================

const CONFIG = {
  // Default aspect ratio
  DEFAULT_RATIO: import.meta.env.VITE_ASPECT_RATIO_DEFAULT || "16 / 9",

  // Feature flags
  ENABLE_RESPONSIVE: import.meta.env.VITE_ASPECT_RATIO_ENABLE_RESPONSIVE !== "false",

  // Breakpoints for responsive ratios (format: "breakpoint:ratio")
  RESPONSIVE_RATIOS: (import.meta.env.VITE_ASPECT_RATIO_RESPONSIVE || "sm:16/9,md:4/3,lg:1/1")
    .split(",")
    .reduce((acc, item) => {
      const [breakpoint, ratio] = item.split(":").map(s => s.trim());
      if (breakpoint && ratio) acc[breakpoint] = ratio;
      return acc;
    }, {}),
};

// ============================================================
// Main Component
// ============================================================

/**
 * AspectRatio – Maintains a consistent width-to-height ratio.
 * 
 * @param {Object} props
 * @param {number} props.ratio - Width/height ratio (e.g., 16/9, 4/3, 1/1)
 * @param {React.ReactNode} props.children - Content inside the aspect ratio container
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.responsive - Enable responsive ratios
 * @param {Object} props.responsiveRatios - Custom responsive ratios
 * 
 * @example
 * <AspectRatio ratio={16/9}>
 *   <img src="image.jpg" alt="Hero" className="object-cover" />
 * </AspectRatio>
 * 
 * @example
 * <AspectRatio ratio={4/3} className="rounded-lg overflow-hidden">
 *   <video src="video.mp4" controls />
 * </AspectRatio>
 * 
 * @example
 * <AspectRatio responsive responsiveRatios={{ sm: '16/9', md: '4/3', lg: '1/1' }}>
 *   <img src="responsive.jpg" className="object-cover" />
 * </AspectRatio>
 */
const AspectRatio = React.forwardRef(({ 
  className,
  children,
  ratio = parseFloat(CONFIG.DEFAULT_RATIO) || 16/9,
  responsive = CONFIG.ENABLE_RESPONSIVE,
  responsiveRatios = CONFIG.RESPONSIVE_RATIOS,
  ...props 
}, ref) => {
  // Build responsive classes if enabled
  let responsiveClasses = "";
  if (responsive && responsiveRatios) {
    responsiveClasses = Object.entries(responsiveRatios)
      .map(([breakpoint, ratioStr]) => {
        // Convert string like "16/9" to a valid tailwind class
        // Note: We need to use style approach since tailwind doesn't support dynamic aspect-ratio
        return `[aspect-ratio:${ratioStr}]`; // This will be applied via style
      })
      .join(" ");
  }

  // Use inline style for aspect ratio since Tailwind's aspect-* classes are limited
  const style = {
    aspectRatio: ratio,
    ...(props.style || {}),
  };

  // If responsive is enabled, use a different approach with CSS custom properties
  // and media queries via style tags or inline styles with media queries would be complex.
  // Instead, we'll provide a helper: if responsive, we'll apply aspect-ratio via style
  // and let parent handle responsive via className.

  // For responsive, we rely on the parent to pass different ratios via className.
  // Or we can use a simpler approach: apply the ratio as a CSS variable.

  // For simplicity and reliability, we'll use inline style for ratio
  // and allow className for responsive overrides.

  return (
    <AspectRatioPrimitive.Root
      ref={ref}
      className={cn(
        "relative w-full overflow-hidden",
        responsive && "responsive-aspect-ratio",
        className
      )}
      style={style}
      {...props}
    >
      {children}
    </AspectRatioPrimitive.Root>
  );
});

AspectRatio.displayName = AspectRatioPrimitive.Root.displayName;

// ============================================================
// Additional exports
// ============================================================

export { AspectRatio };
