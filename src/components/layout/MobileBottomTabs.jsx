import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Users, LayoutDashboard, MessageSquare, ClipboardCheck, Home, Star } from 'lucide-react';
import { getNavigation, isNavigationActive } from '@/lib/navigation';
const ICONS = { book: BookOpen, users: Users, dashboard: LayoutDashboard, forum: MessageSquare, practice: ClipboardCheck, home: Home, star: Star };
export default function MobileBottomTabs({ user }) {
  const location = useLocation();
  return <nav aria-label="Main navigation" className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur-sm" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
    <div className="grid h-16 grid-cols-4">{getNavigation(user).primary.map(({ label, path, icon }) => {
      const Icon = ICONS[icon];
      const active = isNavigationActive(location, path);
      return <Link key={path} to={path} aria-current={active ? 'page' : undefined} className={`flex min-w-0 flex-col items-center justify-center gap-1 px-1 ${active ? 'bg-primary/5 text-primary' : 'text-muted-foreground'}`}><Icon className="h-5 w-5" aria-hidden="true" /><span className="text-center text-[11px] font-medium">{label}</span></Link>;
    })}</div>
  </nav>;
}
