import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { getNavigation } from '@/lib/navigation';
export default function MobileAppFooter({ user }) {
  const { primary, secondary } = getNavigation(user);
  const groups = [
    { title: 'Your pages', links: primary },
    { title: 'Explore all features', links: secondary },
    { title: 'Company & legal', links: [
      {label:'Privacy Policy',path:'/privacy'},
      {label:'Terms of Service',path:'/terms'},
      {label:'About Tech & GUARD',path:'/about-tech-guard'}
    ]}
  ];
  return <footer className="mobile-app-footer mt-6 border-t bg-card px-4 pt-6 text-sm" style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}>
    <div className="mx-auto max-w-3xl space-y-4">
      <Link to="/" className="flex items-center gap-2 font-playfair font-bold"><BookOpen className="h-5 w-5 text-primary" />SmartBridge FET</Link>
      <p className="text-xs text-muted-foreground">CAPS-aligned learning for South African Grades 10–12.</p>
      {groups.map(group=><details key={group.title} className="rounded-xl border bg-background">
        <summary className="min-h-12 cursor-pointer px-4 py-3 font-semibold">{group.title}</summary>
        <nav aria-label={group.title} className="grid grid-cols-2 gap-1 border-t p-2">
          {group.links.map(link=><Link key={link.path} to={link.path} className="min-h-11 break-words rounded-lg px-2 py-3 text-xs text-muted-foreground hover:bg-muted hover:text-primary">{link.label}</Link>)}
        </nav>
      </details>)}
      <p className="pt-2 text-center text-xs text-muted-foreground">© 2026 TECH AND GUARD (Pty) Ltd · 2026/155090/07</p>
    </div>
  </footer>;
}
