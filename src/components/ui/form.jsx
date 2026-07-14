// src/components/ui/form.jsx
"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import {
  Controller,
  FormProvider,
  useFormContext,
  useFormState,
} from "react-hook-form";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

// ============================================================
// 🔧 SOFT-CODED CONFIGURATION
// ============================================================

const CONFIG = {
  // Label styles
  LABEL_STYLES: import.meta.env.VITE_FORM_LABEL_STYLES || "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",

  // Description styles
  DESCRIPTION_STYLES: import.meta.env.VITE_FORM_DESCRIPTION_STYLES || "text-[0.8rem] text-muted-foreground",

  // Message styles
  MESSAGE_STYLES: import.meta.env.VITE_FORM_MESSAGE_STYLES || "text-[0.8rem] font-medium text-destructive",

  // Item spacing
  ITEM_SPACING: import.meta.env.VITE_FORM_ITEM_SPACING || "space-y-2",

  // Error message prefix
  ERROR_PREFIX: import.meta.env.VITE_FORM_ERROR_PREFIX || "",

  // Feature flags
  ENABLE_REQUIRED_INDICATOR: import.meta.env.VITE_FORM_ENABLE_REQUIRED_INDICATOR !== "false",
  ENABLE_OPTIONAL_INDICATOR: import.meta.env.VITE_FORM_ENABLE_OPTIONAL_INDICATOR !== "false",

  // Messages
  MESSAGES: {
    REQUIRED: import.meta.env.VITE_FORM_REQUIRED_MSG || "Required",
    OPTIONAL: import.meta.env.VITE_FORM_OPTIONAL_MSG || "(optional)",
  },
};

// ============================================================
// Contexts
// ============================================================

const FormFieldContext = React.createContext(null);
const FormItemContext = React.createContext(null);

// ============================================================
// Hooks
// ============================================================

/**
 * useFormField – Hook to access form field context.
 *
 * @returns {Object} Field context with id, name, and field state
 * @throws {Error} If used outside of FormField
 *
 * @example
 * const { error, formItemId } = useFormField();
 */
function useFormField() {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);

  if (!fieldContext) {
    throw new Error("useFormField must be used within a <FormField>");
  }

  if (!itemContext) {
    throw new Error("useFormField must be used within a <FormItem>");
  }

  const { getFieldState } = useFormContext();
  const fieldState = getFieldState(fieldContext.name);

  const { id } = itemContext;

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  };
}

// ============================================================
// Main Components
// ============================================================

/**
 * Form – Provider component for react-hook-form.
 *
 * @param {Object} props
 * @param {Object} props.children - Form content
 * @param {Object} props.control - react-hook-form control
 * @param {Object} props.formState - react-hook-form form state
 * @param {Object} props.watch - react-hook-form watch function
 * @param {Object} props.setValue - react-hook-form setValue function
 * @param {Function} props.handleSubmit - react-hook-form handleSubmit
 * @param {Function} props.reset - react-hook-form reset
 * @param {Object} props.errors - react-hook-form errors
 * @param {boolean} props.isValid - Whether the form is valid
 * @param {boolean} props.isDirty - Whether the form is dirty
 * @param {boolean} props.isSubmitting - Whether the form is submitting
 * @param {boolean} props.isSubmitted - Whether the form has been submitted
 * @param {Function} props.getValues - react-hook-form getValues
 *
 * @example
 * <Form {...form}>
 *   <FormField
 *     control={form.control}
 *     name="email"
 *     render={({ field }) => (
 *       <FormItem>
 *         <FormLabel>Email</FormLabel>
 *         <FormControl>
 *           <Input placeholder="email@example.com" {...field} />
 *         </FormControl>
 *         <FormDescription>Enter your email address</FormDescription>
 *         <FormMessage />
 *       </FormItem>
 *     )}
 *   />
 * </Form>
 */
const Form = FormProvider;

// ============================================================
// FormField
// ============================================================

/**
 * FormField – Wraps a Controller with context.
 *
 * @param {Object} props
 * @param {string} props.name - Field name
 * @param {Object} props.control - react-hook-form control
 * @param {Function} props.render - Render function with field props
 * @param {Object} props.rules - Validation rules
 * @param {Object} props.defaultValue - Default value
 * @param {boolean} props.shouldUnregister - Whether to unregister on unmount
 *
 * @example
 * <FormField
 *   control={form.control}
 *   name="username"
 *   rules={{ required: true }}
 *   render={({ field }) => <Input {...field} />}
 * />
 */
const FormField = ({ ...props }) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
};

// ============================================================
// FormItem
// ============================================================

/**
 * FormItem – Container for a form field with consistent spacing.
 *
 * @param {Object} props
 * @param {string} props.className - Additional CSS classes
 * @param {React.ReactNode} props.children - Form field content
 *
 * @example
 * <FormItem>
 *   <FormLabel>Name</FormLabel>
 *   <FormControl>
 *     <Input />
 *   </FormControl>
 *   <FormMessage />
 * </FormItem>
 */
const FormItem = React.forwardRef(({ className, ...props }, ref) => {
  const id = React.useId();

  return (
    <FormItemContext.Provider value={{ id }}>
      <div
        ref={ref}
        className={cn(CONFIG.ITEM_SPACING, className)}
        {...props}
      />
    </FormItemContext.Provider>
  );
});
FormItem.displayName = "FormItem";

// ============================================================
// FormLabel
// ============================================================

/**
 * FormLabel – Label for a form field with error state.
 *
 * @param {Object} props
 * @param {string} props.className - Additional CSS classes
 * @param {React.ReactNode} props.children - Label content
 * @param {boolean} props.required - Whether the field is required (shows indicator)
 * @param {boolean} props.optional - Whether the field is optional (shows indicator)
 * @param {boolean} props.hideAsterisk - Hide the required asterisk
 *
 * @example
 * <FormLabel required>Email</FormLabel>
 * <FormLabel optional>Middle Name</FormLabel>
 */
const FormLabel = React.forwardRef(
  ({ className, children, required = false, optional = false, hideAsterisk = false, ...props }, ref) => {
    const { error, formItemId } = useFormField();

    const showRequired = CONFIG.ENABLE_REQUIRED_INDICATOR && required;
    const showOptional = CONFIG.ENABLE_OPTIONAL_INDICATOR && optional;

    return (
      <Label
        ref={ref}
        className={cn(
          CONFIG.LABEL_STYLES,
          error && "text-destructive",
          className
        )}
        htmlFor={formItemId}
        {...props}
      >
        {children}
        {showRequired && !hideAsterisk && (
          <span className="ml-1 text-destructive" aria-hidden="true">
            *
          </span>
        )}
        {showOptional && (
          <span className="ml-1 text-muted-foreground text-xs font-normal">
            ({CONFIG.MESSAGES.OPTIONAL})
          </span>
        )}
      </Label>
    );
  }
);
FormLabel.displayName = "FormLabel";

// ============================================================
// FormControl
// ============================================================

/**
 * FormControl – Wraps an input with accessible attributes.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Form control element
 * @param {boolean} props.asChild - Whether to render as child component
 * @param {React.Ref} ref - Forwarded ref
 *
 * @example
 * <FormControl>
 *   <Input />
 * </FormControl>
 * <FormControl asChild>
 *   <Select />
 * </FormControl>
 */
const FormControl = React.forwardRef(({ asChild = true, ...props }, ref) => {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField();

  const Comp = asChild ? Slot : "div";

  return (
    <Comp
      ref={ref}
      id={formItemId}
      aria-describedby={
        !error
          ? formDescriptionId || undefined
          : `${formDescriptionId || ""} ${formMessageId}`.trim() || undefined
      }
      aria-invalid={!!error}
      {...props}
    />
  );
});
FormControl.displayName = "FormControl";

// ============================================================
// FormDescription
// ============================================================

/**
 * FormDescription – Helper text for a form field.
 *
 * @param {Object} props
 * @param {string} props.className - Additional CSS classes
 * @param {React.ReactNode} props.children - Description content
 *
 * @example
 * <FormDescription>Enter your full name as it appears on your ID.</FormDescription>
 */
const FormDescription = React.forwardRef(({ className, ...props }, ref) => {
  const { formDescriptionId } = useFormField();

  return (
    <p
      ref={ref}
      id={formDescriptionId}
      className={cn(CONFIG.DESCRIPTION_STYLES, className)}
      {...props}
    />
  );
});
FormDescription.displayName = "FormDescription";

// ============================================================
// FormMessage
// ============================================================

/**
 * FormMessage – Displays validation errors or custom messages.
 *
 * @param {Object} props
 * @param {string} props.className - Additional CSS classes
 * @param {React.ReactNode} props.children - Custom message (overrides error)
 * @param {string} props.prefix - Prefix for error messages
 *
 * @example
 * <FormMessage />
 * <FormMessage>Custom validation message</FormMessage>
 * <FormMessage prefix="Error: " />
 */
const FormMessage = React.forwardRef(
  ({ className, children, prefix = CONFIG.ERROR_PREFIX, ...props }, ref) => {
    const { error, formMessageId } = useFormField();
    const body = error ? String(error?.message) : children;

    if (!body) {
      return null;
    }

    return (
      <p
        ref={ref}
        id={formMessageId}
        className={cn(CONFIG.MESSAGE_STYLES, className)}
        {...props}
      >
        {prefix && <span className="sr-only">{prefix}</span>}
        {body}
      </p>
    );
  }
);
FormMessage.displayName = "FormMessage";

// ============================================================
// Exports
// ============================================================

export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
};
