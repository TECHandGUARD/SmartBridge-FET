// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App.jsx';
import '@/index.css';

// ============================================================
// 🔧 SOFT-CODED CONFIGURATION
// ============================================================

const CONFIG = {
  APP_NAME: import.meta.env.VITE_APP_NAME || 'SmartBridge FET',
  APP_ENV: import.meta.env.VITE_APP_ENV || 'development',
  NODE_ENV: import.meta.env.MODE || 'development',
  
  // Feature flags
  ENABLE_STRICT_MODE: import.meta.env.VITE_ENABLE_STRICT_MODE !== 'false',
  ENABLE_DEV_TOOLS: import.meta.env.VITE_ENABLE_DEV_TOOLS !== 'false',
  ENABLE_LOGGING: import.meta.env.VITE_ENABLE_LOGGING !== 'false',
  ENABLE_PERFORMANCE_MONITORING: import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING !== 'false',
  
  // Performance
  REPORT_WEB_VITALS: import.meta.env.VITE_REPORT_WEB_VITALS !== 'false',
  
  // Error handling
  ENABLE_ERROR_BOUNDARY: import.meta.env.VITE_ENABLE_ERROR_BOUNDARY !== 'false',
};

// ============================================================
// Console branding (development only)
// ============================================================

const consoleBranding = () => {
  if (CONFIG.APP_ENV === 'development' && CONFIG.ENABLE_LOGGING) {
    console.log(
      `%c🚀 ${CONFIG.APP_NAME}`,
      'font-size: 20px; font-weight: bold; color: #2d8a6e;'
    );
    console.log(
      `%c📦 Environment: ${CONFIG.APP_ENV}`,
      'font-size: 12px; color: #6b7280;'
    );
    console.log(
      '%c🔒 Powered by Tech & GUARD Pty Ltd',
      'font-size: 12px; color: #6b7280;'
    );
    console.log(
      '%c📋 For internal use only. Do not share console logs publicly.',
      'font-size: 11px; color: #ef4444;'
    );
  }
};

// ============================================================
// Error Reporting
// ============================================================

const reportError = (error, errorInfo = null) => {
  if (CONFIG.APP_ENV === 'production') {
    // Send to error tracking service (e.g., Sentry)
    // Example: Sentry.captureException(error, { extra: errorInfo });
    
    // Log silently in production (only to error tracking)
    if (CONFIG.ENABLE_LOGGING) {
      console.error('🚨 Application Error:', error);
      if (errorInfo) console.error('Error Info:', errorInfo);
    }
  } else {
    // Full logging in development
    console.error('🚨 Application Error:', error);
    if (errorInfo) console.error('Error Info:', errorInfo);
  }
};

// ============================================================
// Performance Monitoring
// ============================================================

const reportWebVitals = (metric) => {
  if (CONFIG.REPORT_WEB_VITALS && CONFIG.APP_ENV === 'production') {
    // Send to analytics
    // Example: Analytics.sendWebVitals(metric);
    
    if (CONFIG.ENABLE_LOGGING) {
      console.log(`📊 Web Vitals - ${metric.name}:`, metric.value);
    }
  }
};

// ============================================================
// Initialize Application
// ============================================================

const initApp = () => {
  // 1. Console branding
  consoleBranding();

  // 2. Find root element
  const rootElement = document.getElementById('root');
  
  if (!rootElement) {
    console.error('❌ Root element not found!');
    return;
  }

  // 3. Set document title
  document.title = CONFIG.APP_NAME;

  // 4. Set favicon (optional)
  // const favicon = document.querySelector('link[rel="icon"]');
  // if (favicon) favicon.href = '/favicon.ico';

  // 5. Create React root
  const root = ReactDOM.createRoot(rootElement);

  // 6. Render app with error handling
  try {
    // Build the render tree
    let renderTree = <App />;

    // Wrap with StrictMode (development only or if enabled)
    if (CONFIG.ENABLE_STRICT_MODE) {
      renderTree = (
        <React.StrictMode>
          {renderTree}
        </React.StrictMode>
      );
    }

    // Render
    root.render(renderTree);

    // 7. Report web vitals
    if (CONFIG.REPORT_WEB_VITALS) {
      // Import and report web vitals
      // import('web-vitals').then(({ onCLS, onFID, onFCP, onLCP, onTTFB }) => {
      //   onCLS(reportWebVitals);
      //   onFID(reportWebVitals);
      //   onFCP(reportWebVitals);
      //   onLCP(reportWebVitals);
      //   onTTFB(reportWebVitals);
      // });
    }

    // 8. Application ready log
    if (CONFIG.ENABLE_LOGGING) {
      console.log(`✅ ${CONFIG.APP_NAME} initialized successfully (${CONFIG.APP_ENV})`);
    }

    // 9. Performance monitoring
    if (CONFIG.ENABLE_PERFORMANCE_MONITORING && 'performance' in window) {
      const navigationTiming = performance.getEntriesByType('navigation')[0];
      if (navigationTiming) {
        const loadTime = navigationTiming.loadEventEnd - navigationTiming.startTime;
        if (CONFIG.ENABLE_LOGGING) {
          console.log(`⏱️ Page load time: ${loadTime.toFixed(2)}ms`);
        }
        if (loadTime > 3000 && CONFIG.APP_ENV === 'production') {
          // Warn if load time is too high
          console.warn(`⚠️ Page load time is high: ${loadTime.toFixed(2)}ms`);
        }
      }
    }

  } catch (error) {
    // 10. Catch render errors
    reportError(error);
    
    // Show fallback UI
    renderFallback(rootElement);
  }
};

// ============================================================
// Fallback UI (if app fails to render)
// ============================================================

const renderFallback = (rootElement) => {
  rootElement.innerHTML = `
    <div style="
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #f8f9fa;
      font-family: 'Inter', -apple-system, sans-serif;
      padding: 20px;
      text-align: center;
    ">
      <div style="
        max-width: 400px;
        padding: 40px;
        background: white;
        border-radius: 16px;
        box-shadow: 0 4px 24px rgba(0,0,0,0.08);
        border: 1px solid #e5e7eb;
      ">
        <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
        <h1 style="font-size: 20px; font-weight: 700; color: #111827; margin-bottom: 8px;">
          Something went wrong
        </h1>
        <p style="font-size: 14px; color: #6b7280; margin-bottom: 20px;">
          ${CONFIG.APP_NAME} encountered an error. Please try refreshing the page.
        </p>
        <button 
          onclick="window.location.reload()" 
          style="
            background: #2d8a6e;
            color: white;
            border: none;
            padding: 10px 24px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s;
          "
          onmouseover="this.style.background='#1f6b55'"
          onmouseout="this.style.background='#2d8a6e'"
        >
          Refresh Page
        </button>
        ${CONFIG.APP_ENV === 'development' ? `
          <p style="font-size: 12px; color: #9ca3af; margin-top: 16px;">
            Check the console for error details.
          </p>
        ` : ''}
      </div>
    </div>
  `;
};

// ============================================================
// Application Ready Check
// ============================================================

if (document.readyState === 'loading') {
  // Wait for DOM to load
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  // DOM already loaded
  initApp();
}

// ============================================================
// Export for testing
// ============================================================

export { reportWebVitals, reportError };

// ============================================================
// Service Worker Registration (Production Only)
// ============================================================

if (CONFIG.APP_ENV === 'production' && 'serviceWorker' in navigator) {
  // Uncomment to register service worker
  // window.addEventListener('load', () => {
  //   navigator.serviceWorker.register('/sw.js')
  //     .then(registration => {
  //       console.log('SW registered: ', registration);
  //     })
  //     .catch(registrationError => {
  //       console.log('SW registration failed: ', registrationError);
  //     });
  // });
}
