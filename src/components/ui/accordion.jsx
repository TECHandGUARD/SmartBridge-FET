// src/components/ui/accordion.jsx
import * as React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

// ============================================================
// 🔧 SOFT-CODED CONFIGURATION
// ============================================================

const CONFIG = {
  // Animation durations (ms)
  ANIMATION_DURATION: import.meta.env.VITE_ACCORDION_ANIMATION_DURATION || 200,

  // Icon size
  ICON_SIZE: import.meta.env.VITE_ACCORDION_ICON_SIZE || "w-4 h-4",

  // Default styles
  STYLES: {
    TRIGGER: import.meta.env.VITE_ACCORDION_TRIGGER_STYLE || "flex flex-1 items-center justify-between py-4 text-sm font-medium transition-all hover:underline text-left [&[data-state=open]>svg]:rotate-180",
    CONTENT: import.meta.env.VITE_ACCORDION_CONTENT_STYLE || "pb-4 pt-0",
    ITEM: import.meta.env.VITE_ACCORDION_ITEM_STYLE || "border-b",
    ICON: import.meta.env.VITE_ACCORDION_ICON_STYLE || "shrink-0 text-muted-foreground transition-transform duration-200",
  },
};

// ============================================================
// Main Component
// ============================================================

const Accordion = AccordionPrimitive.Root;

// ============================================================
// AccordionItem
// ============================================================

const AccordionItem = React.forwardRef(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn(CONFIG.STYLES.ITEM, className)}
    {...props}
  />
));
AccordionItem.displayName = "AccordionItem";

// ============================================================
// AccordionTrigger
// ============================================================

const AccordionTrigger = React.forwardRef(({ className, children, hideIcon = false, iconSize = CONFIG.ICON_SIZE, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        CONFIG.STYLES.TRIGGER,
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none rounded-md",
        className
      )}
      {...props}
    >
      <span className="flex-1 text-left">{children}</span>
      {!hideIcon && (
        <ChevronDown
          className={cn(
            CONFIG.STYLES.ICON,
            iconSize,
            "ml-2 flex-shrink-0"
          )}
          aria-hidden="true"
        />
      )}
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName;

// ============================================================
// AccordionContent
// ============================================================

const AccordionContent = React.forwardRef(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className={cn(
      "overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down",
      className
    )}
    style={
      {
        "--accordion-animation-duration": `${CONFIG.ANIMATION_DURATION}ms`,
      }
    }
    {...props}
  >
    <div className={cn(CONFIG.STYLES.CONTENT, className)}>{children}</div>
  </AccordionPrimitive.Content>
));
AccordionContent.displayName = AccordionPrimitive.Content.displayName;

// ============================================================
// Exports
// ============================================================

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
