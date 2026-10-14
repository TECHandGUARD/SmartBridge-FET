import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { getNavigation } from '@/lib/navigation';
export default function Footer() {
  const {
    user
  } = useAuth();
  const {
    primary,
    secondary
  } = getNavigation(user);
  const groups = [{
    title: 'Your pages',
    links: primary
  }, {
    title: 'Explore',
    links: secondary
  }, {
    title: 'About & legal',
    links: [{
      label: 'Privacy Policy',
      path: '/privacy'
    }, {
      label: 'Terms of Service',
      path: '/terms'
    }, {
      label: 'About Tech & GUARD',
      path: '/about-tech-guard'
    }]
  }];
  return <footer className="mt-12 border-t bg-card">
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8 grid gap-8 md:grid-cols-4">
        <div><Link to="/" className="mb-3 flex items-center gap-2 font-playfair font-bold"><BookOpen className="h-6 w-6 text-primary" aria-hidden="true" />SmartBridge FET</Link><p className="text-sm text-muted-foreground">CAPS-aligned learning platform for South African Grades 10–12.</p><p className="mt-4 text-xs text-muted-foreground">Operated by TECH AND GUARD (Pty) Ltd.</p></div>
        {groups.map(group => <nav key={group.title} aria-label={group.title}><h2 className="mb-3 text-sm font-semibold">{group.title}</h2><ul className="space-y-2 text-sm">{group.links.map(link => <li key={link.path}><Link to={link.path} className="text-muted-foreground hover:text-primary hover:underline">{link.label}</Link></li>)}</ul></nav>)}
      </div>
      <div className="border-t pt-6 text-center text-xs text-muted-foreground"><p>© 2026 TECH AND GUARD (Pty) Ltd (Registration Number: 2026/155090/07). All rights reserved.</p><p className="mt-2">SmartBridge FET is an EdTech digital product owned by a black student.</p><p className="mt-2">Developed for South African learners.</p></div>
    </div>
  </footer>;
}
