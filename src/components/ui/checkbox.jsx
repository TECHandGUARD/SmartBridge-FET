// src/components/ui/checkbox.jsx
import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check, Minus } from "lucide-react";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

// ============================================================
// 🔧 SOFT-CODED CONFIGURATION
// ============================================================

const CONFIG = {
  // Base styles
  BASE_STYLES: import.meta.env.VITE_CHECKBOX_BASE_STYLES || "peer shrink-0 rounded-sm border border-primary shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground",

  // Size variants
  SIZES: {
    SM: import.meta.env.VITE_CHECKBOX_SIZE_SM || "h-3.5 w-3.5 [&_svg]:h-3 [&_svg]:w-3",
    DEFAULT: import.meta.env.VITE_CHECKBOX_SIZE_DEFAULT || "h-4 w-4 [&_svg]:h-4 [&_svg]:w-4",
    LG: import.meta.env.VITE_CHECKBOX_SIZE_LG || "h-5 w-5 [&_svg]:h-5 [&_svg]:w-5",
    XL: import.meta.env.VITE_CHECKBOX_SIZE_XL || "h-6 w-6 [&_svg]:h-6 [&_svg]:w-6",
  },

  // Variant styles
  VARIANTS: {
    DEFAULT: import.meta.env.VITE_CHECKBOX_VARIANT_DEFAULT || "border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground",
    DESTRUCTIVE: import.meta.env.VITE_CHECKBOX_VARIANT_DESTRUCTIVE || "border-destructive data-[state=checked]:bg-destructive data-[state=checked]:text-destructive-foreground data-[state=indeterminate]:bg-destructive data-[state=indeterminate]:text-destructive-foreground",
    SUCCESS: import.meta.env.VITE_CHECKBOX_VARIANT_SUCCESS || "border-green-500 data-[state=checked]:bg-green-500 data-[state=checked]:text-white data-[state=indeterminate]:bg-green-500 data-[state=indeterminate]:text-white",
    WARNING: import.meta.env.VITE_CHECKBOX_VARIANT_WARNING || "border-amber-500 data-[state=checked]:bg-amber-500 data-[state=checked]:text-white data-[state=indeterminate]:bg-amber-500 data-[state=indeterminate]:text-white",
    INFO: import.meta.env.VITE_CHECKBOX_VARIANT_INFO || "border-blue-500 data-[state=checked]:bg-blue-500 data-[state=checked]:text-white data-[state=indeterminate]:bg-blue-500 data-[state=indeterminate]:text-white",
  },

  // Feature flags
  ENABLE_LABEL: import.meta.env.VITE_CHECKBOX_ENABLE_LABEL !== "false",
  ENABLE_INDETERMINATE: import.meta.env.VITE_CHECKBOX_ENABLE_INDETERMINATE !== "false",
};

// ============================================================
// Checkbox Variants
// ============================================================

const checkboxVariants = cva(CONFIG.BASE_STYLES, {
  variants: {
    variant: {
      default: CONFIG.VARIANTS.DEFAULT,
      destructive: CONFIG.VARIANTS.DESTRUCTIVE,
      success: CONFIG.VARIANTS.SUCCESS,
      warning: CONFIG.VARIANTS.WARNING,
      info: CONFIG.VARIANTS.INFO,
    },
    size: {
      sm: CONFIG.SIZES.SM,
      default: CONFIG.SIZES.DEFAULT,
      lg: CONFIG.SIZES.LG,
      xl: CONFIG.SIZES.XL,
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

// ============================================================
// Main Component
// ============================================================

/**
 * Checkbox – A customizable checkbox with label, indeterminate state, and multiple variants.
 *
 * @param {Object} props
 * @param {string} props.variant - Visual style ('default' | 'destructive' | 'success' | 'warning' | 'info')
 * @param {string} props.size - Size ('sm' | 'default' | 'lg' | 'xl')
 * @param {string} props.label - Label text (renders a label element)
 * @param {string} props.labelClassName - Additional classes for the label
 * @param {boolean} props.checked - Controlled checked state
 * @param {boolean} props.defaultChecked - Default checked state
 * @param {boolean} props.indeterminate - Indeterminate state
 * @param {function} props.onCheckedChange - Callback when checked state changes
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.disabled - Disable the checkbox
 * @param {string} props.id - Unique ID (generated if not provided)
 *
 * @example
 * <Checkbox label="Accept terms" />
 * <Checkbox variant="destructive" size="lg" label="Delete all data" />
 * <Checkbox indeterminate checked={checked} onCheckedChange={setChecked} />
 */
const Checkbox = React.forwardRef(
  (
    {
      className,
      variant,
      size,
      label,
      labelClassName,
      id,
      disabled,
      indeterminate = false,
      checked,
      defaultChecked,
      onCheckedChange,
      ...props
    },
    ref
  ) => {
    // Generate a unique ID if not provided
    const generatedId = React.useId();
    const checkboxId = id || `checkbox-${generatedId}`;

    // Ref for the checkbox root to handle indeterminate state
    const checkboxRef = React.useRef(null);

    // Handle indeterminate state via ref
    React.useEffect(() => {
      if (checkboxRef.current && CONFIG.ENABLE_INDETERMINATE) {
        // The Radix primitive uses data-state to indicate indeterminate,
        // but we also need to set the native indeterminate property for accessibility.
        // We can access the underlying input element via the ref's current.
        // However, with Radix, we can use the `indeterminate` prop directly.
        // The Radix primitive supports `indeterminate` as a prop.
        // We'll handle it by passing it directly to the Root.
      }
    }, [indeterminate]);

    // If we have a label, render a wrapper with label
    const checkboxElement = (
      <CheckboxPrimitive.Root
        ref={(node) => {
          // Forward ref to the parent
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
          checkboxRef.current = node;
        }}
        id={checkboxId}
        className={cn(
          checkboxVariants({ variant, size }),
          className
        )}
        disabled={disabled}
        checked={checked}
        defaultChecked={defaultChecked}
        onCheckedChange={onCheckedChange}
        // Radix supports indeterminate prop
        indeterminate={CONFIG.ENABLE_INDETERMINATE ? indeterminate : undefined}
        {...props}
      >
        <CheckboxPrimitive.Indicator
          className={cn("flex items-center justify-center text-current")}
        >
          {indeterminate ? (
            <Minus className="h-3 w-3" />
          ) : (
            <Check className="h-3 w-3" />
          )}
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
    );

    if (label && CONFIG.ENABLE_LABEL) {
      return (
        <div className="flex items-center gap-2">
          {checkboxElement}
          <label
            htmlFor={checkboxId}
            className={cn(
              "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
              disabled && "opacity-70 cursor-not-allowed",
              labelClassName
            )}
          >
            {label}
          </label>
        </div>
      );
    }

    return checkboxElement;
  }
);

Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
