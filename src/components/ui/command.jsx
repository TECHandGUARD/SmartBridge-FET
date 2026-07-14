// src/components/ui/command.jsx
import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { Search, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";

// ============================================================
// 🔧 SOFT-CODED CONFIGURATION
// ============================================================

const CONFIG = {
  // Default placeholder
  PLACEHOLDER: import.meta.env.VITE_COMMAND_PLACEHOLDER || "Search...",

  // Default empty message
  EMPTY_MESSAGE: import.meta.env.VITE_COMMAND_EMPTY_MSG || "No results found.",

  // Loading message
  LOADING_MESSAGE: import.meta.env.VITE_COMMAND_LOADING_MSG || "Loading...",

  // Search icon size
  SEARCH_ICON_SIZE: import.meta.env.VITE_COMMAND_SEARCH_ICON_SIZE || "h-4 w-4",

  // Input height
  INPUT_HEIGHT: import.meta.env.VITE_COMMAND_INPUT_HEIGHT || "h-10",

  // List max height
  LIST_MAX_HEIGHT: import.meta.env.VITE_COMMAND_LIST_MAX_HEIGHT || "max-h-[300px]",

  // Item padding
  ITEM_PADDING: import.meta.env.VITE_COMMAND_ITEM_PADDING || "px-2 py-1.5",

  // Styles
  BASE_STYLES: import.meta.env.VITE_COMMAND_BASE_STYLES || "flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground",

  // Input wrapper styles
  INPUT_WRAPPER_STYLES: import.meta.env.VITE_COMMAND_INPUT_WRAPPER_STYLES || "flex items-center border-b px-3",

  // Group styles
  GROUP_STYLES: import.meta.env.VITE_COMMAND_GROUP_STYLES || "overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground",

  // Item styles
  ITEM_STYLES: import.meta.env.VITE_COMMAND_ITEM_STYLES || "relative flex cursor-default gap-2 select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[disabled=true]:pointer-events-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",

  // Shortcut styles
  SHORTCUT_STYLES: import.meta.env.VITE_COMMAND_SHORTCUT_STYLES || "ml-auto text-xs tracking-widest text-muted-foreground",

  // Feature flags
  ENABLE_LOADING: import.meta.env.VITE_COMMAND_ENABLE_LOADING !== "false",
  ENABLE_FOOTER: import.meta.env.VITE_COMMAND_ENABLE_FOOTER !== "false",
};

// ============================================================
// Command Context
// ============================================================

const CommandContext = React.createContext(null);

function useCommandContext() {
  const context = React.useContext(CommandContext);
  if (!context) {
    throw new Error("Command sub-components must be used within a Command");
  }
  return context;
}

// ============================================================
// Main Command Component
// ============================================================

/**
 * Command – A powerful command palette / search component.
 *
 * @param {Object} props
 * @param {string} props.placeholder - Input placeholder
 * @param {string} props.emptyMessage - Message when no results
 * @param {string} props.loadingMessage - Message when loading
 * @param {React.ReactNode} props.loadingIndicator - Custom loading indicator
 * @param {boolean} props.loading - Whether to show loading state
 * @param {React.ReactNode} props.footer - Footer content
 * @param {string} props.className - Additional CSS classes
 * @param {React.ReactNode} props.children - Command content
 * @param {function} props.onValueChange - Callback when input value changes
 * @param {function} props.filter - Custom filter function
 * @param {boolean} props.shouldFilter - Whether to filter items
 * @param {boolean} props.loop - Whether to loop navigation
 * @param {string} props.label - Accessible label for the command
 *
 * @example
 * <Command>
 *   <CommandInput placeholder="Search..." />
 *   <CommandList>
 *     <CommandEmpty>No results</CommandEmpty>
 *     <CommandGroup heading="Fruits">
 *       <CommandItem>Apple</CommandItem>
 *       <CommandItem>Banana</CommandItem>
 *     </CommandGroup>
 *   </CommandList>
 * </Command>
 */
const Command = React.forwardRef(
  (
    {
      className,
      children,
      placeholder = CONFIG.PLACEHOLDER,
      emptyMessage = CONFIG.EMPTY_MESSAGE,
      loadingMessage = CONFIG.LOADING_MESSAGE,
      loadingIndicator,
      loading = false,
      footer,
      onValueChange,
      filter,
      shouldFilter,
      loop,
      label = "Command Palette",
      ...props
    },
    ref
  ) => {
    const contextValue = React.useMemo(
      () => ({
        placeholder,
        emptyMessage,
        loadingMessage,
        loadingIndicator,
        loading,
        footer,
      }),
      [placeholder, emptyMessage, loadingMessage, loadingIndicator, loading, footer]
    );

    return (
      <CommandContext.Provider value={contextValue}>
        <CommandPrimitive
          ref={ref}
          className={cn(CONFIG.BASE_STYLES, className)}
          shouldFilter={shouldFilter}
          filter={filter}
          loop={loop}
          onValueChange={onValueChange}
          label={label}
          {...props}
        >
          {children}
          {CONFIG.ENABLE_FOOTER && footer && (
            <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
              {footer}
            </div>
          )}
        </CommandPrimitive>
      </CommandContext.Provider>
    );
  }
);
Command.displayName = CommandPrimitive.displayName;

// ============================================================
// CommandDialog
// ============================================================

/**
 * CommandDialog – A command palette inside a dialog.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Command content
 * @param {boolean} props.open - Controlled open state
 * @param {function} props.onOpenChange - Callback when open state changes
 * @param {string} props.className - Additional CSS classes
 */
const CommandDialog = ({ children, ...props }) => {
  return (
    <Dialog {...props}>
      <DialogContent className="overflow-hidden p-0">
        <Command
          className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5"
        >
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  );
};

// ============================================================
// CommandInput
// ============================================================

/**
 * CommandInput – The search input field.
 *
 * @param {Object} props
 * @param {string} props.placeholder - Input placeholder (overrides context)
 * @param {React.ReactNode} props.icon - Custom search icon
 * @param {string} props.className - Additional CSS classes
 * @param {React.Ref} ref - Forwarded ref
 */
const CommandInput = React.forwardRef(({ className, placeholder, icon, ...props }, ref) => {
  const context = useCommandContext();
  const inputPlaceholder = placeholder || context.placeholder;
  const SearchIcon = icon || Search;

  return (
    <div className={cn(CONFIG.INPUT_WRAPPER_STYLES)} cmdk-input-wrapper="">
      <SearchIcon className={cn("mr-2 shrink-0 opacity-50", CONFIG.SEARCH_ICON_SIZE)} />
      <CommandPrimitive.Input
        ref={ref}
        className={cn(
          "flex w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
          CONFIG.INPUT_HEIGHT,
          className
        )}
        placeholder={inputPlaceholder}
        {...props}
      />
    </div>
  );
});
CommandInput.displayName = CommandPrimitive.Input.displayName;

// ============================================================
// CommandList
// ============================================================

/**
 * CommandList – The scrollable list of items.
 *
 * @param {Object} props
 * @param {string} props.className - Additional CSS classes
 * @param {React.ReactNode} props.children - Command items
 */
const CommandList = React.forwardRef(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn(CONFIG.LIST_MAX_HEIGHT, "overflow-y-auto overflow-x-hidden", className)}
    {...props}
  />
));
CommandList.displayName = CommandPrimitive.List.displayName;

// ============================================================
// CommandEmpty
// ============================================================

/**
 * CommandEmpty – Displayed when no results are found.
 *
 * @param {Object} props
 * @param {string} props.message - Custom empty message (overrides context)
 * @param {React.ReactNode} props.icon - Custom empty icon
 * @param {string} props.className - Additional CSS classes
 */
const CommandEmpty = React.forwardRef(({ className, message, icon, ...props }, ref) => {
  const context = useCommandContext();
  const emptyMessage = message || context.emptyMessage;

  return (
    <CommandPrimitive.Empty
      ref={ref}
      className={cn("py-6 text-center text-sm", className)}
      {...props}
    >
      {icon && <div className="mx-auto mb-2">{icon}</div>}
      {emptyMessage}
    </CommandPrimitive.Empty>
  );
});
CommandEmpty.displayName = CommandPrimitive.Empty.displayName;

// ============================================================
// CommandLoading
// ============================================================

/**
 * CommandLoading – Displayed while loading items.
 *
 * @param {Object} props
 * @param {string} props.message - Custom loading message (overrides context)
 * @param {React.ReactNode} props.icon - Custom loading icon
 * @param {string} props.className - Additional CSS classes
 */
const CommandLoading = React.forwardRef(({ className, message, icon, ...props }, ref) => {
  const context = useCommandContext();
  const loadingMessage = message || context.loadingMessage;
  const LoadingIcon = icon || Loader2;

  if (!CONFIG.ENABLE_LOADING) return null;

  return (
    <div
      ref={ref}
      className={cn("py-6 text-center text-sm", className)}
      {...props}
    >
      <LoadingIcon className="mx-auto mb-2 h-6 w-6 animate-spin text-muted-foreground" />
      {loadingMessage}
    </div>
  );
});
CommandLoading.displayName = "CommandLoading";

// ============================================================
// CommandGroup
// ============================================================

/**
 * CommandGroup – A group of related items with an optional heading.
 *
 * @param {Object} props
 * @param {string} props.heading - Group heading
 * @param {string} props.className - Additional CSS classes
 * @param {React.ReactNode} props.children - Command items
 */
const CommandGroup = React.forwardRef(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn(CONFIG.GROUP_STYLES, className)}
    {...props}
  />
));
CommandGroup.displayName = CommandPrimitive.Group.displayName;

// ============================================================
// CommandSeparator
// ============================================================

/**
 * CommandSeparator – A horizontal separator line.
 *
 * @param {Object} props
 * @param {string} props.className - Additional CSS classes
 */
const CommandSeparator = React.forwardRef(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 h-px bg-border", className)}
    {...props}
  />
));
CommandSeparator.displayName = CommandPrimitive.Separator.displayName;

// ============================================================
// CommandItem
// ============================================================

/**
 * CommandItem – An individual selectable item.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Item content
 * @param {React.ReactNode} props.icon - Item icon (rendered before children)
 * @param {React.ReactNode} props.rightIcon - Item icon (rendered after children)
 * @param {string} props.shortcut - Keyboard shortcut (e.g., "⌘K")
 * @param {boolean} props.disabled - Whether the item is disabled
 * @param {function} props.onSelect - Callback when item is selected
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.selected - Whether the item is selected
 */
const CommandItem = React.forwardRef(
  ({ className, children, icon, rightIcon, shortcut, onSelect, ...props }, ref) => {
    const handleSelect = (value) => {
      onSelect?.(value);
    };

    return (
      <CommandPrimitive.Item
        ref={ref}
        className={cn(CONFIG.ITEM_STYLES, className)}
        onSelect={handleSelect}
        {...props}
      >
        {icon && <span className="flex-shrink-0">{icon}</span>}
        {children}
        {shortcut && <CommandShortcut>{shortcut}</CommandShortcut>}
        {rightIcon && <span className="ml-auto flex-shrink-0">{rightIcon}</span>}
      </CommandPrimitive.Item>
    );
  }
);
CommandItem.displayName = CommandPrimitive.Item.displayName;

// ============================================================
// CommandShortcut
// ============================================================

/**
 * CommandShortcut – A keyboard shortcut indicator.
 *
 * @param {Object} props
 * @param {string} props.className - Additional CSS classes
 * @param {React.ReactNode} props.children - Shortcut text
 */
const CommandShortcut = ({ className, ...props }) => {
  return (
    <span className={cn(CONFIG.SHORTCUT_STYLES, className)} {...props} />
  );
};
CommandShortcut.displayName = "CommandShortcut";

// ============================================================
// Exports
// ============================================================

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
  CommandLoading,
};
