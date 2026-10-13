import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { ChevronRight, MoreHorizontal, Slash } from "lucide-react";
import { cn } from "@/lib/utils";
const CONFIG = {
  SEPARATOR: import.meta.env.VITE_BREADCRUMB_SEPARATOR || "chevron",
  SIZES: {
    SM: import.meta.env.VITE_BREADCRUMB_SIZE_SM || "text-xs gap-1",
    DEFAULT: import.meta.env.VITE_BREADCRUMB_SIZE_DEFAULT || "text-sm gap-1.5 sm:gap-2.5",
    LG: import.meta.env.VITE_BREADCRUMB_SIZE_LG || "text-base gap-2 sm:gap-3"
  },
  LINK_STYLES: import.meta.env.VITE_BREADCRUMB_LINK_STYLES || "transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm",
  PAGE_STYLES: import.meta.env.VITE_BREADCRUMB_PAGE_STYLES || "font-normal text-foreground",
  LIST_STYLES: import.meta.env.VITE_BREADCRUMB_LIST_STYLES || "flex flex-wrap items-center break-words text-muted-foreground",
  ITEM_STYLES: import.meta.env.VITE_BREADCRUMB_ITEM_STYLES || "inline-flex items-center gap-1.5",
  ELLIPSIS_STYLES: import.meta.env.VITE_BREADCRUMB_ELLIPSIS_STYLES || "flex h-9 w-9 items-center justify-center",
  SEPARATOR_ICONS: {
    chevron: ChevronRight,
    slash: Slash,
    dot: () => <span className="text-muted-foreground/50">·</span>,
    none: () => null
  },
  ENABLE_HOME_ICON: import.meta.env.VITE_BREADCRUMB_ENABLE_HOME_ICON !== "false"
};
const Breadcrumb = React.forwardRef(({
  className,
  separator = CONFIG.SEPARATOR,
  size = "default",
  ...props
}, ref) => {
  const SeparatorIcon = CONFIG.SEPARATOR_ICONS[separator] || CONFIG.SEPARATOR_ICONS.chevron;
  const contextValue = React.useMemo(() => ({
    separator: SeparatorIcon,
    size: size
  }), [SeparatorIcon, size]);
  return <BreadcrumbProvider value={contextValue}>
      <nav ref={ref} aria-label="breadcrumb" className={className} {...props} />
    </BreadcrumbProvider>;
});
Breadcrumb.displayName = "Breadcrumb";
const BreadcrumbContext = React.createContext({
  separator: CONFIG.SEPARATOR_ICONS.chevron,
  size: "default"
});
const BreadcrumbProvider = BreadcrumbContext.Provider;
const useBreadcrumb = () => {
  const context = React.useContext(BreadcrumbContext);
  if (!context) {
    throw new Error("Breadcrumb components must be used within a Breadcrumb");
  }
  return context;
};
const BreadcrumbList = React.forwardRef(({
  className,
  ...props
}, ref) => {
  const {
    size
  } = useBreadcrumb();
  const sizeClass = CONFIG.SIZES[size] || CONFIG.SIZES.DEFAULT;
  return <ol ref={ref} className={cn(CONFIG.LIST_STYLES, sizeClass, className)} {...props} />;
});
BreadcrumbList.displayName = "BreadcrumbList";
const BreadcrumbItem = React.forwardRef(({
  className,
  ...props
}, ref) => <li ref={ref} className={cn(CONFIG.ITEM_STYLES, className)} {...props} />);
BreadcrumbItem.displayName = "BreadcrumbItem";
const BreadcrumbLink = React.forwardRef(({
  asChild,
  className,
  children,
  icon: Icon,
  ...props
}, ref) => {
  const Comp = asChild ? Slot : "a";
  return <Comp ref={ref} className={cn(CONFIG.LINK_STYLES, "inline-flex items-center gap-1", className)} {...props}>
      {CONFIG.ENABLE_HOME_ICON && Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
      {children}
    </Comp>;
});
BreadcrumbLink.displayName = "BreadcrumbLink";
const BreadcrumbPage = React.forwardRef(({
  className,
  ...props
}, ref) => <span ref={ref} role="link" aria-disabled="true" aria-current="page" className={cn(CONFIG.PAGE_STYLES, className)} {...props} />);
BreadcrumbPage.displayName = "BreadcrumbPage";
const BreadcrumbSeparator = ({
  children,
  className,
  icon: CustomIcon,
  ...props
}) => {
  const {
    separator: SeparatorIcon
  } = useBreadcrumb();
  const Icon = CustomIcon || SeparatorIcon || ChevronRight;
  return <li role="presentation" aria-hidden="true" className={cn("[&>svg]:w-3.5 [&>svg]:h-3.5", className)} {...props}>
      {children ?? <Icon />}
    </li>;
};
BreadcrumbSeparator.displayName = "BreadcrumbSeparator";
const BreadcrumbEllipsis = ({
  className,
  ...props
}) => <span role="presentation" aria-hidden="true" className={cn(CONFIG.ELLIPSIS_STYLES, className)} {...props}>
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More</span>
  </span>;
BreadcrumbEllipsis.displayName = "BreadcrumbEllipsis";
export { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator, BreadcrumbEllipsis };
