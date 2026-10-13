"use client";

import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";
import { cn } from "@/lib/utils";
const CONFIG = {
  DIRECTION: import.meta.env.VITE_DRAWER_DEFAULT_DIRECTION || "bottom",
  SHOULD_SCALE_BACKGROUND: import.meta.env.VITE_DRAWER_SHOULD_SCALE_BACKGROUND !== "false",
  OVERLAY_STYLES: import.meta.env.VITE_DRAWER_OVERLAY_STYLES || "fixed inset-0 z-50 bg-black/80",
  CONTENT_BASE_STYLES: import.meta.env.VITE_DRAWER_CONTENT_BASE_STYLES || "fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-[10px] border bg-background",
  SIZES: {
    SM: import.meta.env.VITE_DRAWER_SIZE_SM || "max-h-[40vh]",
    DEFAULT: import.meta.env.VITE_DRAWER_SIZE_DEFAULT || "max-h-[80vh]",
    LG: import.meta.env.VITE_DRAWER_SIZE_LG || "max-h-[95vh]",
    FULL: import.meta.env.VITE_DRAWER_SIZE_FULL || "max-h-[100vh]"
  },
  HANDLE_STYLES: import.meta.env.VITE_DRAWER_HANDLE_STYLES || "mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted",
  HEADER_STYLES: import.meta.env.VITE_DRAWER_HEADER_STYLES || "grid gap-1.5 p-4 text-center sm:text-left",
  FOOTER_STYLES: import.meta.env.VITE_DRAWER_FOOTER_STYLES || "mt-auto flex flex-col gap-2 p-4",
  TITLE_STYLES: import.meta.env.VITE_DRAWER_TITLE_STYLES || "text-lg font-semibold leading-none tracking-tight",
  DESCRIPTION_STYLES: import.meta.env.VITE_DRAWER_DESCRIPTION_STYLES || "text-sm text-muted-foreground",
  ANIMATION_DURATION: import.meta.env.VITE_DRAWER_ANIMATION_DURATION || "300ms",
  ENABLE_PORTAL: import.meta.env.VITE_DRAWER_ENABLE_PORTAL !== "false",
  ENABLE_HANDLE: import.meta.env.VITE_DRAWER_ENABLE_HANDLE !== "false"
};
const Drawer = ({
  shouldScaleBackground = CONFIG.SHOULD_SCALE_BACKGROUND,
  direction = CONFIG.DIRECTION,
  snapPoints,
  dismissible = true,
  ...props
}) => {
  return <DrawerPrimitive.Root shouldScaleBackground={shouldScaleBackground} direction={direction} snapPoints={snapPoints} dismissible={dismissible} {...props} />;
};
Drawer.displayName = "Drawer";
const DrawerTrigger = DrawerPrimitive.Trigger;
const DrawerPortal = DrawerPrimitive.Portal;
const DrawerClose = DrawerPrimitive.Close;
const DrawerOverlay = React.forwardRef(({
  className,
  dim = true,
  ...props
}, ref) => <DrawerPrimitive.Overlay ref={ref} className={cn(CONFIG.OVERLAY_STYLES, !dim && "bg-transparent backdrop-blur-none", className)} {...props} />);
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName;
const DrawerContent = React.forwardRef(({
  className,
  children,
  size = "default",
  handle,
  hideHandle = false,
  portal = CONFIG.ENABLE_PORTAL,
  direction = CONFIG.DIRECTION,
  ...props
}, ref) => {
  const sizeClass = CONFIG.SIZES[size] || CONFIG.SIZES.DEFAULT;
  const HandleElement = handle || <div className={cn(CONFIG.HANDLE_STYLES)} />;
  const directionClasses = {
    bottom: "inset-x-0 bottom-0 mt-24 rounded-t-[10px]",
    top: "inset-x-0 top-0 mt-0 rounded-b-[10px]",
    left: "inset-y-0 left-0 w-[80vw] max-w-md rounded-r-[10px]",
    right: "inset-y-0 right-0 w-[80vw] max-w-md rounded-l-[10px]"
  };
  const contentClass = cn(CONFIG.CONTENT_BASE_STYLES, directionClasses[direction] || directionClasses.bottom, sizeClass, className);
  const ContentWrapper = portal ? DrawerPrimitive.Portal : React.Fragment;
  const ContentElement = DrawerPrimitive.Content;
  return <ContentWrapper>
      <DrawerOverlay />
      <ContentElement ref={ref} className={contentClass} {...props}>
        {CONFIG.ENABLE_HANDLE && !hideHandle && HandleElement}
        {children}
      </ContentElement>
    </ContentWrapper>;
});
DrawerContent.displayName = DrawerPrimitive.Content.displayName;
const DrawerHeader = ({
  className,
  ...props
}) => <div className={cn(CONFIG.HEADER_STYLES, className)} {...props} />;
DrawerHeader.displayName = "DrawerHeader";
const DrawerFooter = ({
  className,
  ...props
}) => <div className={cn(CONFIG.FOOTER_STYLES, className)} {...props} />;
DrawerFooter.displayName = "DrawerFooter";
const DrawerTitle = React.forwardRef(({
  className,
  ...props
}, ref) => <DrawerPrimitive.Title ref={ref} className={cn(CONFIG.TITLE_STYLES, className)} {...props} />);
DrawerTitle.displayName = DrawerPrimitive.Title.displayName;
const DrawerDescription = React.forwardRef(({
  className,
  ...props
}, ref) => <DrawerPrimitive.Description ref={ref} className={cn(CONFIG.DESCRIPTION_STYLES, className)} {...props} />);
DrawerDescription.displayName = DrawerPrimitive.Description.displayName;
export { Drawer, DrawerPortal, DrawerOverlay, DrawerTrigger, DrawerClose, DrawerContent, DrawerHeader, DrawerFooter, DrawerTitle, DrawerDescription };
