"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";
import { Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
const CONFIG = {
  THEMES: {
    light: "",
    dark: ".dark"
  },
  COLORS: {
    DEFAULT: import.meta.env.VITE_CHART_COLORS || "hsl(var(--chart-1)),hsl(var(--chart-2)),hsl(var(--chart-3)),hsl(var(--chart-4)),hsl(var(--chart-5))"
  },
  SIZES: {
    SM: import.meta.env.VITE_CHART_SIZE_SM || "h-40",
    DEFAULT: import.meta.env.VITE_CHART_SIZE_DEFAULT || "aspect-video",
    LG: import.meta.env.VITE_CHART_SIZE_LG || "h-96",
    XL: import.meta.env.VITE_CHART_SIZE_XL || "h-[500px]"
  },
  TOOLTIP_STYLES: import.meta.env.VITE_CHART_TOOLTIP_STYLES || "grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl",
  LEGEND_STYLES: import.meta.env.VITE_CHART_LEGEND_STYLES || "flex items-center justify-center gap-4",
  ENABLE_ANIMATION: import.meta.env.VITE_CHART_ENABLE_ANIMATION !== "false",
  ENABLE_GRID: import.meta.env.VITE_CHART_ENABLE_GRID !== "false",
  ENABLE_TOOLTIP: import.meta.env.VITE_CHART_ENABLE_TOOLTIP !== "false",
  ENABLE_LEGEND: import.meta.env.VITE_CHART_ENABLE_LEGEND !== "false",
  MESSAGES: {
    LOADING: import.meta.env.VITE_CHART_LOADING_MSG || "Loading chart...",
    NO_DATA: import.meta.env.VITE_CHART_NO_DATA_MSG || "No data available",
    ERROR: import.meta.env.VITE_CHART_ERROR_MSG || "Failed to load chart data"
  }
};
const ChartContext = React.createContext(null);
function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }
  return context;
}
const ChartContainer = React.forwardRef(({
  id,
  className,
  children,
  config,
  size = "default",
  loading = false,
  emptyMessage = CONFIG.MESSAGES.NO_DATA,
  title,
  description,
  ...props
}, ref) => {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;
  const hasData = React.Children.count(children) > 0;
  const sizeClass = CONFIG.SIZES[size] || CONFIG.SIZES.DEFAULT;
  if (loading) {
    return <div className={cn("flex flex-col items-center justify-center rounded-lg border border-border/50 bg-card p-8", sizeClass, className)}>
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">{CONFIG.MESSAGES.LOADING}</p>
        </div>;
  }
  if (!hasData) {
    return <div className={cn("flex flex-col items-center justify-center rounded-lg border border-dashed border-border/50 bg-card p-8", sizeClass, className)}>
          <AlertCircle className="h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">{emptyMessage}</p>
        </div>;
  }
  return <ChartContext.Provider value={{
    config
  }}>
        <div className="space-y-2">
          {title && <div>
              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
              {description && <p className="text-xs text-muted-foreground">{description}</p>}
            </div>}
          <div data-chart={chartId} ref={ref} className={cn("flex w-full justify-center text-xs", sizeClass, "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none", className)} {...props}>
            <ChartStyle id={chartId} config={config} />
            <RechartsPrimitive.ResponsiveContainer width="100%" height="100%">
              {children}
            </RechartsPrimitive.ResponsiveContainer>
          </div>
        </div>
      </ChartContext.Provider>;
});
ChartContainer.displayName = "Chart";
const ChartStyle = ({
  id,
  config
}) => {
  const colorConfig = Object.entries(config).filter(([, config]) => config.theme || config.color);
  if (!colorConfig.length) return null;
  const themeEntries = Object.entries(CONFIG.THEMES).map(([theme, prefix]) => {
    const colorStyles = colorConfig.map(([key, itemConfig]) => {
      const color = itemConfig.theme?.[theme] || itemConfig.color;
      return color ? `  --color-${key}: ${color};` : null;
    }).filter(Boolean).join("\n");
    if (!colorStyles) return null;
    return `${prefix} [data-chart=${id}] {\n${colorStyles}\n}`;
  }).filter(Boolean).join("\n");
  if (!themeEntries) return null;
  return <style>{themeEntries}</style>;
};
const ChartTooltip = RechartsPrimitive.Tooltip;
const ChartTooltipContent = React.forwardRef(({
  active,
  payload,
  className,
  indicator = "dot",
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
  labelClassName,
  formatter,
  color,
  nameKey,
  labelKey
}, ref) => {
  const {
    config
  } = useChart();
  const tooltipLabel = React.useMemo(() => {
    if (hideLabel || !payload?.length) return null;
    const [item] = payload;
    const key = `${labelKey || item.dataKey || item.name || "value"}`;
    const itemConfig = getPayloadConfigFromPayload(config, item, key);
    const value = !labelKey && typeof label === "string" ? config[label]?.label || label : itemConfig?.label;
    if (labelFormatter) {
      return <div className={cn("font-medium", labelClassName)}>
            {labelFormatter(value, payload)}
          </div>;
    }
    if (!value) return null;
    return <div className={cn("font-medium", labelClassName)}>{value}</div>;
  }, [label, labelFormatter, payload, hideLabel, labelClassName, config, labelKey]);
  if (!active || !payload?.length) return null;
  const nestLabel = payload.length === 1 && indicator !== "dot";
  return <div ref={ref} className={cn(CONFIG.TOOLTIP_STYLES, className)}>
        {!nestLabel ? tooltipLabel : null}
        <div className="grid gap-1.5">
          {payload.map((item, index) => {
        const key = `${nameKey || item.name || item.dataKey || "value"}`;
        const itemConfig = getPayloadConfigFromPayload(config, item, key);
        const indicatorColor = color || item.payload.fill || item.color;
        return <div key={item.dataKey} className={cn("flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground", indicator === "dot" && "items-center")}>
                {formatter && item?.value !== undefined && item.name ? formatter(item.value, item.name, item, index, item.payload) : <>
                    {itemConfig?.icon ? <itemConfig.icon /> : !hideIndicator && <div className={cn("shrink-0 rounded-[2px] border-[--color-border] bg-[--color-bg]", {
              "h-2.5 w-2.5": indicator === "dot",
              "w-1": indicator === "line",
              "w-0 border-[1.5px] border-dashed bg-transparent": indicator === "dashed",
              "my-0.5": nestLabel && indicator === "dashed"
            })} style={{
              "--color-bg": indicatorColor,
              "--color-border": indicatorColor
            }} />}
                    <div className={cn("flex flex-1 justify-between leading-none", nestLabel ? "items-end" : "items-center")}>
                      <div className="grid gap-1.5">
                        {nestLabel ? tooltipLabel : null}
                        <span className="text-muted-foreground">
                          {itemConfig?.label || item.name}
                        </span>
                      </div>
                      {item.value !== undefined && <span className="font-mono font-medium tabular-nums text-foreground">
                          {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
                        </span>}
                    </div>
                  </>}
              </div>;
      })}
        </div>
      </div>;
});
ChartTooltipContent.displayName = "ChartTooltip";
const ChartLegend = RechartsPrimitive.Legend;
const ChartLegendContent = React.forwardRef(({
  className,
  hideIcon = false,
  payload,
  verticalAlign = "bottom",
  nameKey,
  ...props
}, ref) => {
  const {
    config
  } = useChart();
  if (!payload?.length) return null;
  return <div ref={ref} className={cn(CONFIG.LEGEND_STYLES, verticalAlign === "top" ? "pb-3" : "pt-3", className)} {...props}>
        {payload.map(item => {
      const key = `${nameKey || item.dataKey || "value"}`;
      const itemConfig = getPayloadConfigFromPayload(config, item, key);
      return <div key={item.value} className={cn("flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground")}>
              {itemConfig?.icon && !hideIcon ? <itemConfig.icon /> : <div className="h-2 w-2 shrink-0 rounded-[2px]" style={{
          backgroundColor: item.color
        }} />}
              {itemConfig?.label || item.value}
            </div>;
    })}
      </div>;
});
ChartLegendContent.displayName = "ChartLegend";
function getPayloadConfigFromPayload(config, payload, key) {
  if (typeof payload !== "object" || payload === null) return undefined;
  const payloadPayload = "payload" in payload && typeof payload.payload === "object" && payload.payload !== null ? payload.payload : undefined;
  let configLabelKey = key;
  if (key in payload && typeof payload[key] === "string") {
    configLabelKey = payload[key];
  } else if (payloadPayload && key in payloadPayload && typeof payloadPayload[key] === "string") {
    configLabelKey = payloadPayload[key];
  }
  return configLabelKey in config ? config[configLabelKey] : config[key];
}
export { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, ChartStyle };
