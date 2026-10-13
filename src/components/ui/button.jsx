import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
const CONFIG = {
  VARIANTS: {
    DEFAULT: import.meta.env.VITE_BUTTON_VARIANT_DEFAULT || "bg-primary text-primary-foreground shadow hover:bg-primary/90",
    DESTRUCTIVE: import.meta.env.VITE_BUTTON_VARIANT_DESTRUCTIVE || "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
    OUTLINE: import.meta.env.VITE_BUTTON_VARIANT_OUTLINE || "border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground",
    SECONDARY: import.meta.env.VITE_BUTTON_VARIANT_SECONDARY || "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
    GHOST: import.meta.env.VITE_BUTTON_VARIANT_GHOST || "hover:bg-accent hover:text-accent-foreground",
    LINK: import.meta.env.VITE_BUTTON_VARIANT_LINK || "text-primary underline-offset-4 hover:underline",
    SUCCESS: import.meta.env.VITE_BUTTON_VARIANT_SUCCESS || "bg-green-600 text-white shadow-sm hover:bg-green-700",
    WARNING: import.meta.env.VITE_BUTTON_VARIANT_WARNING || "bg-amber-500 text-white shadow-sm hover:bg-amber-600",
    INFO: import.meta.env.VITE_BUTTON_VARIANT_INFO || "bg-blue-600 text-white shadow-sm hover:bg-blue-700",
    GOLD: import.meta.env.VITE_BUTTON_VARIANT_GOLD || "bg-gradient-to-r from-amber-400 to-amber-500 text-white shadow hover:shadow-md hover:from-amber-500 hover:to-amber-600",
    PREMIUM: import.meta.env.VITE_BUTTON_VARIANT_PREMIUM || "bg-gradient-to-r from-primary to-green-dark text-primary-foreground shadow hover:shadow-md hover:from-primary/90 hover:to-green-dark/90"
  },
  SIZES: {
    XS: import.meta.env.VITE_BUTTON_SIZE_XS || "h-6 rounded-md px-2 text-[10px]",
    SM: import.meta.env.VITE_BUTTON_SIZE_SM || "h-8 rounded-md px-3 text-xs",
    DEFAULT: import.meta.env.VITE_BUTTON_SIZE_DEFAULT || "h-9 px-4 py-2",
    LG: import.meta.env.VITE_BUTTON_SIZE_LG || "h-10 rounded-md px-8",
    XL: import.meta.env.VITE_BUTTON_SIZE_XL || "h-12 rounded-md px-10 text-base",
    ICON: import.meta.env.VITE_BUTTON_SIZE_ICON || "h-9 w-9",
    ICON_SM: import.meta.env.VITE_BUTTON_SIZE_ICON_SM || "h-8 w-8",
    ICON_LG: import.meta.env.VITE_BUTTON_SIZE_ICON_LG || "h-10 w-10"
  },
  BASE_STYLES: import.meta.env.VITE_BUTTON_BASE_STYLES || "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  SPINNER_SIZES: {
    xs: "h-3 w-3",
    sm: "h-3.5 w-3.5",
    default: "h-4 w-4",
    lg: "h-5 w-5",
    xl: "h-6 w-6",
    icon: "h-4 w-4",
    icon_sm: "h-3.5 w-3.5",
    icon_lg: "h-5 w-5"
  },
  ENABLE_LOADING: import.meta.env.VITE_BUTTON_ENABLE_LOADING !== "false",
  ENABLE_ICONS: import.meta.env.VITE_BUTTON_ENABLE_ICONS !== "false"
};
const buttonVariants = cva(CONFIG.BASE_STYLES, {
  variants: {
    variant: {
      default: CONFIG.VARIANTS.DEFAULT,
      destructive: CONFIG.VARIANTS.DESTRUCTIVE,
      outline: CONFIG.VARIANTS.OUTLINE,
      secondary: CONFIG.VARIANTS.SECONDARY,
      ghost: CONFIG.VARIANTS.GHOST,
      link: CONFIG.VARIANTS.LINK,
      success: CONFIG.VARIANTS.SUCCESS,
      warning: CONFIG.VARIANTS.WARNING,
      info: CONFIG.VARIANTS.INFO,
      gold: CONFIG.VARIANTS.GOLD,
      premium: CONFIG.VARIANTS.PREMIUM
    },
    size: {
      xs: CONFIG.SIZES.XS,
      sm: CONFIG.SIZES.SM,
      default: CONFIG.SIZES.DEFAULT,
      lg: CONFIG.SIZES.LG,
      xl: CONFIG.SIZES.XL,
      icon: CONFIG.SIZES.ICON,
      icon_sm: CONFIG.SIZES.ICON_SM,
      icon_lg: CONFIG.SIZES.ICON_LG
    },
    fullWidth: {
      true: "w-full"
    }
  },
  defaultVariants: {
    variant: "default",
    size: "default"
  }
});
const Button = React.forwardRef(/** @param {React.ComponentPropsWithoutRef<'button'> & {variant?: "default"|"destructive"|"outline"|"secondary"|"ghost"|"link"|"success"|"warning"|"info"|"gold"|"premium"|null; size?: "xs"|"sm"|"default"|"lg"|"xl"|"icon"|"icon_sm"|"icon_lg"|null; fullWidth?: boolean; leftIcon?: React.ReactNode; rightIcon?: React.ReactNode; loading?: boolean; loadingText?: string; asChild?: boolean}} props @param {React.ForwardedRef<any>} ref */
({
  className,
  variant,
  size,
  fullWidth = false,
  children,
  leftIcon,
  rightIcon,
  loading = false,
  loadingText,
  asChild = false,
  disabled,
  ...props
}, ref) => {
  const Comp = asChild ? Slot : "button";
  const isDisabled = disabled || loading;
  const spinnerSize = CONFIG.SPINNER_SIZES[size] || CONFIG.SPINNER_SIZES.default;
  let content = children;
  if (loading && loadingText) {
    content = loadingText;
  } else if (loading && typeof children === 'string') {
    content = children;
  }
  return <Comp className={cn(buttonVariants({
    variant,
    size,
    fullWidth
  }), className)} ref={ref} disabled={isDisabled} {...props}>
      {CONFIG.ENABLE_LOADING && loading && <Loader2 className={cn("animate-spin", spinnerSize)} aria-hidden="true" />}
      {!loading && CONFIG.ENABLE_ICONS && leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
      {content}
      {!loading && CONFIG.ENABLE_ICONS && rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
    </Comp>;
});
Button.displayName = "Button";
export { Button, buttonVariants };
