import { Link, useLocation } from 'react-router-dom';
import { BookOpen, ChevronDown, User } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { getNavigation, isNavigationActive } from '@/lib/navigation';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import AdminAlertBell from '@/components/admin/AdminAlertBell';

export default function Navbar({ user }) {
  const location = useLocation();
  const { signOut, isAdmin } = useAuth();
  const { primary, secondary } = getNavigation(user);
  const moreActive = secondary.some(link => isNavigationActive(location, link.path));
  return <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur-sm">
    <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-5 px-6">
      <Link to="/" className="flex shrink-0 items-center gap-2 font-playfair text-xl font-bold"><BookOpen className="h-6 w-6 text-primary" aria-hidden="true" />SmartBridge FET</Link>
      <nav aria-label="Main navigation" className="flex items-center gap-1">
        {primary.map(link => <Link key={link.path} to={link.path} aria-current={isNavigationActive(location, link.path) ? 'page' : undefined} className={`rounded-lg px-3 py-3 text-sm font-medium ${isNavigationActive(location, link.path) ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}>{link.label}</Link>)}
        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" className={`gap-1 ${moreActive ? 'text-primary bg-primary/10' : ''}`}>More<ChevronDown className="h-4 w-4" aria-hidden="true" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-[70vh] overflow-y-auto">{secondary.map(link => <DropdownMenuItem key={link.path} asChild><Link to={link.path} aria-current={isNavigationActive(location, link.path) ? 'page' : undefined}>{link.label}</Link></DropdownMenuItem>)}</DropdownMenuContent>
        </DropdownMenu>
      </nav>
      <div className="flex shrink-0 items-center gap-2">{isAdmin && <AdminAlertBell />}
        {user ? <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" aria-label="Account menu"><User className="h-5 w-5" aria-hidden="true" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><p className="max-w-56 truncate px-2 py-2 text-sm">{user.full_name || user.email}</p><DropdownMenuSeparator /><DropdownMenuItem onClick={signOut}>Sign out</DropdownMenuItem></DropdownMenuContent></DropdownMenu> : <><Button variant="ghost" asChild><Link to="/login">Sign in</Link></Button><Button asChild><Link to="/register">Get started</Link></Button></>}
      </div>
    </div>
  </header>;
}
