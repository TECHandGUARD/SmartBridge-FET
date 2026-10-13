"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { Controller, FormProvider, useFormContext } from "react-hook-form";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
const CONFIG = {
  LABEL_STYLES: import.meta.env.VITE_FORM_LABEL_STYLES || "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
  DESCRIPTION_STYLES: import.meta.env.VITE_FORM_DESCRIPTION_STYLES || "text-[0.8rem] text-muted-foreground",
  MESSAGE_STYLES: import.meta.env.VITE_FORM_MESSAGE_STYLES || "text-[0.8rem] font-medium text-destructive",
  ITEM_SPACING: import.meta.env.VITE_FORM_ITEM_SPACING || "space-y-2",
  ERROR_PREFIX: import.meta.env.VITE_FORM_ERROR_PREFIX || "",
  ENABLE_REQUIRED_INDICATOR: import.meta.env.VITE_FORM_ENABLE_REQUIRED_INDICATOR !== "false",
  ENABLE_OPTIONAL_INDICATOR: import.meta.env.VITE_FORM_ENABLE_OPTIONAL_INDICATOR !== "false",
  MESSAGES: {
    REQUIRED: import.meta.env.VITE_FORM_REQUIRED_MSG || "Required",
    OPTIONAL: import.meta.env.VITE_FORM_OPTIONAL_MSG || "(optional)"
  }
};
const FormFieldContext = React.createContext(null);
const FormItemContext = React.createContext(null);
function useFormField() {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);
  if (!fieldContext) {
    throw new Error("useFormField must be used within a <FormField>");
  }
  if (!itemContext) {
    throw new Error("useFormField must be used within a <FormItem>");
  }
  const {
    getFieldState
  } = useFormContext();
  const fieldState = getFieldState(fieldContext.name);
  const {
    id
  } = itemContext;
  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState
  };
}
const Form = FormProvider;
const FormField = ({
  ...props
}) => {
  return <FormFieldContext.Provider value={{
    name: props.name
  }}>
      <Controller {...props} />
    </FormFieldContext.Provider>;
};
const FormItem = React.forwardRef(({
  className,
  ...props
}, ref) => {
  const id = React.useId();
  return <FormItemContext.Provider value={{
    id
  }}>
      <div ref={ref} className={cn(CONFIG.ITEM_SPACING, className)} {...props} />
    </FormItemContext.Provider>;
});
FormItem.displayName = "FormItem";
const FormLabel = React.forwardRef(({
  className,
  children,
  required = false,
  optional = false,
  hideAsterisk = false,
  ...props
}, ref) => {
  const {
    error,
    formItemId
  } = useFormField();
  const showRequired = CONFIG.ENABLE_REQUIRED_INDICATOR && required;
  const showOptional = CONFIG.ENABLE_OPTIONAL_INDICATOR && optional;
  return <Label ref={ref} className={cn(CONFIG.LABEL_STYLES, error && "text-destructive", className)} htmlFor={formItemId} {...props}>
        {children}
        {showRequired && !hideAsterisk && <span className="ml-1 text-destructive" aria-hidden="true">
            *
          </span>}
        {showOptional && <span className="ml-1 text-muted-foreground text-xs font-normal">
            ({CONFIG.MESSAGES.OPTIONAL})
          </span>}
      </Label>;
});
FormLabel.displayName = "FormLabel";
const FormControl = React.forwardRef(({
  asChild = true,
  ...props
}, ref) => {
  const {
    error,
    formItemId,
    formDescriptionId,
    formMessageId
  } = useFormField();
  const Comp = asChild ? Slot : "div";
  return <Comp ref={ref} id={formItemId} aria-describedby={!error ? formDescriptionId || undefined : `${formDescriptionId || ""} ${formMessageId}`.trim() || undefined} aria-invalid={!!error} {...props} />;
});
FormControl.displayName = "FormControl";
const FormDescription = React.forwardRef(({
  className,
  ...props
}, ref) => {
  const {
    formDescriptionId
  } = useFormField();
  return <p ref={ref} id={formDescriptionId} className={cn(CONFIG.DESCRIPTION_STYLES, className)} {...props} />;
});
FormDescription.displayName = "FormDescription";
const FormMessage = React.forwardRef(({
  className,
  children,
  prefix = CONFIG.ERROR_PREFIX,
  ...props
}, ref) => {
  const {
    error,
    formMessageId
  } = useFormField();
  const body = error ? String(error?.message) : children;
  if (!body) {
    return null;
  }
  return <p ref={ref} id={formMessageId} className={cn(CONFIG.MESSAGE_STYLES, className)} {...props}>
        {prefix && <span className="sr-only">{prefix}</span>}
        {body}
      </p>;
});
FormMessage.displayName = "FormMessage";
export { useFormField, Form, FormItem, FormLabel, FormControl, FormDescription, FormMessage, FormField };
