import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Users, LayoutDashboard, MessageSquare, ClipboardCheck, Home, Star } from 'lucide-react';
import { getNavigation, isNavigationActive } from '@/lib/navigation';
const ICONS = { book: BookOpen, users: Users, dashboard: LayoutDashboard, forum: MessageSquare, practice: ClipboardCheck, home: Home, star: Star };
export default function MobileBottomTabs({ user }) {
  const location = useLocation();
  const primary = getNavigation(user).primary;
  return <nav aria-label="Main navigation" className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] backdrop-blur-md" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
    <div className="grid min-h-16" style={{ gridTemplateColumns: `repeat(${primary.length}, minmax(0, 1fr))` }}>
      {primary.map(({ label, path, icon }) => {
        const Icon = ICONS[icon] || Home;
        const active = isNavigationActive(location, path);
        return <Link key={path} to={path} aria-current={active ? 'page' : undefined}
          className={`flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${active ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>
          <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span className="max-w-full break-words text-center text-[10px] font-semibold leading-tight">{label}</span>
        </Link>;
      })}
    </div>
  </nav>;
}
