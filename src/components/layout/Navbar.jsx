import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Menu, X, Star, LogOut, User } from 'lucide-react';
import AdminAlertBell from '@/components/admin/AdminAlertBell';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

export default function Navbar({ user }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const isTutor = user?.role === 'sace_tutor' || user?.role === 'student_tutor';
  const isParent = user?.role === 'parent';
  const isAdmin = user?.role === 'admin';
  const isStudent = !isTutor && !isParent && !isAdmin;

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout error:', error);
      toast.error('Failed to sign out');
    } else {
      window.location.href = '/';
    }
  };

  const handleLogin = () => {
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
  };

  // Role-specific nav — each role only sees what's relevant to them
  const navLinks = isAdmin ? [
    { label: 'Admin', path: '/admin' },
    { label: 'CAPS Admin', path: '/caps-admin' },
    { label: 'Subjects', path: '/subjects' },
    { label: 'Resources', path: '/search' },
    { label: 'Tutors', path: '/tutors' },
    { label: 'Videos', path: '/videos' },
    { label: 'Quiz', path: '/quiz' },
    { label: 'Study Rooms', path: '/study-rooms' },
    { label: 'Forum', path: '/forum' },
    { label: 'Bookings', path: '/bookings' },
    { label: 'Bursaries', path: '/bursaries' },
    { label: 'Opportunities', path: '/opportunities' },
    { label: 'Payout Log', path: '/payout-log' },
    { label: 'Counselor', path: '/counselor' },
    { label: 'Premium', path: '/premium' },
  ] : isTutor ? [
    { label: 'Subjects', path: '/subjects' },
    { label: 'Resources', path: '/search' },
    { label: 'CAPS Docs', path: '/resources-library' },
    { label: 'Videos', path: '/videos' },
    { label: 'Bookings', path: '/bookings' },
    { label: 'Study Rooms', path: '/study-rooms' },
    { label: 'Forum', path: '/forum' },
    { label: 'Premium', path: '/premium' },
  ] : isParent ? [
    { label: 'Tutors', path: '/tutors' },
    { label: 'Bursaries', path: '/bursaries' },
    { label: 'Opportunities', path: '/opportunities' },
    { label: 'Forum', path: '/forum' },
    { label: 'Premium', path: '/premium' },
  ] : isStudent ? [
    { label: 'Subjects', path: '/subjects' },
    { label: 'Tutors', path: '/tutors' },
    { label: 'Resources', path: '/search' },
    { label: 'Videos', path: '/videos' },
    { label: 'Practice', path: '/quiz' },
    { label: 'Study Rooms', path: '/study-rooms' },
    { label: 'Forum', path: '/forum' },
    { label: 'Bursaries', path: '/bursaries' },
    { label: 'Opportunities', path: '/opportunities' },
    { label: 'Premium', path: '/premium' },
  ] : [
    // Unauthenticated / public
    { label: 'Subjects', path: '/subjects' },
    { label: 'Tutors', path: '/tutors' },
    { label: 'Premium', path: '/premium' },
  ];

  const dashboardPath =
    user?.role === 'admin' ? '/admin' :
    (user?.role === 'sace_tutor' || user?.role === 'student_tutor') ? '/tutor-dashboard' :
    user?.role === 'parent' ? '/parent-dashboard' :
    '/student-dashboard';

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
              <span className="font-playfair font-bold text-lg text-foreground">SmartBridge</span>
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
            {user?.role === 'admin' && <AdminAlertBell />}
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
                        {user.full_name?.[0] || user.email?.[0]?.toUpperCase()}
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium">{user.full_name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="w-4 h-4 mr-2" /> Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={handleLogin}>
                  Sign In
                </Button>
                <Button size="sm" className="bg-primary hover:bg-primary/90 gap-1.5" onClick={handleLogin}>
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
                <button className="w-full text-left px-3 py-2 rounded-lg text-sm text-destructive hover:bg-muted" onClick={handleLogout}>
                  Sign Out
                </button>
              </>
            ) : (
              <Button className="w-full mt-2" onClick={handleLogin}>
                Sign In / Register
              </Button>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
