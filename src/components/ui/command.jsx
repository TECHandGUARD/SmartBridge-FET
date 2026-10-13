import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
const CONFIG = {
  PLACEHOLDER: import.meta.env.VITE_COMMAND_PLACEHOLDER || "Search...",
  EMPTY_MESSAGE: import.meta.env.VITE_COMMAND_EMPTY_MSG || "No results found.",
  LOADING_MESSAGE: import.meta.env.VITE_COMMAND_LOADING_MSG || "Loading...",
  SEARCH_ICON_SIZE: import.meta.env.VITE_COMMAND_SEARCH_ICON_SIZE || "h-4 w-4",
  INPUT_HEIGHT: import.meta.env.VITE_COMMAND_INPUT_HEIGHT || "h-10",
  LIST_MAX_HEIGHT: import.meta.env.VITE_COMMAND_LIST_MAX_HEIGHT || "max-h-[300px]",
  ITEM_PADDING: import.meta.env.VITE_COMMAND_ITEM_PADDING || "px-2 py-1.5",
  BASE_STYLES: import.meta.env.VITE_COMMAND_BASE_STYLES || "flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground",
  INPUT_WRAPPER_STYLES: import.meta.env.VITE_COMMAND_INPUT_WRAPPER_STYLES || "flex items-center border-b px-3",
  GROUP_STYLES: import.meta.env.VITE_COMMAND_GROUP_STYLES || "overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground",
  ITEM_STYLES: import.meta.env.VITE_COMMAND_ITEM_STYLES || "relative flex cursor-default gap-2 select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[disabled=true]:pointer-events-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  SHORTCUT_STYLES: import.meta.env.VITE_COMMAND_SHORTCUT_STYLES || "ml-auto text-xs tracking-widest text-muted-foreground",
  ENABLE_LOADING: import.meta.env.VITE_COMMAND_ENABLE_LOADING !== "false",
  ENABLE_FOOTER: import.meta.env.VITE_COMMAND_ENABLE_FOOTER !== "false"
};
const CommandContext = React.createContext(null);
function useCommandContext() {
  const context = React.useContext(CommandContext);
  if (!context) {
    throw new Error("Command sub-components must be used within a Command");
  }
  return context;
}
const Command = React.forwardRef(({
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
}, ref) => {
  const contextValue = React.useMemo(() => ({
    placeholder,
    emptyMessage,
    loadingMessage,
    loadingIndicator,
    loading,
    footer
  }), [placeholder, emptyMessage, loadingMessage, loadingIndicator, loading, footer]);
  return <CommandContext.Provider value={contextValue}>
        <CommandPrimitive ref={ref} className={cn(CONFIG.BASE_STYLES, className)} shouldFilter={shouldFilter} filter={filter} loop={loop} onValueChange={onValueChange} label={label} {...props}>
          {children}
          {CONFIG.ENABLE_FOOTER && footer && <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
              {footer}
            </div>}
        </CommandPrimitive>
      </CommandContext.Provider>;
});
Command.displayName = CommandPrimitive.displayName;
const CommandDialog = ({
  children,
  ...props
}) => {
  return <Dialog {...props}>
      <DialogContent className="overflow-hidden p-0">
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          {children}
        </Command>
      </DialogContent>
    </Dialog>;
};
const CommandInput = React.forwardRef(({
  className,
  placeholder,
  icon,
  ...props
}, ref) => {
  const context = useCommandContext();
  const inputPlaceholder = placeholder || context.placeholder;
  const SearchIcon = icon || Search;
  return <div className={cn(CONFIG.INPUT_WRAPPER_STYLES)} cmdk-input-wrapper="">
      <SearchIcon className={cn("mr-2 shrink-0 opacity-50", CONFIG.SEARCH_ICON_SIZE)} />
      <CommandPrimitive.Input ref={ref} className={cn("flex w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50", CONFIG.INPUT_HEIGHT, className)} placeholder={inputPlaceholder} {...props} />
    </div>;
});
CommandInput.displayName = CommandPrimitive.Input.displayName;
const CommandList = React.forwardRef(({
  className,
  ...props
}, ref) => <CommandPrimitive.List ref={ref} className={cn(CONFIG.LIST_MAX_HEIGHT, "overflow-y-auto overflow-x-hidden", className)} {...props} />);
CommandList.displayName = CommandPrimitive.List.displayName;
const CommandEmpty = React.forwardRef(({
  className,
  message,
  icon,
  ...props
}, ref) => {
  const context = useCommandContext();
  const emptyMessage = message || context.emptyMessage;
  return <CommandPrimitive.Empty ref={ref} className={cn("py-6 text-center text-sm", className)} {...props}>
      {icon && <div className="mx-auto mb-2">{icon}</div>}
      {emptyMessage}
    </CommandPrimitive.Empty>;
});
CommandEmpty.displayName = CommandPrimitive.Empty.displayName;
const CommandLoading = React.forwardRef(({
  className,
  message,
  icon,
  ...props
}, ref) => {
  const context = useCommandContext();
  const loadingMessage = message || context.loadingMessage;
  const LoadingIcon = icon || Loader2;
  if (!CONFIG.ENABLE_LOADING) return null;
  return <div ref={ref} className={cn("py-6 text-center text-sm", className)} {...props}>
      <LoadingIcon className="mx-auto mb-2 h-6 w-6 animate-spin text-muted-foreground" />
      {loadingMessage}
    </div>;
});
CommandLoading.displayName = "CommandLoading";
const CommandGroup = React.forwardRef(({
  className,
  ...props
}, ref) => <CommandPrimitive.Group ref={ref} className={cn(CONFIG.GROUP_STYLES, className)} {...props} />);
CommandGroup.displayName = CommandPrimitive.Group.displayName;
const CommandSeparator = React.forwardRef(({
  className,
  ...props
}, ref) => <CommandPrimitive.Separator ref={ref} className={cn("-mx-1 h-px bg-border", className)} {...props} />);
CommandSeparator.displayName = CommandPrimitive.Separator.displayName;
const CommandItem = React.forwardRef(({
  className,
  children,
  icon,
  rightIcon,
  shortcut,
  onSelect,
  ...props
}, ref) => {
  const handleSelect = value => {
    onSelect?.(value);
  };
  return <CommandPrimitive.Item ref={ref} className={cn(CONFIG.ITEM_STYLES, className)} onSelect={handleSelect} {...props}>
        {icon && <span className="flex-shrink-0">{icon}</span>}
        {children}
        {shortcut && <CommandShortcut>{shortcut}</CommandShortcut>}
        {rightIcon && <span className="ml-auto flex-shrink-0">{rightIcon}</span>}
      </CommandPrimitive.Item>;
});
CommandItem.displayName = CommandPrimitive.Item.displayName;
const CommandShortcut = ({
  className,
  ...props
}) => {
  return <span className={cn(CONFIG.SHORTCUT_STYLES, className)} {...props} />;
};
CommandShortcut.displayName = "CommandShortcut";
export { Command, CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandShortcut, CommandSeparator, CommandLoading };
