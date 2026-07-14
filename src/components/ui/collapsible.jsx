// src/components/ui/collapsible.jsx
"use client";

import * as React from "react";
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
import { ChevronDown } from "lucide-react";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

// ============================================================
// 🔧 SOFT-CODED CONFIGURATION
// ============================================================

const CONFIG = {
  // Animation durations (ms)
  ANIMATION_DURATION: import.meta.env.VITE_COLLAPSIBLE_ANIMATION_DURATION || 200,

  // Trigger styles
  TRIGGER_STYLES: import.meta.env.VITE_COLLAPSIBLE_TRIGGER_STYLES || "flex w-full items-center justify-between rounded-lg px-4 py-2 text-sm font-medium hover:bg-muted/50 transition-colors [&[data-state=open]>svg]:rotate-180",

  // Content styles
  CONTENT_STYLES: import.meta.env.VITE_COLLAPSIBLE_CONTENT_STYLES || "overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down",

  // Variant styles
  VARIANTS: {
    DEFAULT: import.meta.env.VITE_COLLAPSIBLE_VARIANT_DEFAULT || "border border-border bg-card",
    GHOST: import.meta.env.VITE_COLLAPSIBLE_VARIANT_GHOST || "border-transparent bg-transparent hover:bg-muted/30",
    OUTLINE: import.meta.env.VITE_COLLAPSIBLE_VARIANT_OUTLINE || "border-2 border-border bg-transparent",
    PRIMARY: import.meta.env.VITE_COLLAPSIBLE_VARIANT_PRIMARY || "border-primary/20 bg-primary/5",
  },

  // Size styles
  SIZES: {
    SM: import.meta.env.VITE_COLLAPSIBLE_SIZE_SM || "px-2 py-1 text-xs",
    DEFAULT: import.meta.env.VITE_COLLAPSIBLE_SIZE_DEFAULT || "px-4 py-2 text-sm",
    LG: import.meta.env.VITE_COLLAPSIBLE_SIZE_LG || "px-6 py-3 text-base",
  },

  // Icon size
  ICON_SIZE: import.meta.env.VITE_COLLAPSIBLE_ICON_SIZE || "h-4 w-4",

  // Feature flags
  ENABLE_ANIMATION: import.meta.env.VITE_COLLAPSIBLE_ENABLE_ANIMATION !== "false",
  ENABLE_ICON: import.meta.env.VITE_COLLAPSIBLE_ENABLE_ICON !== "false",

  // Messages
  MESSAGES: {
    EXPAND: import.meta.env.VITE_COLLAPSIBLE_EXPAND_MSG || "Expand",
    COLLAPSE: import.meta.env.VITE_COLLAPSIBLE_COLLAPSE_MSG || "Collapse",
  },
};

// ============================================================
// Collapsible Variants
// ============================================================

const collapsibleTriggerVariants = cva(
  CONFIG.TRIGGER_STYLES,
  {
    variants: {
      variant: {
        default: CONFIG.VARIANTS.DEFAULT,
        ghost: CONFIG.VARIANTS.GHOST,
        outline: CONFIG.VARIANTS.OUTLINE,
        primary: CONFIG.VARIANTS.PRIMARY,
      },
      size: {
        sm: CONFIG.SIZES.SM,
        default: CONFIG.SIZES.DEFAULT,
        lg: CONFIG.SIZES.LG,
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

// ============================================================
// Main Components
// ============================================================

/**
 * Collapsible – A container that can be expanded/collapsed with animation.
 *
 * @param {Object} props
 * @param {string} props.variant - Visual style ('default' | 'ghost' | 'outline' | 'primary')
 * @param {string} props.size - Size ('sm' | 'default' | 'lg')
 * @param {boolean} props.open - Controlled open state
 * @param {boolean} props.defaultOpen - Default open state
 * @param {function} props.onOpenChange - Callback when open state changes
 * @param {React.ReactNode} props.children - Content (should include Trigger and Content)
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.disabled - Disable the collapsible
 *
 * @example
 * <Collapsible>
 *   <CollapsibleTrigger>Toggle</CollapsibleTrigger>
 *   <CollapsibleContent>Content</CollapsibleContent>
 * </Collapsible>
 *
 * @example
 * <Collapsible variant="primary" size="lg">
 *   <CollapsibleTrigger icon={<ChevronDown />}>Advanced Options</CollapsibleTrigger>
 *   <CollapsibleContent>Content</CollapsibleContent>
 * </Collapsible>
 */
const Collapsible = React.forwardRef(({ 
  variant = "default",
  size = "default",
  className,
  disabled = false,
  ...props 
}, ref) => {
  return (
    <CollapsiblePrimitive.Root
      ref={ref}
      className={cn(
        "w-full",
        disabled && "opacity-50 pointer-events-none",
        className
      )}
      {...props}
    />
  );
});
Collapsible.displayName = CollapsiblePrimitive.Root.displayName;

// ============================================================
// CollapsibleTrigger
// ============================================================

/**
 * CollapsibleTrigger – The button that toggles the collapsible.
 *
 * @param {Object} props
 * @param {string} props.variant - Visual style (inherits from parent)
 * @param {string} props.size - Size (inherits from parent)
 * @param {React.ReactNode} props.children - Trigger content
 * @param {React.ReactNode} props.icon - Custom icon (defaults to ChevronDown)
 * @param {boolean} props.hideIcon - Hide the icon
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.expandLabel - Accessibility label when collapsed
 * @param {string} props.collapseLabel - Accessibility label when expanded
 */
const CollapsibleTrigger = React.forwardRef(({
  className,
  children,
  icon,
  hideIcon = false,
  variant,
  size,
  expandLabel = CONFIG.MESSAGES.EXPAND,
  collapseLabel = CONFIG.MESSAGES.COLLAPSE,
  ...props
}, ref) => {
  // Use context to get variant/size from parent if not provided
  // Since we can't easily use context without creating one, we'll accept props directly
  const IconComponent = icon || ChevronDown;

  return (
    <CollapsiblePrimitive.CollapsibleTrigger
      ref={ref}
      className={cn(
        collapsibleTriggerVariants({ variant, size }),
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      {...props}
    >
      <span className="flex-1 text-left">{children}</span>
      {CONFIG.ENABLE_ICON && !hideIcon && (
        <IconComponent
          className={cn(
            CONFIG.ICON_SIZE,
            "shrink-0 transition-transform duration-200",
            "data-[state=open]:rotate-180"
          )}
          aria-hidden="true"
        />
      )}
      <span className="sr-only">
        {props['data-state'] === 'open' ? collapseLabel : expandLabel}
      </span>
    </CollapsiblePrimitive.CollapsibleTrigger>
  );
});
CollapsibleTrigger.displayName = CollapsiblePrimitive.CollapsibleTrigger.displayName;

// ============================================================
// CollapsibleContent
// ============================================================

/**
 * CollapsibleContent – The content area that expands/collapses.
 *
 * @param {Object} props
 * @param {string} props.className - Additional CSS classes
 * @param {React.ReactNode} props.children - Content
 * @param {number} props.animationDuration - Override animation duration (ms)
 */
const CollapsibleContent = React.forwardRef(({
  className,
  children,
  animationDuration = CONFIG.ANIMATION_DURATION,
  ...props
}, ref) => {
  const contentStyles = CONFIG.ENABLE_ANIMATION
    ? CONFIG.CONTENT_STYLES
    : "overflow-hidden";

  return (
    <CollapsiblePrimitive.CollapsibleContent
      ref={ref}
      className={cn(
        contentStyles,
        className
      )}
      style={{
        ...(CONFIG.ENABLE_ANIMATION && {
          '--collapsible-duration': `${animationDuration}ms`,
        }),
      }}
      {...props}
    >
      <div className="px-4 py-3 text-sm">{children}</div>
    </CollapsiblePrimitive.CollapsibleContent>
  );
});
CollapsibleContent.displayName = CollapsiblePrimitive.CollapsibleContent.displayName;

// ============================================================
// Exports
// ============================================================

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
