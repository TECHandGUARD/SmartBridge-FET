import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, ChevronLeft, Menu } from 'lucide-react';
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
  return <header className="fixed inset-x-0 top-0 z-40 border-b bg-card/95 backdrop-blur-sm" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
    <div className="flex h-14 items-center gap-2 px-3">
      {location.pathname !== dashboard ? <Link to={dashboard} aria-label="Back to dashboard" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-muted"><ChevronLeft className="h-5 w-5" /></Link> : <span className="w-11 shrink-0" />}
      <Link to="/" className="flex min-w-0 flex-1 items-center justify-center gap-2"><BookOpen className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" /><span className="truncate font-playfair font-bold">SmartBridge FET</span></Link>
      <Sheet open={open} onOpenChange={setOpen}><SheetTrigger asChild><Button variant="ghost" className="h-11 w-11 shrink-0 p-0" aria-label="Open navigation menu"><Menu className="h-5 w-5" /></Button></SheetTrigger>
        <SheetContent side="right" className="w-[min(90vw,360px)] overflow-y-auto"><SheetHeader><SheetTitle>Your SmartBridge</SheetTitle><SheetDescription>{user?.full_name || 'Navigate your account'}</SheetDescription></SheetHeader>
          <nav aria-label="All pages" className="mt-6 flex flex-col gap-1">{[...primary, ...secondary].map(link => <Link key={link.path} to={link.path} onClick={() => setOpen(false)} aria-current={isNavigationActive(location, link.path) ? 'page' : undefined} className={`rounded-lg px-3 py-3 text-sm ${isNavigationActive(location, link.path) ? 'bg-primary/10 font-semibold text-primary' : 'hover:bg-muted'}`}>{link.label}</Link>)}</nav>
          <div className="mt-5 border-t pt-5">{user ? <Button variant="outline" className="w-full" onClick={() => { setOpen(false); signOut(); }}>Sign out</Button> : <Link to="/login" onClick={() => setOpen(false)}>Sign in</Link>}</div>
        </SheetContent>
      </Sheet>
    </div>
  </header>;
}
