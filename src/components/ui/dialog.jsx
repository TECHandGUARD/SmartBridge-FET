"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
const CONFIG = {
  ANIMATION_DURATION: import.meta.env.VITE_DIALOG_ANIMATION_DURATION || 200,
  OVERLAY_STYLES: import.meta.env.VITE_DIALOG_OVERLAY_STYLES || "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
  CONTENT_BASE_STYLES: import.meta.env.VITE_DIALOG_CONTENT_BASE_STYLES || "fixed left-[50%] top-[50%] z-50 grid w-full translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
  SIZES: {
    SM: import.meta.env.VITE_DIALOG_SIZE_SM || "max-w-sm",
    DEFAULT: import.meta.env.VITE_DIALOG_SIZE_DEFAULT || "max-w-lg",
    LG: import.meta.env.VITE_DIALOG_SIZE_LG || "max-w-2xl",
    XL: import.meta.env.VITE_DIALOG_SIZE_XL || "max-w-4xl",
    FULL: import.meta.env.VITE_DIALOG_SIZE_FULL || "max-w-[90vw] max-h-[90vh]"
  },
  CLOSE_BUTTON_STYLES: import.meta.env.VITE_DIALOG_CLOSE_BUTTON_STYLES || "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground",
  HEADER_STYLES: import.meta.env.VITE_DIALOG_HEADER_STYLES || "flex flex-col space-y-1.5 text-center sm:text-left",
  FOOTER_STYLES: import.meta.env.VITE_DIALOG_FOOTER_STYLES || "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
  TITLE_STYLES: import.meta.env.VITE_DIALOG_TITLE_STYLES || "text-lg font-semibold leading-none tracking-tight",
  DESCRIPTION_STYLES: import.meta.env.VITE_DIALOG_DESCRIPTION_STYLES || "text-sm text-muted-foreground",
  CLOSE_ICON_SIZE: import.meta.env.VITE_DIALOG_CLOSE_ICON_SIZE || "h-4 w-4",
  ENABLE_CLOSE_BUTTON: import.meta.env.VITE_DIALOG_ENABLE_CLOSE_BUTTON !== "false",
  ENABLE_PORTAL: import.meta.env.VITE_DIALOG_ENABLE_PORTAL !== "false"
};
const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;
const DialogOverlay = React.forwardRef(({
  className,
  dim = true,
  ...props
}, ref) => <DialogPrimitive.Overlay ref={ref} className={cn(CONFIG.OVERLAY_STYLES, !dim && "bg-transparent backdrop-blur-none", className)} {...props} />);
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;
const DialogContent = React.forwardRef(({
  className,
  children,
  size = "default",
  closeIcon,
  hideCloseButton = false,
  portal = CONFIG.ENABLE_PORTAL,
  onInteractOutside,
  onEscapeKeyDown,
  ...props
}, ref) => {
  const sizeClass = CONFIG.SIZES[size] || CONFIG.SIZES.DEFAULT;
  const CloseIcon = closeIcon || X;
  const ContentComponent = portal ? DialogPrimitive.Portal : React.Fragment;
  const ContentElement = DialogPrimitive.Content;
  return <ContentComponent>
      <DialogOverlay />
      <ContentElement ref={ref} className={cn(CONFIG.CONTENT_BASE_STYLES, sizeClass, className)} onInteractOutside={onInteractOutside} onEscapeKeyDown={onEscapeKeyDown} style={{
      '--dialog-duration': `${CONFIG.ANIMATION_DURATION}ms`
    }} {...props}>
        {children}
        {CONFIG.ENABLE_CLOSE_BUTTON && !hideCloseButton && <DialogPrimitive.Close className={cn(CONFIG.CLOSE_BUTTON_STYLES)} aria-label="Close dialog">
            <CloseIcon className={CONFIG.CLOSE_ICON_SIZE} />
          </DialogPrimitive.Close>}
      </ContentElement>
    </ContentComponent>;
});
DialogContent.displayName = DialogPrimitive.Content.displayName;
const DialogHeader = ({
  className,
  ...props
}) => <div className={cn(CONFIG.HEADER_STYLES, className)} {...props} />;
DialogHeader.displayName = "DialogHeader";
const DialogFooter = ({
  className,
  ...props
}) => <div className={cn(CONFIG.FOOTER_STYLES, className)} {...props} />;
DialogFooter.displayName = "DialogFooter";
const DialogTitle = React.forwardRef(({
  className,
  ...props
}, ref) => <DialogPrimitive.Title ref={ref} className={cn(CONFIG.TITLE_STYLES, className)} {...props} />);
DialogTitle.displayName = DialogPrimitive.Title.displayName;
const DialogDescription = React.forwardRef(({
  className,
  ...props
}, ref) => <DialogPrimitive.Description ref={ref} className={cn(CONFIG.DESCRIPTION_STYLES, className)} {...props} />);
DialogDescription.displayName = DialogPrimitive.Description.displayName;
export { Dialog, DialogPortal, DialogOverlay, DialogTrigger, DialogClose, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription };
