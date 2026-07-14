import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';

// ============================================================
// Configuration (Soft-coded for future flexibility)
// ============================================================

const appName = import.meta.env.VITE_APP_NAME || 'SmartBridge FET';
const appYear = new Date().getFullYear();
const registrationNumber = import.meta.env.VITE_REGISTRATION_NUMBER || '2026/15509/07';
const companyName = import.meta.env.VITE_COMPANY_NAME || 'Tech & GUARD Pty Ltd';
const ownerDescription = import.meta.env.VITE_OWNER_DESCRIPTION || 'fully owned by Tech & GUARD Pty Ltd';

// ============================================================
// Main Component
// ============================================================

export default function Footer() {
  return (
    <footer className="bg-card border-t border-border mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <span className="font-playfair font-bold text-foreground">{appName}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Digital learning platform for South African Grade 10-12 students.
            </p>
            <div className="border-t border-border pt-4">
              <p className="text-xs font-semibold text-foreground mb-1">Powered by</p>
              <p className="text-xs text-muted-foreground">{companyName} — Premium tech protection solutions for South Africa.</p>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-foreground text-sm mb-3">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/subjects" className="text-muted-foreground hover:text-foreground transition-colors">
                  Subjects
                </Link>
              </li>
              <li>
                <Link to="/tutors" className="text-muted-foreground hover:text-foreground transition-colors">
                  Find Tutors
                </Link>
              </li>
              <li>
                <Link to="/resources-library" className="text-muted-foreground hover:text-foreground transition-colors">
                  CAPS Documents
                </Link>
              </li>
              <li>
                <Link to="/premium" className="text-muted-foreground hover:text-foreground transition-colors">
                  Premium
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold text-foreground text-sm mb-3">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/about-tech-guard" className="text-muted-foreground hover:text-foreground transition-colors">
                  About {companyName}
                </Link>
              </li>
              <li>
                <a href="mailto:aneleq@techandguard.co.za" className="text-muted-foreground hover:text-foreground transition-colors">
                  Contact
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-6 text-center text-xs text-muted-foreground">
          <p>
            © {appYear} {companyName} (Registration Number: {registrationNumber}). All rights reserved.
          </p>
          <p className="mt-2">
            {appName} is an EdTech digital product {ownerDescription}.
          </p>
        </div>
      </div>
    </footer>
  );
}
