// src/components/ui/card.jsx
import * as React from "react";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

// ============================================================
// 🔧 SOFT-CODED CONFIGURATION
// ============================================================

const CONFIG = {
  // Variant styles (Tailwind classes)
  VARIANTS: {
    DEFAULT: import.meta.env.VITE_CARD_VARIANT_DEFAULT || "bg-card text-card-foreground border",
    OUTLINE: import.meta.env.VITE_CARD_VARIANT_OUTLINE || "bg-transparent border-2",
    GHOST: import.meta.env.VITE_CARD_VARIANT_GHOST || "bg-transparent border-transparent shadow-none",
    PRIMARY: import.meta.env.VITE_CARD_VARIANT_PRIMARY || "bg-primary/5 border-primary/20 text-primary-foreground",
    DESTRUCTIVE: import.meta.env.VITE_CARD_VARIANT_DESTRUCTIVE || "bg-destructive/5 border-destructive/20 text-destructive-foreground",
    GLASS: import.meta.env.VITE_CARD_VARIANT_GLASS || "glass border-white/20 dark:border-white/10",
    GRADIENT: import.meta.env.VITE_CARD_VARIANT_GRADIENT || "bg-gradient-to-br from-card to-muted/50 border",
  },

  // Size styles (padding)
  SIZES: {
    SM: import.meta.env.VITE_CARD_SIZE_SM || "p-3",
    DEFAULT: import.meta.env.VITE_CARD_SIZE_DEFAULT || "p-6",
    LG: import.meta.env.VITE_CARD_SIZE_LG || "p-8",
  },

  // Header sizes
  HEADER_SIZES: {
    SM: "p-3 pb-1.5",
    DEFAULT: "p-6 pb-3",
    LG: "p-8 pb-4",
  },

  // Content sizes
  CONTENT_SIZES: {
    SM: "p-3 pt-0",
    DEFAULT: "p-6 pt-0",
    LG: "p-8 pt-0",
  },

  // Footer sizes
  FOOTER_SIZES: {
    SM: "p-3 pt-1.5",
    DEFAULT: "p-6 pt-3",
    LG: "p-8 pt-4",
  },

  // Base styles
  BASE_STYLES: import.meta.env.VITE_CARD_BASE_STYLES || "rounded-xl shadow",

  // Hover styles
  HOVER_STYLES: import.meta.env.VITE_CARD_HOVER_STYLES || "hover:shadow-md hover:-translate-y-0.5 transition-all duration-200",

  // Feature flags
  ENABLE_HOVER: import.meta.env.VITE_CARD_ENABLE_HOVER !== "false",
  ENABLE_GLASS: import.meta.env.VITE_CARD_ENABLE_GLASS !== "false",
};

// ============================================================
// Card Variants
// ============================================================

const cardVariants = cva(CONFIG.BASE_STYLES, {
  variants: {
    variant: {
      default: CONFIG.VARIANTS.DEFAULT,
      outline: CONFIG.VARIANTS.OUTLINE,
      ghost: CONFIG.VARIANTS.GHOST,
      primary: CONFIG.VARIANTS.PRIMARY,
      destructive: CONFIG.VARIANTS.DESTRUCTIVE,
      glass: CONFIG.VARIANTS.GLASS,
      gradient: CONFIG.VARIANTS.GRADIENT,
    },
    size: {
      sm: CONFIG.SIZES.SM,
      default: CONFIG.SIZES.DEFAULT,
      lg: CONFIG.SIZES.LG,
    },
    hoverable: {
      true: CONFIG.HOVER_STYLES,
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
    hoverable: false,
  },
});

// ============================================================
// Main Components
// ============================================================

/**
 * Card – A versatile container for content.
 *
 * @param {Object} props
 * @param {string} props.variant - Visual style ('default' | 'outline' | 'ghost' | 'primary' | 'destructive' | 'glass' | 'gradient')
 * @param {string} props.size - Padding size ('sm' | 'default' | 'lg')
 * @param {boolean} props.hoverable - Enable hover effects
 * @param {string} props.className - Additional CSS classes
 * @param {React.ReactNode} props.children - Card content
 *
 * @example
 * <Card>
 *   <CardHeader>
 *     <CardTitle>Title</CardTitle>
 *     <CardDescription>Description</CardDescription>
 *   </CardHeader>
 *   <CardContent>Content</CardContent>
 *   <CardFooter>Footer</CardFooter>
 * </Card>
 */
const Card = React.forwardRef(({ className, variant, size, hoverable = false, ...props }, ref) => {
  const isHoverable = CONFIG.ENABLE_HOVER && hoverable;

  return (
    <div
      ref={ref}
      className={cn(
        cardVariants({ variant, size, hoverable: isHoverable }),
        className
      )}
      {...props}
    />
  );
});
Card.displayName = "Card";

// ============================================================
// CardHeader
// ============================================================

const CardHeader = React.forwardRef(({ className, size = "default", ...props }, ref) => {
  const sizeClass = CONFIG.HEADER_SIZES[size] || CONFIG.HEADER_SIZES.DEFAULT;

  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-col space-y-1.5",
        sizeClass,
        className
      )}
      {...props}
    />
  );
});
CardHeader.displayName = "CardHeader";

// ============================================================
// CardTitle
// ============================================================

const CardTitle = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "font-semibold leading-none tracking-tight",
      CONFIG.CARD_TITLE_STYLES || "text-foreground",
      className
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

// ============================================================
// CardDescription
// ============================================================

const CardDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "text-sm text-muted-foreground",
      className
    )}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

// ============================================================
// CardContent
// ============================================================

const CardContent = React.forwardRef(({ className, size = "default", ...props }, ref) => {
  const sizeClass = CONFIG.CONTENT_SIZES[size] || CONFIG.CONTENT_SIZES.DEFAULT;

  return (
    <div
      ref={ref}
      className={cn(sizeClass, className)}
      {...props}
    />
  );
});
CardContent.displayName = "CardContent";

// ============================================================
// CardFooter
// ============================================================

const CardFooter = React.forwardRef(({ className, size = "default", ...props }, ref) => {
  const sizeClass = CONFIG.FOOTER_SIZES[size] || CONFIG.FOOTER_SIZES.DEFAULT;

  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center",
        sizeClass,
        className
      )}
      {...props}
    />
  );
});
CardFooter.displayName = "CardFooter";

// ============================================================
// Exports
// ============================================================

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
