// src/components/ui/dropdown-menu.jsx
import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Check, ChevronRight, Circle } from "lucide-react";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

// ============================================================
// 🔧 SOFT-CODED CONFIGURATION
// ============================================================

const CONFIG = {
  // Content styles
  CONTENT_STYLES: import.meta.env.VITE_DROPDOWN_CONTENT_STYLES || "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",

  // Sub-content styles
  SUB_CONTENT_STYLES: import.meta.env.VITE_DROPDOWN_SUB_CONTENT_STYLES || "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",

  // Item base styles
  ITEM_BASE_STYLES: import.meta.env.VITE_DROPDOWN_ITEM_BASE_STYLES || "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0",

  // SubTrigger styles
  SUB_TRIGGER_STYLES: import.meta.env.VITE_DROPDOWN_SUB_TRIGGER_STYLES || "flex cursor-default gap-2 select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",

  // CheckboxItem styles
  CHECKBOX_ITEM_STYLES: import.meta.env.VITE_DROPDOWN_CHECKBOX_ITEM_STYLES || "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",

  // RadioItem styles
  RADIO_ITEM_STYLES: import.meta.env.VITE_DROPDOWN_RADIO_ITEM_STYLES || "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",

  // Label styles
  LABEL_STYLES: import.meta.env.VITE_DROPDOWN_LABEL_STYLES || "px-2 py-1.5 text-sm font-semibold",

  // Separator styles
  SEPARATOR_STYLES: import.meta.env.VITE_DROPDOWN_SEPARATOR_STYLES || "-mx-1 my-1 h-px bg-muted",

  // Shortcut styles
  SHORTCUT_STYLES: import.meta.env.VITE_DROPDOWN_SHORTCUT_STYLES || "ml-auto text-xs tracking-widest opacity-60",

  // Inset padding
  INSET_PADDING: import.meta.env.VITE_DROPDOWN_INSET_PADDING || "pl-8",

  // Item variants
  VARIANTS: {
    DEFAULT: import.meta.env.VITE_DROPDOWN_VARIANT_DEFAULT || "",
    DESTRUCTIVE: import.meta.env.VITE_DROPDOWN_VARIANT_DESTRUCTIVE || "text-destructive focus:bg-destructive/10 focus:text-destructive",
    SUCCESS: import.meta.env.VITE_DROPDOWN_VARIANT_SUCCESS || "text-green-600 focus:bg-green-50 focus:text-green-700",
  },

  // Feature flags
  ENABLE_ICONS: import.meta.env.VITE_DROPDOWN_ENABLE_ICONS !== "false",
  ENABLE_DISABLED_STYLES: import.meta.env.VITE_DROPDOWN_ENABLE_DISABLED_STYLES !== "false",
};

// ============================================================
// DropdownMenu Variants (cva)
// ============================================================

const dropdownItemVariants = cva(CONFIG.ITEM_BASE_STYLES, {
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

const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
const DropdownMenuGroup = DropdownMenuPrimitive.Group;
const DropdownMenuPortal = DropdownMenuPrimitive.Portal;
const DropdownMenuSub = DropdownMenuPrimitive.Sub;
const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

// ─── DropdownMenuSubTrigger ───────────────────────────────────

/**
 * DropdownMenuSubTrigger – Triggers a sub-menu.
 *
 * @param {Object} props
 * @param {string} props.inset - Add inset padding
 * @param {React.ReactNode} props.icon - Icon to display before children
 * @param {string} props.className - Additional CSS classes
 */
const DropdownMenuSubTrigger = React.forwardRef(
  ({ className, inset, children, icon, ...props }, ref) => (
    <DropdownMenuPrimitive.SubTrigger
      ref={ref}
      className={cn(
        CONFIG.SUB_TRIGGER_STYLES,
        inset && CONFIG.INSET_PADDING,
        className
      )}
      {...props}
    >
      {CONFIG.ENABLE_ICONS && icon && (
        <span className="flex-shrink-0">{icon}</span>
      )}
      {children}
      <ChevronRight className="ml-auto" />
    </DropdownMenuPrimitive.SubTrigger>
  )
);
DropdownMenuSubTrigger.displayName = DropdownMenuPrimitive.SubTrigger.displayName;

// ─── DropdownMenuSubContent ───────────────────────────────────

const DropdownMenuSubContent = React.forwardRef(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.SubContent
    ref={ref}
    className={cn(CONFIG.SUB_CONTENT_STYLES, className)}
    {...props}
  />
));
DropdownMenuSubContent.displayName = DropdownMenuPrimitive.SubContent.displayName;

// ─── DropdownMenuContent ──────────────────────────────────────

/**
 * DropdownMenuContent – Main dropdown content container.
 *
 * @param {Object} props
 * @param {number} props.sideOffset - Offset from trigger
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.portal - Whether to portal the content
 */
const DropdownMenuContent = React.forwardRef(
  ({ className, sideOffset = 4, portal = true, ...props }, ref) => {
    const Content = portal ? DropdownMenuPrimitive.Portal : React.Fragment;
    const ContentComponent = DropdownMenuPrimitive.Content;

    return (
      <Content>
        <ContentComponent
          ref={ref}
          sideOffset={sideOffset}
          className={cn(CONFIG.CONTENT_STYLES, className)}
          {...props}
        />
      </Content>
    );
  }
);
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

// ─── DropdownMenuItem ─────────────────────────────────────────

/**
 * DropdownMenuItem – A selectable menu item.
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
const DropdownMenuItem = React.forwardRef(
  ({ className, inset, children, icon, rightIcon, shortcut, variant, ...props }, ref) => (
    <DropdownMenuPrimitive.Item
      ref={ref}
      className={cn(
        dropdownItemVariants({ variant }),
        inset && CONFIG.INSET_PADDING,
        className
      )}
      {...props}
    >
      {CONFIG.ENABLE_ICONS && icon && (
        <span className="flex-shrink-0">{icon}</span>
      )}
      {children}
      {shortcut && <DropdownMenuShortcut>{shortcut}</DropdownMenuShortcut>}
      {CONFIG.ENABLE_ICONS && rightIcon && (
        <span className="ml-auto flex-shrink-0">{rightIcon}</span>
      )}
    </DropdownMenuPrimitive.Item>
  )
);
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

// ─── DropdownMenuCheckboxItem ─────────────────────────────────

/**
 * DropdownMenuCheckboxItem – A checkbox item.
 *
 * @param {Object} props
 * @param {boolean} props.checked - Whether the item is checked
 * @param {React.ReactNode} props.children - Item content
 * @param {string} props.className - Additional CSS classes
 */
const DropdownMenuCheckboxItem = React.forwardRef(
  ({ className, children, checked, ...props }, ref) => (
    <DropdownMenuPrimitive.CheckboxItem
      ref={ref}
      className={cn(CONFIG.CHECKBOX_ITEM_STYLES, className)}
      checked={checked}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Check className="h-4 w-4" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  )
);
DropdownMenuCheckboxItem.displayName = DropdownMenuPrimitive.CheckboxItem.displayName;

// ─── DropdownMenuRadioItem ────────────────────────────────────

/**
 * DropdownMenuRadioItem – A radio item.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Item content
 * @param {string} props.className - Additional CSS classes
 */
const DropdownMenuRadioItem = React.forwardRef(
  ({ className, children, ...props }, ref) => (
    <DropdownMenuPrimitive.RadioItem
      ref={ref}
      className={cn(CONFIG.RADIO_ITEM_STYLES, className)}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Circle className="h-2 w-2 fill-current" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  )
);
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName;

// ─── DropdownMenuLabel ────────────────────────────────────────

/**
 * DropdownMenuLabel – A label for a group of items.
 *
 * @param {Object} props
 * @param {string} props.inset - Add inset padding
 * @param {React.ReactNode} props.icon - Icon to display before label
 * @param {string} props.className - Additional CSS classes
 */
const DropdownMenuLabel = React.forwardRef(
  ({ className, inset, children, icon, ...props }, ref) => (
    <DropdownMenuPrimitive.Label
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
    </DropdownMenuPrimitive.Label>
  )
);
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

// ─── DropdownMenuSeparator ────────────────────────────────────

const DropdownMenuSeparator = React.forwardRef(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn(CONFIG.SEPARATOR_STYLES, className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

// ─── DropdownMenuShortcut ─────────────────────────────────────

/**
 * DropdownMenuShortcut – Keyboard shortcut indicator.
 *
 * @param {Object} props
 * @param {string} props.className - Additional CSS classes
 */
const DropdownMenuShortcut = ({ className, ...props }) => {
  return (
    <span className={cn(CONFIG.SHORTCUT_STYLES, className)} {...props} />
  );
};
DropdownMenuShortcut.displayName = "DropdownMenuShortcut";

// ============================================================
// Exports
// ============================================================

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
};
