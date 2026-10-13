"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
const CONFIG = {
  SIZES: {
    SM: import.meta.env.VITE_AVATAR_SIZE_SM || "h-8 w-8 text-xs",
    DEFAULT: import.meta.env.VITE_AVATAR_SIZE_DEFAULT || "h-10 w-10 text-sm",
    LG: import.meta.env.VITE_AVATAR_SIZE_LG || "h-12 w-12 text-base",
    XL: import.meta.env.VITE_AVATAR_SIZE_XL || "h-16 w-16 text-xl",
    XXL: import.meta.env.VITE_AVATAR_SIZE_XXL || "h-20 w-20 text-2xl"
  },
  SHAPES: {
    CIRCLE: import.meta.env.VITE_AVATAR_SHAPE_CIRCLE || "rounded-full",
    SQUARE: import.meta.env.VITE_AVATAR_SHAPE_SQUARE || "rounded-lg",
    ROUNDED: import.meta.env.VITE_AVATAR_SHAPE_ROUNDED || "rounded-xl"
  },
  FALLBACK_COLORS: (import.meta.env.VITE_AVATAR_FALLBACK_COLORS || "bg-primary/10 text-primary, bg-blue-100 text-blue-700, bg-green-100 text-green-700, bg-amber-100 text-amber-700, bg-purple-100 text-purple-700, bg-pink-100 text-pink-700, bg-indigo-100 text-indigo-700").split(",").map(c => c.trim()),
  STATUS_COLORS: {
    ONLINE: import.meta.env.VITE_AVATAR_STATUS_ONLINE || "bg-green-500",
    OFFLINE: import.meta.env.VITE_AVATAR_STATUS_OFFLINE || "bg-gray-400",
    AWAY: import.meta.env.VITE_AVATAR_STATUS_AWAY || "bg-amber-500",
    BUSY: import.meta.env.VITE_AVATAR_STATUS_BUSY || "bg-red-500"
  },
  STATUS_SIZES: {
    SM: import.meta.env.VITE_AVATAR_STATUS_SIZE_SM || "w-2 h-2",
    DEFAULT: import.meta.env.VITE_AVATAR_STATUS_SIZE_DEFAULT || "w-2.5 h-2.5",
    LG: import.meta.env.VITE_AVATAR_STATUS_SIZE_LG || "w-3 h-3",
    XL: import.meta.env.VITE_AVATAR_STATUS_SIZE_XL || "w-4 h-4",
    XXL: import.meta.env.VITE_AVATAR_STATUS_SIZE_XXL || "w-5 h-5"
  },
  ENABLE_STATUS: import.meta.env.VITE_AVATAR_ENABLE_STATUS !== "false",
  ENABLE_GROUP: import.meta.env.VITE_AVATAR_ENABLE_GROUP !== "false"
};
const avatarVariants = cva("relative flex shrink-0 overflow-hidden", {
  variants: {
    size: {
      sm: CONFIG.SIZES.SM,
      default: CONFIG.SIZES.DEFAULT,
      lg: CONFIG.SIZES.LG,
      xl: CONFIG.SIZES.XL,
      xxl: CONFIG.SIZES.XXL
    },
    shape: {
      circle: CONFIG.SHAPES.CIRCLE,
      square: CONFIG.SHAPES.SQUARE,
      rounded: CONFIG.SHAPES.ROUNDED
    }
  },
  defaultVariants: {
    size: "default",
    shape: "circle"
  }
});
const Avatar = React.forwardRef(/** @param {React.ComponentPropsWithoutRef<'div'> & {size?: "sm"|"default"|"lg"|"xl"|"xxl"|null; shape?: "circle"|"square"|"rounded"|null; status?: any; statusPosition?: string}} props @param {React.ForwardedRef<any>} ref */
({
  className,
  size = "default",
  shape = "circle",
  status,
  statusPosition = "bottom-right",
  children,
  ...props
}, ref) => {
  const statusSizeMap = {
    sm: CONFIG.STATUS_SIZES.SM,
    default: CONFIG.STATUS_SIZES.DEFAULT,
    lg: CONFIG.STATUS_SIZES.LG,
    xl: CONFIG.STATUS_SIZES.XL,
    xxl: CONFIG.STATUS_SIZES.XXL
  };
  const statusPositionMap = {
    "bottom-right": "bottom-0 right-0",
    "bottom-left": "bottom-0 left-0",
    "top-right": "top-0 right-0",
    "top-left": "top-0 left-0"
  };
  const statusColorMap = {
    online: CONFIG.STATUS_COLORS.ONLINE,
    offline: CONFIG.STATUS_COLORS.OFFLINE,
    away: CONFIG.STATUS_COLORS.AWAY,
    busy: CONFIG.STATUS_COLORS.BUSY
  };
  const showStatus = CONFIG.ENABLE_STATUS && status && statusColorMap[status];
  return <div className="relative inline-block">
      <AvatarPrimitive.Root ref={ref} className={cn(avatarVariants({
      size,
      shape
    }), "bg-muted", className)} {...props}>
        {children}
      </AvatarPrimitive.Root>

      {showStatus && <span className={cn("absolute border-2 border-background rounded-full", statusPositionMap[statusPosition] || "bottom-0 right-0", statusSizeMap[size] || CONFIG.STATUS_SIZES.DEFAULT, statusColorMap[status] || CONFIG.STATUS_COLORS.ONLINE)} aria-label={`Status: ${status}`} />}
    </div>;
});
Avatar.displayName = AvatarPrimitive.Root.displayName;
const AvatarImage = React.forwardRef(/** @param {React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>} props @param {React.ForwardedRef<any>} ref */
({
  className,
  ...props
}, ref) => <AvatarPrimitive.Image ref={ref} className={cn("aspect-square h-full w-full object-cover", className)} {...props} />);
AvatarImage.displayName = AvatarPrimitive.Image.displayName;
const AvatarFallback = React.forwardRef(/** @param {React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback> & {colorIndex?: number}} props @param {React.ForwardedRef<any>} ref */
({
  className,
  colorIndex = 0,
  ...props
}, ref) => {
  const colors = CONFIG.FALLBACK_COLORS;
  const fallbackColor = colors[colorIndex % colors.length] || colors[0];
  return <AvatarPrimitive.Fallback ref={ref} className={cn("flex h-full w-full items-center justify-center font-medium uppercase", fallbackColor, className)} {...props} />;
});
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;
const AvatarGroup = React.forwardRef(/** @param {React.ComponentPropsWithoutRef<'div'> & {size?: "sm"|"default"|"lg"|"xl"|"xxl"|null; moreIndicator?: any; spacing?: number; max?: number}} props @param {React.ForwardedRef<any>} ref */
({
  children,
  max = 5,
  size = "default",
  className,
  moreIndicator,
  spacing = 0.75,
  ...props
}, ref) => {
  if (!CONFIG.ENABLE_GROUP) {
    return <div className="flex flex-wrap gap-2">{children}</div>;
  }
  const childrenArray = React.Children.toArray(children);
  const visible = childrenArray.slice(0, max);
  const remaining = childrenArray.length - max;
  const spacingClass = `-ml-${spacing}`;
  const renderedAvatars = visible.map((child, index) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, {
        size: child.props.size || size,
        className: cn(index === 0 ? "ml-0" : `-ml-${spacing}`, child.props.className),
        ...child.props
      });
    }
    return child;
  });
  return <div ref={ref} className={cn("flex items-center", className)} {...props}>
      {renderedAvatars}
      {remaining > 0 && <div className={cn("flex items-center justify-center rounded-full bg-muted font-medium text-muted-foreground", "border-2 border-background", avatarVariants({
      size
    }))} style={{
      marginLeft: `-${spacing * 4}px`
    }}>
          {moreIndicator || <span className="text-xs font-semibold">+{remaining}</span>}
        </div>}
    </div>;
});
AvatarGroup.displayName = "AvatarGroup";
export { Avatar, AvatarImage, AvatarFallback, AvatarGroup };
