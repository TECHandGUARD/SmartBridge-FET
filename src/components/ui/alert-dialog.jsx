import * as React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
const CONFIG = {
  ANIMATION_DURATION: import.meta.env.VITE_ALERT_DIALOG_ANIMATION_DURATION || 200,
  OVERLAY_STYLES: {
    DEFAULT: import.meta.env.VITE_ALERT_OVERLAY_STYLE || "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
  },
  CONTENT_STYLES: {
    DEFAULT: import.meta.env.VITE_ALERT_CONTENT_STYLE || "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
    DESTRUCTIVE: import.meta.env.VITE_ALERT_CONTENT_DESTRUCTIVE_STYLE || "border-destructive/50"
  },
  HEADER_STYLES: {
    DEFAULT: import.meta.env.VITE_ALERT_HEADER_STYLE || "flex flex-col space-y-2 text-center sm:text-left"
  },
  FOOTER_STYLES: {
    DEFAULT: import.meta.env.VITE_ALERT_FOOTER_STYLE || "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2"
  },
  TITLE_STYLES: {
    DEFAULT: import.meta.env.VITE_ALERT_TITLE_STYLE || "text-lg font-semibold",
    DESTRUCTIVE: import.meta.env.VITE_ALERT_TITLE_DESTRUCTIVE_STYLE || "text-destructive"
  },
  DESCRIPTION_STYLES: {
    DEFAULT: import.meta.env.VITE_ALERT_DESCRIPTION_STYLE || "text-sm text-muted-foreground"
  },
  ACTION_VARIANTS: {
    DEFAULT: import.meta.env.VITE_ALERT_ACTION_VARIANT || "default",
    DESTRUCTIVE: import.meta.env.VITE_ALERT_ACTION_DESTRUCTIVE || "destructive"
  },
  CANCEL_VARIANT: import.meta.env.VITE_ALERT_CANCEL_VARIANT || "outline"
};
const AlertDialog = AlertDialogPrimitive.Root;
const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
const AlertDialogPortal = AlertDialogPrimitive.Portal;
const AlertDialogOverlay = React.forwardRef(/** @param {React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>} props @param {React.ForwardedRef<any>} ref */
({
  className,
  ...props
}, ref) => <AlertDialogPrimitive.Overlay className={cn(CONFIG.OVERLAY_STYLES.DEFAULT, className)} {...props} ref={ref} />);
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName;
const AlertDialogContent = React.forwardRef(/** @param {React.HTMLAttributes<HTMLElement> & {destructive?: boolean}} props @param {React.ForwardedRef<any>} ref */
({
  className,
  destructive = false,
  ...props
}, ref) => <AlertDialogPortal>
    <AlertDialogOverlay />
    <AlertDialogPrimitive.Content ref={ref} className={cn(CONFIG.CONTENT_STYLES.DEFAULT, destructive && CONFIG.CONTENT_STYLES.DESTRUCTIVE, "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none", className)} style={{
    "--alert-dialog-animation-duration": `${CONFIG.ANIMATION_DURATION}ms`
  }} {...props} />
  </AlertDialogPortal>);
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName;
const AlertDialogHeader = /** @param {React.ComponentPropsWithoutRef<'div'>} props */
({
  className,
  ...props
}) => <div className={cn(CONFIG.HEADER_STYLES.DEFAULT, className)} {...props} />;
AlertDialogHeader.displayName = "AlertDialogHeader";
const AlertDialogFooter = /** @param {React.ComponentPropsWithoutRef<'div'>} props */
({
  className,
  ...props
}) => <div className={cn(CONFIG.FOOTER_STYLES.DEFAULT, className)} {...props} />;
AlertDialogFooter.displayName = "AlertDialogFooter";
const AlertDialogTitle = React.forwardRef(/** @param {React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title> & {destructive?: boolean}} props @param {React.ForwardedRef<any>} ref */
({
  className,
  destructive = false,
  ...props
}, ref) => <AlertDialogPrimitive.Title ref={ref} className={cn(CONFIG.TITLE_STYLES.DEFAULT, destructive && CONFIG.TITLE_STYLES.DESTRUCTIVE, className)} {...props} />);
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName;
const AlertDialogDescription = React.forwardRef(/** @param {React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>} props @param {React.ForwardedRef<any>} ref */
({
  className,
  ...props
}, ref) => <AlertDialogPrimitive.Description ref={ref} className={cn(CONFIG.DESCRIPTION_STYLES.DEFAULT, className)} {...props} />);
AlertDialogDescription.displayName = AlertDialogPrimitive.Description.displayName;
const AlertDialogAction = React.forwardRef(/** @param {React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action> & {variant?: Parameters<typeof buttonVariants>[0]['variant']}} props @param {React.ForwardedRef<any>} ref */
({
  className,
  variant = CONFIG.ACTION_VARIANTS.DEFAULT,
  ...props
}, ref) => <AlertDialogPrimitive.Action ref={ref} className={cn(buttonVariants({
  variant
}), "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none", className)} {...props} />);
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName;
const AlertDialogCancel = React.forwardRef(/** @param {React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>} props @param {React.ForwardedRef<any>} ref */
({
  className,
  ...props
}, ref) => <AlertDialogPrimitive.Cancel ref={ref} className={cn(buttonVariants({
  variant: CONFIG.CANCEL_VARIANT
}), "mt-2 sm:mt-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none", className)} {...props} />);
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName;
export { AlertDialog, AlertDialogPortal, AlertDialogOverlay, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel };
