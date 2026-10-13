import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Check, ChevronRight, Circle } from "lucide-react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
const CONFIG = {
  CONTENT_STYLES: import.meta.env.VITE_DROPDOWN_CONTENT_STYLES || "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
  SUB_CONTENT_STYLES: import.meta.env.VITE_DROPDOWN_SUB_CONTENT_STYLES || "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
  ITEM_BASE_STYLES: import.meta.env.VITE_DROPDOWN_ITEM_BASE_STYLES || "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0",
  SUB_TRIGGER_STYLES: import.meta.env.VITE_DROPDOWN_SUB_TRIGGER_STYLES || "flex cursor-default gap-2 select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  CHECKBOX_ITEM_STYLES: import.meta.env.VITE_DROPDOWN_CHECKBOX_ITEM_STYLES || "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
  RADIO_ITEM_STYLES: import.meta.env.VITE_DROPDOWN_RADIO_ITEM_STYLES || "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
  LABEL_STYLES: import.meta.env.VITE_DROPDOWN_LABEL_STYLES || "px-2 py-1.5 text-sm font-semibold",
  SEPARATOR_STYLES: import.meta.env.VITE_DROPDOWN_SEPARATOR_STYLES || "-mx-1 my-1 h-px bg-muted",
  SHORTCUT_STYLES: import.meta.env.VITE_DROPDOWN_SHORTCUT_STYLES || "ml-auto text-xs tracking-widest opacity-60",
  INSET_PADDING: import.meta.env.VITE_DROPDOWN_INSET_PADDING || "pl-8",
  VARIANTS: {
    DEFAULT: import.meta.env.VITE_DROPDOWN_VARIANT_DEFAULT || "",
    DESTRUCTIVE: import.meta.env.VITE_DROPDOWN_VARIANT_DESTRUCTIVE || "text-destructive focus:bg-destructive/10 focus:text-destructive",
    SUCCESS: import.meta.env.VITE_DROPDOWN_VARIANT_SUCCESS || "text-green-600 focus:bg-green-50 focus:text-green-700"
  },
  ENABLE_ICONS: import.meta.env.VITE_DROPDOWN_ENABLE_ICONS !== "false",
  ENABLE_DISABLED_STYLES: import.meta.env.VITE_DROPDOWN_ENABLE_DISABLED_STYLES !== "false"
};
const dropdownItemVariants = cva(CONFIG.ITEM_BASE_STYLES, {
  variants: {
    variant: {
      default: CONFIG.VARIANTS.DEFAULT,
      destructive: CONFIG.VARIANTS.DESTRUCTIVE,
      success: CONFIG.VARIANTS.SUCCESS
    }
  },
  defaultVariants: {
    variant: "default"
  }
});
const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
const DropdownMenuGroup = DropdownMenuPrimitive.Group;
const DropdownMenuPortal = DropdownMenuPrimitive.Portal;
const DropdownMenuSub = DropdownMenuPrimitive.Sub;
const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;
const DropdownMenuSubTrigger = React.forwardRef(({
  className,
  inset,
  children,
  icon,
  ...props
}, ref) => <DropdownMenuPrimitive.SubTrigger ref={ref} className={cn(CONFIG.SUB_TRIGGER_STYLES, inset && CONFIG.INSET_PADDING, className)} {...props}>
      {CONFIG.ENABLE_ICONS && icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
      <ChevronRight className="ml-auto" />
    </DropdownMenuPrimitive.SubTrigger>);
DropdownMenuSubTrigger.displayName = DropdownMenuPrimitive.SubTrigger.displayName;
const DropdownMenuSubContent = React.forwardRef(({
  className,
  ...props
}, ref) => <DropdownMenuPrimitive.SubContent ref={ref} className={cn(CONFIG.SUB_CONTENT_STYLES, className)} {...props} />);
DropdownMenuSubContent.displayName = DropdownMenuPrimitive.SubContent.displayName;
const DropdownMenuContent = React.forwardRef(({
  className,
  sideOffset = 4,
  portal = true,
  ...props
}, ref) => {
  const Content = portal ? DropdownMenuPrimitive.Portal : React.Fragment;
  const ContentComponent = DropdownMenuPrimitive.Content;
  return <Content>
        <ContentComponent ref={ref} sideOffset={sideOffset} className={cn(CONFIG.CONTENT_STYLES, className)} {...props} />
      </Content>;
});
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;
const DropdownMenuItem = React.forwardRef(({
  className,
  inset,
  children,
  icon,
  rightIcon,
  shortcut,
  variant,
  ...props
}, ref) => <DropdownMenuPrimitive.Item ref={ref} className={cn(dropdownItemVariants({
  variant
}), inset && CONFIG.INSET_PADDING, className)} {...props}>
      {CONFIG.ENABLE_ICONS && icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
      {shortcut && <DropdownMenuShortcut>{shortcut}</DropdownMenuShortcut>}
      {CONFIG.ENABLE_ICONS && rightIcon && <span className="ml-auto flex-shrink-0">{rightIcon}</span>}
    </DropdownMenuPrimitive.Item>);
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;
const DropdownMenuCheckboxItem = React.forwardRef(({
  className,
  children,
  checked,
  ...props
}, ref) => <DropdownMenuPrimitive.CheckboxItem ref={ref} className={cn(CONFIG.CHECKBOX_ITEM_STYLES, className)} checked={checked} {...props}>
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Check className="h-4 w-4" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>);
DropdownMenuCheckboxItem.displayName = DropdownMenuPrimitive.CheckboxItem.displayName;
const DropdownMenuRadioItem = React.forwardRef(({
  className,
  children,
  ...props
}, ref) => <DropdownMenuPrimitive.RadioItem ref={ref} className={cn(CONFIG.RADIO_ITEM_STYLES, className)} {...props}>
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Circle className="h-2 w-2 fill-current" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>);
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName;
const DropdownMenuLabel = React.forwardRef(({
  className,
  inset,
  children,
  icon,
  ...props
}, ref) => <DropdownMenuPrimitive.Label ref={ref} className={cn(CONFIG.LABEL_STYLES, inset && CONFIG.INSET_PADDING, className)} {...props}>
      {CONFIG.ENABLE_ICONS && icon && <span className="mr-2 inline-flex">{icon}</span>}
      {children}
    </DropdownMenuPrimitive.Label>);
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;
const DropdownMenuSeparator = React.forwardRef(({
  className,
  ...props
}, ref) => <DropdownMenuPrimitive.Separator ref={ref} className={cn(CONFIG.SEPARATOR_STYLES, className)} {...props} />);
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;
const DropdownMenuShortcut = ({
  className,
  ...props
}) => {
  return <span className={cn(CONFIG.SHORTCUT_STYLES, className)} {...props} />;
};
DropdownMenuShortcut.displayName = "DropdownMenuShortcut";
export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuRadioItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuGroup, DropdownMenuPortal, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuRadioGroup };
