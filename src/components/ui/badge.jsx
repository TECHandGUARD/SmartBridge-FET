import * as React from "react";
import { cva } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
const CONFIG = {
  VARIANTS: {
    DEFAULT: import.meta.env.VITE_BADGE_VARIANT_DEFAULT || "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
    SECONDARY: import.meta.env.VITE_BADGE_VARIANT_SECONDARY || "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
    DESTRUCTIVE: import.meta.env.VITE_BADGE_VARIANT_DESTRUCTIVE || "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
    OUTLINE: import.meta.env.VITE_BADGE_VARIANT_OUTLINE || "text-foreground",
    SUCCESS: import.meta.env.VITE_BADGE_VARIANT_SUCCESS || "border-transparent bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50",
    WARNING: import.meta.env.VITE_BADGE_VARIANT_WARNING || "border-transparent bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50",
    INFO: import.meta.env.VITE_BADGE_VARIANT_INFO || "border-transparent bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50",
    GOLD: import.meta.env.VITE_BADGE_VARIANT_GOLD || "border-transparent bg-gradient-to-r from-amber-400 to-amber-500 text-white shadow hover:shadow-md",
    PREMIUM: import.meta.env.VITE_BADGE_VARIANT_PREMIUM || "border-transparent bg-gradient-to-r from-primary to-green-dark text-primary-foreground shadow hover:shadow-md"
  },
  SIZES: {
    SM: import.meta.env.VITE_BADGE_SIZE_SM || "px-1.5 py-0.5 text-[10px]",
    DEFAULT: import.meta.env.VITE_BADGE_SIZE_DEFAULT || "px-2.5 py-0.5 text-xs",
    LG: import.meta.env.VITE_BADGE_SIZE_LG || "px-3 py-1 text-sm"
  },
  SHAPES: {
    DEFAULT: import.meta.env.VITE_BADGE_SHAPE_DEFAULT || "rounded-md",
    PILL: import.meta.env.VITE_BADGE_SHAPE_PILL || "rounded-full"
  },
  BASE_STYLES: import.meta.env.VITE_BADGE_BASE_STYLES || "inline-flex items-center gap-1 border font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  ENABLE_DISMISS: import.meta.env.VITE_BADGE_ENABLE_DISMISS !== "false",
  ENABLE_ICONS: import.meta.env.VITE_BADGE_ENABLE_ICONS !== "false"
};
const badgeVariants = cva(CONFIG.BASE_STYLES, {
  variants: {
    variant: {
      default: CONFIG.VARIANTS.DEFAULT,
      secondary: CONFIG.VARIANTS.SECONDARY,
      destructive: CONFIG.VARIANTS.DESTRUCTIVE,
      outline: CONFIG.VARIANTS.OUTLINE,
      success: CONFIG.VARIANTS.SUCCESS,
      warning: CONFIG.VARIANTS.WARNING,
      info: CONFIG.VARIANTS.INFO,
      gold: CONFIG.VARIANTS.GOLD,
      premium: CONFIG.VARIANTS.PREMIUM
    },
    size: {
      sm: CONFIG.SIZES.SM,
      default: CONFIG.SIZES.DEFAULT,
      lg: CONFIG.SIZES.LG
    },
    shape: {
      default: CONFIG.SHAPES.DEFAULT,
      pill: CONFIG.SHAPES.PILL
    }
  },
  defaultVariants: {
    variant: "default",
    size: "default",
    shape: "default"
  }
});
function Badge({
  className,
  variant,
  size,
  shape,
  icon,
  children,
  dismissible = false,
  onDismiss,
  ...props
}) {
  const [dismissed, setDismissed] = React.useState(false);
  if (dismissed) return null;
  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };
  const showDismiss = dismissible && CONFIG.ENABLE_DISMISS;
  const showIcon = icon && CONFIG.ENABLE_ICONS;
  return <div className={cn(badgeVariants({
    variant,
    size,
    shape
  }), showDismiss ? "pr-1" : "", className)} {...props}>
      {showIcon && <span className="flex-shrink-0">{icon}</span>}
      {children}
      {showDismiss && <button onClick={handleDismiss} className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 hover:text-foreground/80 transition-colors focus:outline-none focus:ring-1 focus:ring-ring" aria-label="Dismiss badge">
          <X className="h-3 w-3" />
        </button>}
    </div>;
}
export { Badge, badgeVariants };
