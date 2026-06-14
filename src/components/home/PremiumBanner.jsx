import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Star, Zap, Shield, Download } from 'lucide-react';

export default function PremiumBanner() {
  return (
    <section className="py-20 bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden bg-gradient-to-br from-primary to-green-dark rounded-3xl p-8 sm:p-12 text-primary-foreground">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-secondary/20 blur-3xl" />

          <div className="relative grid sm:grid-cols-2 gap-8 items-center">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-5 h-5 text-secondary fill-secondary" />
                <span className="font-semibold text-secondary">Premium Membership</span>
              </div>
              <h2 className="font-playfair text-3xl sm:text-4xl font-bold mb-4 leading-tight">
                Unlock Everything — From R20/month
              </h2>
              <p className="text-primary-foreground/80 mb-6 leading-relaxed">
                Students from R20 · Parents from R50 · Tutors from R150.
                Get full access to premium resources, past papers, tutor notes, and more.
              </p>
              <Link to="/premium">
                <Button size="lg" className="bg-secondary hover:bg-secondary/90 text-secondary-foreground gap-2">
                  <Star className="w-4 h-4 fill-current" /> Upgrade to Premium
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Download, text: 'Unlimited Downloads' },
                { icon: Shield, text: 'Ad-Free Experience' },
                { icon: Zap, text: 'Premium Tutor Notes' },
                { icon: Star, text: 'Priority Support' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                  <Icon className="w-5 h-5 text-secondary mb-2" />
                  <p className="text-sm font-medium">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
