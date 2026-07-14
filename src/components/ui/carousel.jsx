// src/components/ui/carousel.jsx
import * as React from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ArrowLeft, ArrowRight, Circle } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// ============================================================
// 🔧 SOFT-CODED CONFIGURATION
// ============================================================

const CONFIG = {
  // Default options
  DEFAULT_ALIGN: import.meta.env.VITE_CAROUSEL_DEFAULT_ALIGN || "start",
  DEFAULT_LOOP: import.meta.env.VITE_CAROUSEL_DEFAULT_LOOP === "true",
  DEFAULT_SLIDES_TO_SCROLL: Number(import.meta.env.VITE_CAROUSEL_DEFAULT_SLIDES_TO_SCROLL) || 1,

  // Autoplay
  AUTOPLAY_ENABLED: import.meta.env.VITE_CAROUSEL_AUTOPLAY_ENABLED === "true",
  AUTOPLAY_DELAY: Number(import.meta.env.VITE_CAROUSEL_AUTOPLAY_DELAY) || 4000,
  AUTOPLAY_STOP_ON_INTERACTION: import.meta.env.VITE_CAROUSEL_AUTOPLAY_STOP_ON_INTERACTION !== "false",

  // Dots
  DOTS_ENABLED: import.meta.env.VITE_CAROUSEL_DOTS_ENABLED !== "false",
  DOTS_POSITION: import.meta.env.VITE_CAROUSEL_DOTS_POSITION || "bottom", // bottom | top | inside

  // Gap
  GAP: import.meta.env.VITE_CAROUSEL_GAP || "4", // Tailwind spacing unit (4 = 1rem)

  // Navigation
  NAV_POSITION: import.meta.env.VITE_CAROUSEL_NAV_POSITION || "outside", // outside | inside

  // Button styles
  BUTTON_VARIANT: import.meta.env.VITE_CAROUSEL_BUTTON_VARIANT || "outline",
  BUTTON_SIZE: import.meta.env.VITE_CAROUSEL_BUTTON_SIZE || "icon",
  BUTTON_ICON_SIZE: import.meta.env.VITE_CAROUSEL_BUTTON_ICON_SIZE || "h-4 w-4",

  // Messages
  MESSAGES: {
    PREVIOUS: import.meta.env.VITE_CAROUSEL_PREVIOUS_LABEL || "Previous slide",
    NEXT: import.meta.env.VITE_CAROUSEL_NEXT_LABEL || "Next slide",
    SLIDE: import.meta.env.VITE_CAROUSEL_SLIDE_LABEL || "Slide",
  },
};

// ============================================================
// Context
// ============================================================

const CarouselContext = React.createContext(null);

function useCarousel() {
  const context = React.useContext(CarouselContext);

  if (!context) {
    throw new Error("useCarousel must be used within a <Carousel />");
  }

  return context;
}

// ============================================================
// Main Component
// ============================================================

/**
 * Carousel – A responsive, accessible carousel with autoplay and dots.
 *
 * @param {Object} props
 * @param {string} props.orientation - 'horizontal' | 'vertical'
 * @param {Object} opts - Embla Carousel options
 * @param {Function} setApi - Callback to get the carousel API
 * @param {Array} plugins - Embla plugins
 * @param {string} className - Additional CSS classes
 * @param {React.ReactNode} children - Carousel content
 * @param {boolean} autoplay - Enable autoplay
 * @param {number} autoplayDelay - Autoplay interval in ms
 * @param {boolean} showDots - Show dots indicator
 * @param {string} gap - Gap between slides (Tailwind spacing value)
 * @param {string} navPosition - 'outside' | 'inside'
 *
 * @example
 * <Carousel autoplay showDots>
 *   <CarouselContent>
 *     <CarouselItem>Slide 1</CarouselItem>
 *     <CarouselItem>Slide 2</CarouselItem>
 *   </CarouselContent>
 *   <CarouselPrevious />
 *   <CarouselNext />
 * </Carousel>
 */
const Carousel = React.forwardRef(
  (
    {
      orientation = "horizontal",
      opts,
      setApi,
      plugins,
      className,
      children,
      autoplay = CONFIG.AUTOPLAY_ENABLED,
      autoplayDelay = CONFIG.AUTOPLAY_DELAY,
      showDots = CONFIG.DOTS_ENABLED,
      gap = CONFIG.GAP,
      navPosition = CONFIG.NAV_POSITION,
      ...props
    },
    ref
  ) => {
    // Merge default options with provided opts
    const mergedOpts = {
      align: CONFIG.DEFAULT_ALIGN,
      loop: CONFIG.DEFAULT_LOOP,
      slidesToScroll: CONFIG.DEFAULT_SLIDES_TO_SCROLL,
      ...opts,
      axis: orientation === "horizontal" ? "x" : "y",
    };

    const [carouselRef, api] = useEmblaCarousel(mergedOpts, plugins);
    const [canScrollPrev, setCanScrollPrev] = React.useState(false);
    const [canScrollNext, setCanScrollNext] = React.useState(false);
    const [selectedIndex, setSelectedIndex] = React.useState(0);
    const [scrollSnaps, setScrollSnaps] = React.useState([]);
    const autoplayTimerRef = React.useRef(null);

    const onSelect = React.useCallback((api) => {
      if (!api) return;
      setCanScrollPrev(api.canScrollPrev());
      setCanScrollNext(api.canScrollNext());
      setSelectedIndex(api.selectedScrollSnap());
      setScrollSnaps(api.scrollSnapList());
    }, []);

    const scrollPrev = React.useCallback(() => {
      api?.scrollPrev();
      resetAutoplay();
    }, [api]);

    const scrollNext = React.useCallback(() => {
      api?.scrollNext();
      resetAutoplay();
    }, [api]);

    const resetAutoplay = React.useCallback(() => {
      if (autoplayTimerRef.current) {
        clearTimeout(autoplayTimerRef.current);
        autoplayTimerRef.current = null;
      }
      if (autoplay && api) {
        autoplayTimerRef.current = setTimeout(() => {
          if (api.canScrollNext()) {
            api.scrollNext();
          } else if (mergedOpts.loop) {
            api.scrollTo(0);
          }
          resetAutoplay();
        }, autoplayDelay);
      }
    }, [autoplay, api, autoplayDelay, mergedOpts.loop]);

    // Effect: set API
    React.useEffect(() => {
      if (!api || !setApi) return;
      setApi(api);
    }, [api, setApi]);

    // Effect: onSelect
    React.useEffect(() => {
      if (!api) return;
      onSelect(api);
      api.on("reInit", onSelect);
      api.on("select", onSelect);

      return () => {
        api?.off("select", onSelect);
      };
    }, [api, onSelect]);

    // Effect: reset autoplay on select
    React.useEffect(() => {
      resetAutoplay();
    }, [resetAutoplay]);

    // Cleanup autoplay
    React.useEffect(() => {
      return () => {
        if (autoplayTimerRef.current) {
          clearTimeout(autoplayTimerRef.current);
        }
      };
    }, []);

    // Handle keyboard
    const handleKeyDown = React.useCallback(
      (event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          scrollPrev();
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          scrollNext();
        }
      },
      [scrollPrev, scrollNext]
    );

    const contextValue = {
      carouselRef,
      api,
      opts: mergedOpts,
      orientation: orientation || (opts?.axis === "y" ? "vertical" : "horizontal"),
      scrollPrev,
      scrollNext,
      canScrollPrev,
      canScrollNext,
      selectedIndex,
      scrollSnaps,
      gap,
      navPosition,
    };

    // Dots component
    const renderDots = () => {
      if (!showDots || scrollSnaps.length <= 1) return null;

      const dotPositionClass = {
        bottom: "mt-4",
        top: "mb-4",
        inside: "absolute bottom-4 left-1/2 -translate-x-1/2 z-10",
      }[CONFIG.DOTS_POSITION] || "mt-4";

      return (
        <div className={cn("flex justify-center gap-2", dotPositionClass)}>
          {scrollSnaps.map((_, index) => (
            <button
              key={index}
              type="button"
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-200",
                index === selectedIndex
                  ? "bg-primary w-4"
                  : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
              )}
              onClick={() => api?.scrollTo(index)}
              aria-label={`${CONFIG.MESSAGES.SLIDE} ${index + 1}`}
            />
          ))}
        </div>
      );
    };

    return (
      <CarouselContext.Provider value={contextValue}>
        <div
          ref={ref}
          onKeyDownCapture={handleKeyDown}
          className={cn("relative", className)}
          role="region"
          aria-roledescription="carousel"
          {...props}
        >
          {children}
          {renderDots()}
        </div>
      </CarouselContext.Provider>
    );
  }
);
Carousel.displayName = "Carousel";

// ============================================================
// CarouselContent
// ============================================================

const CarouselContent = React.forwardRef(({ className, ...props }, ref) => {
  const { carouselRef, orientation, gap } = useCarousel();

  const gapClass = orientation === "horizontal" ? `-ml-${gap}` : `-mt-${gap}`;

  return (
    <div ref={carouselRef} className="overflow-hidden">
      <div
        ref={ref}
        className={cn(
          "flex",
          orientation === "horizontal" ? gapClass : "-mt-4 flex-col",
          className
        )}
        {...props}
      />
    </div>
  );
});
CarouselContent.displayName = "CarouselContent";

// ============================================================
// CarouselItem
// ============================================================

const CarouselItem = React.forwardRef(({ className, ...props }, ref) => {
  const { orientation, gap } = useCarousel();

  const gapClass = orientation === "horizontal" ? `pl-${gap}` : `pt-${gap}`;

  return (
    <div
      ref={ref}
      role="group"
      aria-roledescription="slide"
      className={cn(
        "min-w-0 shrink-0 grow-0 basis-full",
        gapClass,
        className
      )}
      {...props}
    />
  );
});
CarouselItem.displayName = "CarouselItem";

// ============================================================
// CarouselPrevious
// ============================================================

const CarouselPrevious = React.forwardRef(
  ({ className, variant = CONFIG.BUTTON_VARIANT, size = CONFIG.BUTTON_SIZE, ...props }, ref) => {
    const { orientation, scrollPrev, canScrollPrev, navPosition } = useCarousel();

    const positionClasses =
      orientation === "horizontal"
        ? navPosition === "inside"
          ? "-left-4 top-1/2 -translate-y-1/2"
          : "-left-12 top-1/2 -translate-y-1/2"
        : navPosition === "inside"
          ? "-top-4 left-1/2 -translate-x-1/2 rotate-90"
          : "-top-12 left-1/2 -translate-x-1/2 rotate-90";

    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        className={cn(
          "absolute h-8 w-8 rounded-full shadow-md",
          positionClasses,
          className
        )}
        disabled={!canScrollPrev}
        onClick={scrollPrev}
        {...props}
      >
        <ArrowLeft className={CONFIG.BUTTON_ICON_SIZE} />
        <span className="sr-only">{CONFIG.MESSAGES.PREVIOUS}</span>
      </Button>
    );
  }
);
CarouselPrevious.displayName = "CarouselPrevious";

// ============================================================
// CarouselNext
// ============================================================

const CarouselNext = React.forwardRef(
  ({ className, variant = CONFIG.BUTTON_VARIANT, size = CONFIG.BUTTON_SIZE, ...props }, ref) => {
    const { orientation, scrollNext, canScrollNext, navPosition } = useCarousel();

    const positionClasses =
      orientation === "horizontal"
        ? navPosition === "inside"
          ? "-right-4 top-1/2 -translate-y-1/2"
          : "-right-12 top-1/2 -translate-y-1/2"
        : navPosition === "inside"
          ? "-bottom-4 left-1/2 -translate-x-1/2 rotate-90"
          : "-bottom-12 left-1/2 -translate-x-1/2 rotate-90";

    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        className={cn(
          "absolute h-8 w-8 rounded-full shadow-md",
          positionClasses,
          className
        )}
        disabled={!canScrollNext}
        onClick={scrollNext}
        {...props}
      >
        <ArrowRight className={CONFIG.BUTTON_ICON_SIZE} />
        <span className="sr-only">{CONFIG.MESSAGES.NEXT}</span>
      </Button>
    );
  }
);
CarouselNext.displayName = "CarouselNext";

// ============================================================
// Additional: CarouselDots (Standalone)
// ============================================================

const CarouselDots = React.forwardRef(({ className, ...props }, ref) => {
  const { selectedIndex, scrollSnaps, api } = useCarousel();
  if (scrollSnaps.length <= 1) return null;

  return (
    <div ref={ref} className={cn("flex justify-center gap-2 mt-4", className)} {...props}>
      {scrollSnaps.map((_, index) => (
        <button
          key={index}
          type="button"
          className={cn(
            "w-2 h-2 rounded-full transition-all duration-200",
            index === selectedIndex
              ? "bg-primary w-4"
              : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
          )}
          onClick={() => api?.scrollTo(index)}
          aria-label={`${CONFIG.MESSAGES.SLIDE} ${index + 1}`}
        />
      ))}
    </div>
  );
});
CarouselDots.displayName = "CarouselDots";

// ============================================================
// Exports
// ============================================================

export {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  CarouselDots,
};
