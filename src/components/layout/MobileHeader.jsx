import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, ChevronLeft, Menu, UserRound, LogOut } from 'lucide-react';
import { getDashboardPath, getNavigation, isNavigationActive } from '@/lib/navigation';
import { useAuth } from '@/lib/AuthContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

export default function MobileHeader({ user }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { signOut } = useAuth();
  const dashboard = getDashboardPath(user);
  const { primary, secondary } = getNavigation(user);
  useEffect(() => { setOpen(false); }, [location.pathname, location.search]);
  const renderLinks = links => links.map(link => <Link key={link.path} to={link.path} onClick={() => setOpen(false)}
    aria-current={isNavigationActive(location, link.path) ? 'page' : undefined}
    className={`flex min-h-12 items-center rounded-xl px-4 py-3 text-sm font-medium ${isNavigationActive(location, link.path) ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'}`}>{link.label}</Link>);
  return <header className="fixed inset-x-0 top-0 z-40 border-b bg-card/95 backdrop-blur-sm" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
    <div className="flex h-14 items-center gap-2 px-3">
      {location.pathname !== dashboard ? <Link to={dashboard} aria-label="Back to dashboard" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl hover:bg-muted"><ChevronLeft className="h-5 w-5" /></Link> : <span className="w-11 shrink-0" />}
      <Link to="/" className="flex min-w-0 flex-1 items-center justify-center gap-2"><BookOpen className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" /><span className="truncate font-playfair font-bold">SmartBridge FET</span></Link>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild><Button variant="ghost" className="h-11 w-11 shrink-0 p-0" aria-label="Open navigation menu"><Menu className="h-5 w-5" /></Button></SheetTrigger>
        <SheetContent side="right" className="flex h-full w-[min(92vw,380px)] flex-col p-0">
          <SheetHeader className="shrink-0 border-b px-5 pb-4 pt-7 text-left">
            <SheetTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" /> SmartBridge FET</SheetTitle>
            <SheetDescription className="flex items-center gap-2 break-all"><UserRound className="h-4 w-4 shrink-0" />{user?.full_name || user?.email || 'Explore the platform'}</SheetDescription>
          </SheetHeader>
          <nav aria-label="All SmartBridge pages" className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-3 py-4" style={{ WebkitOverflowScrolling: 'touch' }}>
            <section><h2 className="px-4 pb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Main pages</h2>{renderLinks(primary)}</section>
            <section><h2 className="px-4 pb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">More features</h2>{renderLinks(secondary)}</section>
            <section><h2 className="px-4 pb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Company & legal</h2>{renderLinks([{label:'Terms of Service',path:'/terms'},{label:'Privacy Policy',path:'/privacy'},{label:'About Tech & GUARD',path:'/about-tech-guard'}])}</section>
          </nav>
          <div className="shrink-0 border-t bg-card p-4" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
            {user ? <Button variant="outline" className="w-full gap-2" onClick={() => { setOpen(false); signOut(); }}><LogOut className="h-4 w-4" /> Sign out</Button> : <Button asChild className="w-full"><Link to="/login" onClick={() => setOpen(false)}>Sign in</Link></Button>}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  </header>;
}
