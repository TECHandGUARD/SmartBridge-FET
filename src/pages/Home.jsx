import HeroSection from '@/components/home/HeroSection';
import SubjectsPreview from '@/components/home/SubjectsPreview';
import RoleDashboardCards from '@/components/home/RoleDashboardCards';
import PremiumBanner from '@/components/home/PremiumBanner';
import TechGuardBanner from '@/components/marketing/TechGuardBanner';

export default function Home() {
  return (
    <main>
      <HeroSection />
      <TechGuardBanner />
      <SubjectsPreview />
      <RoleDashboardCards />
      <PremiumBanner />
      {/* Footer */}
      <footer className="bg-card border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-3 gap-8 mb-8">
            <div>
              <p className="font-playfair font-bold text-lg mb-2">EduConnect FET</p>
              <p className="text-sm text-muted-foreground">
                CAPS-aligned learning platform for South African Grades 10–12.
              </p>
            </div>
            <div>
              <p className="font-semibold text-sm mb-3">Compliance</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>✅ CAPS Aligned</li>
                <li>✅ SACE Verified Tutors</li>
                <li>✅ POPIA Compliant</li>
                <li>✅ DBE Guidelines</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-sm mb-3">Subjects</p>
              <p className="text-sm text-muted-foreground">
                Mathematics, Physical Sciences, Life Sciences, Accounting, Business Studies,
                Economics, History, Geography, English HL, isiXhosa HL, Life Orientation
              </p>
            </div>
          </div>
          <div className="border-t border-border pt-6 flex flex-col sm:flex-row justify-between items-center gap-2">
            <p className="text-xs text-muted-foreground">© 2026 EduConnect FET. All rights reserved.</p>
            <p className="text-xs text-muted-foreground">Developed for South African learners 🇿🇦</p>
          </div>
        </div>
      </footer>
    </main>
  );
}