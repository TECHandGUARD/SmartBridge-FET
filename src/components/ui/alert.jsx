import * as React from "react";
import { cva } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
const CONFIG = {
  VARIANTS: {
    DEFAULT: import.meta.env.VITE_ALERT_VARIANT_DEFAULT || "bg-background text-foreground",
    DESTRUCTIVE: import.meta.env.VITE_ALERT_VARIANT_DESTRUCTIVE || "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
    SUCCESS: import.meta.env.VITE_ALERT_VARIANT_SUCCESS || "border-green-500/50 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/20 [&>svg]:text-green-600",
    WARNING: import.meta.env.VITE_ALERT_VARIANT_WARNING || "border-amber-500/50 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 [&>svg]:text-amber-600",
    INFO: import.meta.env.VITE_ALERT_VARIANT_INFO || "border-blue-500/50 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 [&>svg]:text-blue-600"
  },
  BASE_STYLES: import.meta.env.VITE_ALERT_BASE_STYLES || "relative w-full rounded-lg border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7",
  TITLE_STYLES: import.meta.env.VITE_ALERT_TITLE_STYLES || "mb-1 font-medium leading-none tracking-tight",
  DESC_STYLES: import.meta.env.VITE_ALERT_DESC_STYLES || "text-sm [&_p]:leading-relaxed",
  ENABLE_DISMISS: import.meta.env.VITE_ALERT_ENABLE_DISMISS !== "false"
};
const alertVariants = cva(CONFIG.BASE_STYLES, {
  variants: {
    variant: {
      default: CONFIG.VARIANTS.DEFAULT,
      destructive: CONFIG.VARIANTS.DESTRUCTIVE,
      success: CONFIG.VARIANTS.SUCCESS,
      warning: CONFIG.VARIANTS.WARNING,
      info: CONFIG.VARIANTS.INFO
    }
  },
  defaultVariants: {
    variant: "default"
  }
});
const Alert = React.forwardRef(/** @param {React.ComponentPropsWithoutRef<'div'> & {variant?: "default"|"destructive"|"success"|"warning"|"info"|null; icon?: React.ElementType; onDismiss?: (...args: any[]) => any; dismissible?: boolean}} props @param {React.ForwardedRef<any>} ref */
({
  className,
  variant,
  icon: Icon,
  onDismiss,
  dismissible = false,
  children,
  ...props
}, ref) => {
  const [dismissed, setDismissed] = React.useState(false);
  if (dismissed) return null;
  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };
  return <div ref={ref} role="alert" className={cn(alertVariants({
    variant
  }), "relative", dismissible && CONFIG.ENABLE_DISMISS ? "pr-10" : "", className)} {...props}>
      {Icon && <Icon className="absolute left-4 top-4 h-4 w-4" aria-hidden="true" />}
      <div className={Icon ? "pl-7" : ""}>
        {children}
      </div>
      {dismissible && CONFIG.ENABLE_DISMISS && <button onClick={handleDismiss} className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring" aria-label="Dismiss alert">
          <X className="h-4 w-4" />
        </button>}
    </div>;
});
Alert.displayName = "Alert";
const AlertTitle = React.forwardRef(/** @param {React.ComponentPropsWithoutRef<'h5'>} props @param {React.ForwardedRef<any>} ref */
({
  className,
  ...props
}, ref) => <h5 ref={ref} className={cn(CONFIG.TITLE_STYLES, className)} {...props} />);
AlertTitle.displayName = "AlertTitle";
const AlertDescription = React.forwardRef(/** @param {React.ComponentPropsWithoutRef<'div'>} props @param {React.ForwardedRef<any>} ref */
({
  className,
  ...props
}, ref) => <div ref={ref} className={cn(CONFIG.DESC_STYLES, className)} {...props} />);
AlertDescription.displayName = "AlertDescription";
export { Alert, AlertTitle, AlertDescription };
