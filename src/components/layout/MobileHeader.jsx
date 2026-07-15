// src/components/layout/MobileHeader.jsx
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, ChevronLeft } from 'lucide-react';

// ============================================================
// 🔧 SOFT-CODED CONFIGURATION
// ============================================================

const CONFIG = {
  APP_NAME: import.meta.env.VITE_APP_NAME || 'SmartBridge FET',
  HOME_PATHS: (import.meta.env.VITE_HOME_PATHS || '/,/student-dashboard,/tutor-dashboard,/parent-dashboard,/admin')
    .split(',')
    .map(path => path.trim()),
};

// ============================================================
// Main Component
// ============================================================

export default function MobileHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = CONFIG.HOME_PATHS.includes(location.pathname);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border flex items-center h-14 px-4 gap-3"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {!isHome ? (
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center select-none hover:bg-muted/80 transition-colors"
          aria-label="Go back"
        >
          <ChevronLeft className="w-5 h-5 select-none" />
        </button>
      ) : (
        <div className="w-9 h-9" />
      )}

      <Link to="/" className="flex items-center gap-2 flex-1 justify-center">
        <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
          <BookOpen className="w-4 h-4 text-primary-foreground select-none" />
        </div>
        <span className="font-playfair font-bold text-base text-foreground">{CONFIG.APP_NAME}</span>
      </Link>

      {/* Spacer to keep logo centred */}
      <div className="w-9 h-9" />
    </header>
  );
}
