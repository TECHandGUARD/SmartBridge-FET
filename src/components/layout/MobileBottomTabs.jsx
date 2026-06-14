import { Link, useLocation } from 'react-router-dom';
import { Home, BookOpen, Users, LayoutDashboard } from 'lucide-react';

function getDashboardPath(user) {
  if (!user) return '/student-dashboard';
  if (user.role === 'admin') return '/admin';
  if (user.role === 'sace_tutor' || user.role === 'student_tutor') return '/tutor-dashboard';
  if (user.role === 'parent') return '/parent-dashboard';
  return '/student-dashboard';
}

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
          const active = location.pathname === path || (path === dashPath && location.pathname === path);
          return (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center justify-center gap-1 select-none transition-colors ${
                active ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Icon className={`w-5 h-5 select-none ${active ? 'text-primary' : ''}`} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}