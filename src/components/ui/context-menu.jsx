// src/components/ui/context-menu.jsx
import * as React from "react";
import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import { Check, ChevronRight, Circle, AlertCircle } from "lucide-react";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

// ============================================================
// 🔧 SOFT-CODED CONFIGURATION
// ============================================================

const CONFIG = {
  // Base styles
  CONTENT_STYLES: import.meta.env.VITE_CONTEXT_MENU_CONTENT_STYLES || "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
  SUB_CONTENT_STYLES: import.meta.env.VITE_CONTEXT_MENU_SUB_CONTENT_STYLES || "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
  ITEM_STYLES: import.meta.env.VITE_CONTEXT_MENU_ITEM_STYLES || "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
  SUB_TRIGGER_STYLES: import.meta.env.VITE_CONTEXT_MENU_SUB_TRIGGER_STYLES || "flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
  LABEL_STYLES: import.meta.env.VITE_CONTEXT_MENU_LABEL_STYLES || "px-2 py-1.5 text-sm font-semibold text-foreground",
  SEPARATOR_STYLES: import.meta.env.VITE_CONTEXT_MENU_SEPARATOR_STYLES || "-mx-1 my-1 h-px bg-border",
  SHORTCUT_STYLES: import.meta.env.VITE_CONTEXT_MENU_SHORTCUT_STYLES || "ml-auto text-xs tracking-widest text-muted-foreground",

  // Checkbox item styles
  CHECKBOX_ITEM_STYLES: import.meta.env.VITE_CONTEXT_MENU_CHECKBOX_ITEM_STYLES || "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
  RADIO_ITEM_STYLES: import.meta.env.VITE_CONTEXT_MENU_RADIO_ITEM_STYLES || "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",

  // Inset padding
  INSET_PADDING: import.meta.env.VITE_CONTEXT_MENU_INSET_PADDING || "pl-8",

  // Item variants
  VARIANTS: {
    DEFAULT: import.meta.env.VITE_CONTEXT_MENU_VARIANT_DEFAULT || "",
    DESTRUCTIVE: import.meta.env.VITE_CONTEXT_MENU_VARIANT_DESTRUCTIVE || "text-destructive focus:bg-destructive/10 focus:text-destructive",
    SUCCESS: import.meta.env.VITE_CONTEXT_MENU_VARIANT_SUCCESS || "text-green-600 focus:bg-green-50 focus:text-green-700",
  },

  // Feature flags
  ENABLE_ICONS: import.meta.env.VITE_CONTEXT_MENU_ENABLE_ICONS !== "false",
  ENABLE_DISABLED_STYLES: import.meta.env.VITE_CONTEXT_MENU_ENABLE_DISABLED_STYLES !== "false",
};

// ============================================================
// Context Menu Variants
// ============================================================

const contextMenuItemVariants = cva(CONFIG.ITEM_STYLES, {
  variants: {
    variant: {
      default: CONFIG.VARIANTS.DEFAULT,
      destructive: CONFIG.VARIANTS.DESTRUCTIVE,
      success: CONFIG.VARIANTS.SUCCESS,
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

// ============================================================
// Main Components
// ============================================================

// ─── Root ──────────────────────────────────────────────────────

const ContextMenu = ContextMenuPrimitive.Root;

const ContextMenuTrigger = ContextMenuPrimitive.Trigger;

const ContextMenuGroup = ContextMenuPrimitive.Group;

const ContextMenuPortal = ContextMenuPrimitive.Portal;

const ContextMenuSub = ContextMenuPrimitive.Sub;

const ContextMenuRadioGroup = ContextMenuPrimitive.RadioGroup;

// ─── ContextMenuSubTrigger ─────────────────────────────────────

/**
 * ContextMenuSubTrigger – Triggers a sub-menu.
 *
 * @param {Object} props
 * @param {string} props.inset - Add inset padding
 * @param {React.ReactNode} props.icon - Icon to display before children
 * @param {string} props.variant - Visual variant
 * @param {string} props.className - Additional CSS classes
 */
const ContextMenuSubTrigger = React.forwardRef(
  ({ className, inset, children, icon, variant, ...props }, ref) => (
    <ContextMenuPrimitive.SubTrigger
      ref={ref}
      className={cn(
        CONFIG.SUB_TRIGGER_STYLES,
        inset && CONFIG.INSET_PADDING,
        contextMenuItemVariants({ variant }),
        className
      )}
      {...props}
    >
      {CONFIG.ENABLE_ICONS && icon && (
        <span className="mr-2 flex-shrink-0">{icon}</span>
      )}
      {children}
      <ChevronRight className="ml-auto h-4 w-4" />
    </ContextMenuPrimitive.SubTrigger>
  )
);
ContextMenuSubTrigger.displayName = ContextMenuPrimitive.SubTrigger.displayName;

// ─── ContextMenuSubContent ────────────────────────────────────

const ContextMenuSubContent = React.forwardRef(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.SubContent
    ref={ref}
    className={cn(CONFIG.SUB_CONTENT_STYLES, className)}
    {...props}
  />
));
ContextMenuSubContent.displayName = ContextMenuPrimitive.SubContent.displayName;

// ─── ContextMenuContent ────────────────────────────────────────

/**
 * ContextMenuContent – The main menu content container.
 *
 * @param {Object} props
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.portal - Whether to portal the content
 * @param {function} props.onCloseAutoFocus - Callback when focus is automatically moved
 * @param {boolean} props.avoidCollisions - Whether to avoid collisions with viewport edges
 */
const ContextMenuContent = React.forwardRef(({ className, portal = true, ...props }, ref) => {
  const Content = portal ? ContextMenuPrimitive.Portal : React.Fragment;
  const ContentComponent = portal ? ContextMenuPrimitive.Content : ContextMenuPrimitive.Content;

  return (
    <Content>
      <ContentComponent
        ref={ref}
        className={cn(CONFIG.CONTENT_STYLES, className)}
        {...props}
      />
    </Content>
  );
});
ContextMenuContent.displayName = ContextMenuPrimitive.Content.displayName;

// ─── ContextMenuItem ──────────────────────────────────────────

/**
 * ContextMenuItem – A selectable menu item.
 *
 * @param {Object} props
 * @param {string} props.inset - Add inset padding
 * @param {React.ReactNode} props.icon - Icon to display before children
 * @param {React.ReactNode} props.rightIcon - Icon to display after children
 * @param {string} props.shortcut - Keyboard shortcut
 * @param {string} props.variant - Visual variant ('default' | 'destructive' | 'success')
 * @param {boolean} props.disabled - Whether the item is disabled
 * @param {function} props.onSelect - Callback when item is selected
 * @param {string} props.className - Additional CSS classes
 */
const ContextMenuItem = React.forwardRef(
  ({ className, inset, children, icon, rightIcon, shortcut, variant, ...props }, ref) => (
    <ContextMenuPrimitive.Item
      ref={ref}
      className={cn(
        contextMenuItemVariants({ variant }),
        inset && CONFIG.INSET_PADDING,
        className
      )}
      {...props}
    >
      {CONFIG.ENABLE_ICONS && icon && (
        <span className="mr-2 flex-shrink-0">{icon}</span>
      )}
      {children}
      {shortcut && <ContextMenuShortcut>{shortcut}</ContextMenuShortcut>}
      {CONFIG.ENABLE_ICONS && rightIcon && (
        <span className="ml-auto flex-shrink-0">{rightIcon}</span>
      )}
    </ContextMenuPrimitive.Item>
  )
);
ContextMenuItem.displayName = ContextMenuPrimitive.Item.displayName;

// ─── ContextMenuCheckboxItem ──────────────────────────────────

/**
 * ContextMenuCheckboxItem – A checkbox item.
 *
 * @param {Object} props
 * @param {boolean} props.checked - Whether the item is checked
 * @param {React.ReactNode} props.children - Item content
 * @param {string} props.className - Additional CSS classes
 */
const ContextMenuCheckboxItem = React.forwardRef(
  ({ className, children, checked, ...props }, ref) => (
    <ContextMenuPrimitive.CheckboxItem
      ref={ref}
      className={cn(CONFIG.CHECKBOX_ITEM_STYLES, className)}
      checked={checked}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <ContextMenuPrimitive.ItemIndicator>
          <Check className="h-4 w-4" />
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.CheckboxItem>
  )
);
ContextMenuCheckboxItem.displayName = ContextMenuPrimitive.CheckboxItem.displayName;

// ─── ContextMenuRadioItem ─────────────────────────────────────

/**
 * ContextMenuRadioItem – A radio item.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Item content
 * @param {string} props.className - Additional CSS classes
 */
const ContextMenuRadioItem = React.forwardRef(
  ({ className, children, ...props }, ref) => (
    <ContextMenuPrimitive.RadioItem
      ref={ref}
      className={cn(CONFIG.RADIO_ITEM_STYLES, className)}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <ContextMenuPrimitive.ItemIndicator>
          <Circle className="h-4 w-4 fill-current" />
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.RadioItem>
  )
);
ContextMenuRadioItem.displayName = ContextMenuPrimitive.RadioItem.displayName;

// ─── ContextMenuLabel ─────────────────────────────────────────

/**
 * ContextMenuLabel – A label for a group of items.
 *
 * @param {Object} props
 * @param {string} props.inset - Add inset padding
 * @param {React.ReactNode} props.icon - Icon to display before label
 * @param {string} props.description - Description text below the label
 * @param {string} props.className - Additional CSS classes
 */
const ContextMenuLabel = React.forwardRef(
  ({ className, inset, children, icon, description, ...props }, ref) => (
    <div>
      <ContextMenuPrimitive.Label
        ref={ref}
        className={cn(
          CONFIG.LABEL_STYLES,
          inset && CONFIG.INSET_PADDING,
          className
        )}
        {...props}
      >
        {CONFIG.ENABLE_ICONS && icon && (
          <span className="mr-2 inline-flex">{icon}</span>
        )}
        {children}
      </ContextMenuPrimitive.Label>
      {description && (
        <p className="px-2 pb-1 text-[10px] text-muted-foreground">{description}</p>
      )}
    </div>
  )
);
ContextMenuLabel.displayName = ContextMenuPrimitive.Label.displayName;

// ─── ContextMenuSeparator ─────────────────────────────────────

const ContextMenuSeparator = React.forwardRef(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.Separator
    ref={ref}
    className={cn(CONFIG.SEPARATOR_STYLES, className)}
    {...props}
  />
));
ContextMenuSeparator.displayName = ContextMenuPrimitive.Separator.displayName;

// ─── ContextMenuShortcut ──────────────────────────────────────

/**
 * ContextMenuShortcut – Keyboard shortcut indicator.
 *
 * @param {Object} props
 * @param {string} props.className - Additional CSS classes
 */
const ContextMenuShortcut = ({ className, ...props }) => {
  return (
    <span className={cn(CONFIG.SHORTCUT_STYLES, className)} {...props} />
  );
};
ContextMenuShortcut.displayName = "ContextMenuShortcut";

// ============================================================
// Exports
// ============================================================

export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuGroup,
  ContextMenuPortal,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuRadioGroup,
};
