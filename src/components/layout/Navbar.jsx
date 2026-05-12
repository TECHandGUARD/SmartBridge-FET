import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '@/supabaseClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Menu, X, Star, LogOut, User, Search } from 'lucide-react';
import AdminAlertBell from '@/components/admin/AdminAlertBell';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Navbar({ user, userProfile }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  // Use userProfile.role for role-based routing (fallback to user if needed)
  const userRole = userProfile?.role || user?.role;
  const userFullName = userProfile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0];
  const userEmail = user?.email;

  const navLinks = [
    { label: 'Subjects', path: '/subjects' },
    { label: 'Tutors', path: '/tutors' },
    { label: 'Resources', path: '/search' },
    { label: 'CAPS Docs', path: '/resources-library' },
    { label: 'Videos', path: '/videos' },
    { label: 'Practice', path: '/quiz' },
    ...(userRole === 'student' || userRole === 'user' ? [{ label: 'Bookings', path: '/bookings' }, { label: 'Study Rooms', path: '/study-rooms' }] : []),
    { label: 'Premium', path: '/premium' },
    ...(userRole === 'admin' ? [{ label: '⚙️ Admin', path: '/admin' }] : []),
  ];

  const dashboardPath =
    userRole === 'admin' ? '/admin' :
    (userRole === 'sace_tutor' || userRole === 'student_tutor') ? '/tutor-dashboard' :
    userRole === 'parent' ? '/parent-dashboard' :
    '/student-dashboard';

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    // Force reload to clear state
    window.location.href = '/';
  };

  const handleSignIn = () => {
    window.location.href = '/login';
  };

  return (
    <nav className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <span className="font-playfair font-bold text-lg text-foreground">EduConnect</span>
              <span className="text-xs text-muted-foreground block leading-none -mt-0.5">FET Phase</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm font-medium transition-colors ${
                  location.pathname === link.path
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            {userRole === 'admin' && <AdminAlertBell />}
            {user ? (
              <>
                <Link to={dashboardPath}>
                  <Button variant="outline" size="sm" className="gap-2">
                    <User className="w-4 h-4" />
                    Dashboard
                  </Button>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                        {userFullName?.[0] || userEmail?.[0]?.toUpperCase()}
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium">{userFullName}</p>
                      <p className="text-xs text-muted-foreground">{userEmail}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="w-4 h-4 mr-2" /> Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={handleSignIn}>
                  Sign In
                </Button>
                <Button size="sm" className="bg-primary hover:bg-primary/90 gap-1.5" onClick={handleSignIn}>
                  <Star className="w-3.5 h-3.5" /> Get Started
                </Button>
              </>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button className="md:hidden p-2 rounded-lg hover:bg-muted" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden py-4 border-t border-border space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="block px-3 py-2 rounded-lg text-sm font-medium hover:bg-muted text-foreground"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {user ? (
              <>
                <Link to={dashboardPath} className="block px-3 py-2 rounded-lg text-sm font-medium hover:bg-muted" onClick={() => setMenuOpen(false)}>
                  Dashboard
                </Link>
                <button className="w-full text-left px-3 py-2 rounded-lg text-sm text-destructive hover:bg-muted" onClick={handleSignOut}>
                  Sign Out
                </button>
              </>
            ) : (
              <Button className="w-full mt-2" onClick={handleSignIn}>
                Sign In / Register
              </Button>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}