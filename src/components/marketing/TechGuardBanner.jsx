import { appConfig } from '@/lib/config';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
const appName = import.meta.env.VITE_APP_NAME || 'SmartBridge FET';
const techGuardUrl = import.meta.env.VITE_TECH_GUARD_URL || 'https://www.techandguard.co.za';
export default function TechGuardBanner() {
  const handleBannerClick = async () => {
    try {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      const userEmail = session?.user?.email;
      if (!session?.user?.id) return;
      const {
        error
      } = await supabase.from('banner_clicks').insert({
        banner_name: 'tech_guard',
        user_id: session.user.id,
        user_email: userEmail || null,
        click_timestamp: new Date().toISOString()
      });
      if (error) {
        console.error('Banner click tracking error:', error);
      } else {
        console.log('✅ Banner click tracked');
      }
    } catch (error) {
      console.log('Banner click tracking failed:', error);
    }
  };
  return <div className="bg-gradient-to-r from-tech-guard-blue to-tech-guard-orange py-12 px-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-8">
        {}
        <div className="flex items-center gap-6 flex-1">
          <div className="hidden sm:flex items-center justify-center w-16 h-16 bg-white/10 rounded-lg">
            {appConfig.company.logoUrl ? <img src={appConfig.company.logoUrl} alt={appConfig.company.name} className="w-10 h-10 object-contain" /> : <span className="text-white font-bold">T&amp;G</span>}
          </div>
          <div>
            <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">Tech & GUARD</h3>
            <p className="text-white/80 text-sm sm:text-base">
              Protect your devices with premium tech accessories. Quality, durability, and style combined.
            </p>
          </div>
        </div>

        {}
        <div className="flex-shrink-0">
          <a href={appConfig.company.website} target="_blank" rel="noopener noreferrer" onClick={handleBannerClick}>
            <Button className="bg-secondary hover:bg-secondary/90 text-foreground font-semibold gap-2 whitespace-nowrap">
              Explore Now
              <ArrowRight className="w-4 h-4" />
            </Button>
          </a>
        </div>
      </div>
    </div>;
}
