// src/pages/Home.jsx
import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Link } from 'react-router-dom';
import {
  GraduationCap, BookOpen, Users, Star, Shield,
  Award, CheckCircle, Clock, Globe, MapPin,
  Twitter, Linkedin, Instagram, Facebook, Mail
} from 'lucide-react';
import HeroSection from '@/components/home/HeroSection';
import SubjectsPreview from '@/components/home/SubjectsPreview';
import RoleDashboardCards from '@/components/home/RoleDashboardCards';
import PremiumBanner from '@/components/home/PremiumBanner';
import TechGuardBanner from '@/components/marketing/TechGuardBanner';
import PersonalizedHome from '@/components/home/PersonalizedHome';

// Import the new wrappers
import { fetchApprovedResources, fetchTutors } from '@/lib/supabaseClient';

// ============================================================
// 🔧 SOFT-CODED CONFIGURATION
// ============================================================
const CONFIG = {
  COMPANY_NAME: import.meta.env.VITE_COMPANY_NAME || 'Tech & GUARD Pty Ltd',
  APP_NAME: import.meta.env.VITE_APP_NAME || 'SmartBridge FET',
  REGISTRATION_NUMBER: import.meta.env.VITE_CIPC_REGISTRATION || '2026/155090/07',
  SUPPORT_EMAIL: import.meta.env.VITE_SUPPORT_EMAIL || 'aneleq@techandguard.co.za',
  CORPORATE_WEBSITE: import.meta.env.VITE_CORPORATE_WEBSITE || 'https://www.techandguard.co.za',

  SOCIAL: {
    twitter: import.meta.env.VITE_TWITTER_URL || '#',
    linkedin: import.meta.env.VITE_LINKEDIN_URL || '#',
    instagram: import.meta.env.VITE_INSTAGRAM_URL || '#',
    facebook: import.meta.env.VITE_FACEBOOK_URL || '#',
  },

  CURRENT_YEAR: new Date().getFullYear(),
  SHOW_SOCIAL_LINKS: import.meta.env.VITE_SHOW_SOCIAL_LINKS !== 'false',
  SHOW_COMPLIANCE_BADGES: import.meta.env.VITE_SHOW_COMPLIANCE_BADGES !== 'false',

  MESSAGES: {
    TAGLINE: import.meta.env.VITE_HOME_TAGLINE || 'CAPS-aligned learning platform for South African Grades 10–12.',
    SUBJECTS_LIST: import.meta.env.VITE_HOME_SUBJECTS || 'Mathematics, Physical Sciences, Life Sciences, Accounting, Business Studies, Economics, History, Geography, English HL, isiXhosa HL, Life Orientation',
    FOOTER_LEGAL: import.meta.env.VITE_FOOTER_LEGAL || 'All rights reserved.',
    FOOTER_DEVELOPED: import.meta.env.VITE_FOOTER_DEVELOPED || 'Developed for South African learners',
  },
};

// ============================================================
// Sub-Components (Memoized)
// ============================================================
const ComplianceBadges = React.memo(function ComplianceBadges() {
  const badges = [
    { label: 'Grade 10–12 Resources', icon: BookOpen, color: 'bg-blue-500/10 text-blue-600 border-blue-200' },
    { label: 'Tutor Profiles', icon: Shield, color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' },
    { label: 'Privacy Policy Available', icon: CheckCircle, color: 'bg-purple-500/10 text-purple-600 border-purple-200' },
    { label: 'DBE Guidelines', icon: Award, color: 'bg-amber-500/10 text-amber-600 border-amber-200' },
  ];

  return (
    <div className="flex flex-wrap justify-center gap-3">
      {badges.map((badge) => (
        <span
          key={badge.label}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${badge.color}`}
        >
          <badge.icon className="w-3.5 h-3.5" />
          {badge.label}
        </span>
      ))}
    </div>
  );
});

const FooterSocialLinks = React.memo(function FooterSocialLinks() {
  if (!CONFIG.SHOW_SOCIAL_LINKS) return null;

  const socialLinks = [
    { icon: Twitter, url: CONFIG.SOCIAL.twitter, label: 'Twitter' },
    { icon: Linkedin, url: CONFIG.SOCIAL.linkedin, label: 'LinkedIn' },
    { icon: Instagram, url: CONFIG.SOCIAL.instagram, label: 'Instagram' },
    { icon: Facebook, url: CONFIG.SOCIAL.facebook, label: 'Facebook' },
  ];

  return (
    <div className="flex items-center gap-3">
      {socialLinks.map((social) => (
        <a
          key={social.label}
          href={social.url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-full hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
          aria-label={social.label}
        >
          <social.icon className="w-4 h-4" />
        </a>
      ))}
    </div>
  );
});

const Footer = React.memo(function Footer() {
  const subjects = React.useMemo(() => CONFIG.MESSAGES.SUBJECTS_LIST.split(',').map(s => s.trim()), []);

  return (
    <footer className="bg-card border-t border-border/50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          <div>
            <Link to="/" className="inline-block">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <GraduationCap className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-playfair font-bold text-lg text-foreground">{CONFIG.APP_NAME}</span>
              </div>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">{CONFIG.MESSAGES.TAGLINE}</p>
            <div className="mt-3">
              <ComplianceBadges />
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-sm text-foreground mb-3">Compliance</h4>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" /> CAPS Aligned</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" /> Tutor Profiles</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" /> POPIA Compliant</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" /> DBE Guidelines</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm text-foreground mb-3">Subjects</h4>
            <div className="flex flex-wrap gap-1.5">
              {subjects.slice(0, 8).map((subject) => (
                <span key={subject} className="text-xs bg-muted/50 px-2 py-1 rounded-full text-muted-foreground">{subject}</span>
              ))}
              {subjects.length > 8 && <span className="text-xs text-muted-foreground font-medium">+{subjects.length - 8} more</span>}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-sm text-foreground mb-3">Contact</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href={`mailto:${CONFIG.SUPPORT_EMAIL}`} className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 flex-shrink-0" /> {CONFIG.SUPPORT_EMAIL}
                </a>
              </li>
              <li className="text-muted-foreground flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> <span>Stellenbosch, South Africa</span>
              </li>
              <li className="text-muted-foreground text-xs">Reg: {CONFIG.REGISTRATION_NUMBER}</li>
            </ul>
            {CONFIG.SHOW_SOCIAL_LINKS && <div className="mt-3"><FooterSocialLinks /></div>}
          </div>
        </div>

        <div className="border-t border-border/50 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-xs text-muted-foreground">© {CONFIG.CURRENT_YEAR} {CONFIG.APP_NAME}. {CONFIG.MESSAGES.FOOTER_LEGAL}</p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link to="/account-deletion" className="hover:text-foreground transition-colors">Delete account</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
            <Link to="/about-tech-guard" className="hover:text-foreground transition-colors">About</Link>
            <span className="flex items-center gap-1">🇿🇦 {CONFIG.MESSAGES.FOOTER_DEVELOPED}</span>
          </div>
        </div>
      </div>
    </footer>
  );
});

// ============================================================
// Main Public Landing Shell (now with pre-fetching)
// ============================================================
function PublicLandingView() {
  // Pre-fetch resources and tutors on mount – this fills the cache
  // so that child components (like SubjectsPreview, RoleDashboardCards)
  // can use the cached data if they call the same wrappers.
  React.useEffect(() => {
    // Fetch the first 6 approved resources (used by SubjectsPreview)
    fetchApprovedResources(6, 0).catch(() => {});
    // Fetch the first 5 tutors (used by RoleDashboardCards)
    fetchTutors(5).catch(() => {});
  }, []);

  return (
    <main className="min-h-screen bg-background animate-in fade-in duration-300">
      <HeroSection />
      <div className="bg-muted/30 border-y border-border/50 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Designed for South African learners</span>
            <span className="flex items-center gap-2"><Star className="w-4 h-4 text-amber-500" /> Built for Grades 10–12</span>
            <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> 24/7 Access</span>
            <span className="flex items-center gap-2"><Globe className="w-4 h-4 text-primary" /> Available Nationwide</span>
          </div>
        </div>
      </div>
      <TechGuardBanner />
      <SubjectsPreview />
      <RoleDashboardCards />
      <PremiumBanner />
      <Footer />
    </main>
  );
}

export default function Home() {
  const { user, isAuthenticated } = useAuth();

  return (
    <>
      {isAuthenticated && user && <div className="max-w-7xl mx-auto px-4 py-4"><Link to="/stem-lab" className="inline-flex rounded-lg border bg-card px-4 py-3 font-semibold text-sm">Open Virtual STEM Lab · learners and classrooms</Link></div>}
      {isAuthenticated && user ? (
        <PersonalizedHome user={user} />
      ) : (
        <PublicLandingView />
      )}
    </>
  );
}
