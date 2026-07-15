// src/components/layout/MobileBottomTabs.jsx
import { Link, useLocation } from 'react-router-dom';
import { Home, BookOpen, Users, LayoutDashboard } from 'lucide-react';

// ============================================================
// 🔧 SOFT-CODED CONFIGURATION
// ============================================================

const CONFIG = {
  TUTOR_ROLES: ['sace_tutor', 'student_tutor', 'tutor_pending'],
};

// ============================================================
// Helper Functions
// ============================================================

function getDashboardPath(user) {
  if (!user) return '/student-dashboard';
  if (user.role === 'admin') return '/admin';
  if (CONFIG.TUTOR_ROLES.includes(user.role)) return '/tutor-dashboard';
  if (user.role === 'parent') return '/parent-dashboard';
  return '/student-dashboard';
}

// ============================================================
// Main Component
// ============================================================

export default function MobileBottomTabs({ user }) {
  const location = useLocation();
  const dashPath = getDashboardPath(user);

  const tabs = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Subjects', path: '/subjects', icon: BookOpen },
    { label: 'Tutors', path: '/tutors', icon: Users },
    { label: 'Dashboard', path: dashPath, icon: LayoutDashboard },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-t border-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid grid-cols-4 h-16">
        {tabs.map(({ label, path, icon: Icon }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center justify-center gap-1 select-none transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Icon className={`w-5 h-5 select-none ${isActive ? 'text-primary' : ''}`} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
