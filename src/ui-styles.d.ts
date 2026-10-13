import 'react';
// UI animation/colour components intentionally use CSS custom properties.
declare module 'react' {
  interface CSSProperties {
    [variable: `--${string}`]: string | number | undefined;
  }
}
