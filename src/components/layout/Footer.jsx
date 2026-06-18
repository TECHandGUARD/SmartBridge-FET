import { useNavigate } from 'react-router-dom';
import { BookOpen } from 'lucide-react';

export default function Footer() {
  const navigate = useNavigate();

  const handleNavigation = (path) => {
    navigate(path);
  };

  return (
    <footer className="bg-card border-t border-border mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <span className="font-playfair font-bold text-foreground">SmartBridge FET Phase</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              CAPS-aligned learning platform for South African Grades 10–12.
            </p>
            <div className="border-t border-border pt-4">
              <p className="text-xs font-semibold text-foreground mb-1">Powered by</p>
              <p className="text-xs text-muted-foreground">Tech & GUARD — Premium tech protection solutions for South Africa.</p>
            </div>
          </div>

          {/* Compliance */}
          <div>
            <h3 className="font-semibold text-foreground text-sm mb-3">Compliance</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>✅ CAPS Aligned</li>
              <li>✅ SACE Verified Tutors</li>
              <li>✅ POPIA Compliant</li>
              <li>✅ DBE Guidelines</li>
            </ul>
          </div>

          {/* Subjects */}
          <div>
            <h3 className="font-semibold text-foreground text-sm mb-3">Subjects</h3>
            <p className="text-sm text-muted-foreground">
              Mathematics, Physical Sciences, Life Sciences, Accounting, Business Studies,
              Economics, History, Geography, English HL, isiXhosa HL, Life Orientation
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-foreground text-sm mb-3">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <button onClick={() => handleNavigation('/subjects')} className="text-muted-foreground hover:text-primary hover:underline transition-colors cursor-pointer">
                  Subjects
                </button>
              </li>
              <li>
                <button onClick={() => handleNavigation('/tutors')} className="text-muted-foreground hover:text-primary hover:underline transition-colors cursor-pointer">
                  Find Tutors
                </button>
              </li>
              <li>
                <button onClick={() => handleNavigation('/resources-library')} className="text-muted-foreground hover:text-primary hover:underline transition-colors cursor-pointer">
                  CAPS Documents
                </button>
              </li>
              <li>
                <button onClick={() => handleNavigation('/premium')} className="text-muted-foreground hover:text-primary hover:underline transition-colors cursor-pointer">
                  Premium
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Second row - Legal and Resources */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="font-semibold text-foreground text-sm mb-3">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <button onClick={() => handleNavigation('/privacy')} className="text-muted-foreground hover:text-primary hover:underline transition-colors cursor-pointer">
                  Privacy Policy
                </button>
              </li>
              <li>
                <button onClick={() => handleNavigation('/terms')} className="text-muted-foreground hover:text-primary hover:underline transition-colors cursor-pointer">
                  Terms of Service
                </button>
              </li>
              <li>
                <button onClick={() => handleNavigation('/about-tech-guard')} className="text-muted-foreground hover:text-primary hover:underline transition-colors cursor-pointer">
                  About Tech & GUARD
                </button>
              </li>
              <li>
                <a href="mailto:aneleq@techandguard.co.za" className="text-muted-foreground hover:text-primary hover:underline transition-colors">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-foreground text-sm mb-3">Learning</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <button onClick={() => handleNavigation('/quiz')} className="text-muted-foreground hover:text-primary hover:underline transition-colors cursor-pointer">
                  Practice Quizzes
                </button>
              </li>
              <li>
                <button onClick={() => handleNavigation('/videos')} className="text-muted-foreground hover:text-primary hover:underline transition-colors cursor-pointer">
                  Video Lessons
                </button>
              </li>
              <li>
                <button onClick={() => handleNavigation('/study-rooms')} className="text-muted-foreground hover:text-primary hover:underline transition-colors cursor-pointer">
                  Group Study Rooms
                </button>
              </li>
              <li>
                <button onClick={() => handleNavigation('/bookings')} className="text-muted-foreground hover:text-primary hover:underline transition-colors cursor-pointer">
                  Book a Session
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-foreground text-sm mb-3">Dashboards</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <button onClick={() => handleNavigation('/student-dashboard')} className="text-muted-foreground hover:text-primary hover:underline transition-colors cursor-pointer">
                  Student Dashboard
                </button>
              </li>
              <li>
                <button onClick={() => handleNavigation('/parent-dashboard')} className="text-muted-foreground hover:text-primary hover:underline transition-colors cursor-pointer">
                  Parent Dashboard
                </button>
              </li>
              <li>
                <button onClick={() => handleNavigation('/tutor-dashboard')} className="text-muted-foreground hover:text-primary hover:underline transition-colors cursor-pointer">
                  Tutor Dashboard
                </button>
              </li>
              <li>
                <button onClick={() => handleNavigation('/admin')} className="text-muted-foreground hover:text-primary hover:underline transition-colors cursor-pointer">
                  Admin (Staff Only)
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-foreground text-sm mb-3">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <button onClick={() => handleNavigation('/search')} className="text-muted-foreground hover:text-primary hover:underline transition-colors cursor-pointer">
                  Resource Search
                </button>
              </li>
              <li>
                <button onClick={() => handleNavigation('/caps-admin')} className="text-muted-foreground hover:text-primary hover:underline transition-colors cursor-pointer">
                  CAPS Admin
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright Section */}
        <div className="border-t border-border pt-6 text-center text-xs text-muted-foreground">
          <p>
            © 2026 Tech & GUARD Pty Ltd (Registration Number: 2026/15509/09). All rights reserved.
          </p>
          <p className="mt-2">
            SmartBridge FET is an EdTech digital product owned by a black student.
          </p>
          <p className="mt-2">
            Developed for South African learners 🇿🇦
          </p>
        </div>
      </div>
    </footer>
  );
}
