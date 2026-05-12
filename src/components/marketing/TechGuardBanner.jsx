import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/supabaseClient';

export default function TechGuardBanner() {
  const handleBannerClick = async () => {
    try {
      // Get current user session
      const { data: { session } } = await supabase.auth.getSession();
      const userEmail = session?.user?.email;
      
      // Track banner click in banner_clicks table
      await supabase
        .from('banner_clicks')
        .insert({
          banner_name: "tech_guard",
          user_email: userEmail || null,
          clicked_at: new Date().toISOString()
        });
      
      console.log('Banner click tracked');
    } catch (error) {
      console.log('Banner click tracking failed:', error);
    }
  };

  return (
    <div className="bg-gradient-to-r from-tech-guard-blue to-tech-guard-orange py-12 px-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-8">
        {/* Left: Logo and Content */}
        <div className="flex items-center gap-6 flex-1">
          <div className="hidden sm:flex items-center justify-center w-16 h-16 bg-white/10 rounded-lg">
            <img src="https://media.base44.com/images/public/69f6ba09033268ca85425d9c/de3a26233_tech-guard.png" alt="Tech & GUARD" className="w-10 h-10 object-contain" />
          </div>
          <div>
            <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">Tech & GUARD</h3>
            <p className="text-white/80 text-sm sm:text-base">
              Protect your devices with premium tech accessories. Quality, durability, and style combined.
            </p>
          </div>
        </div>

        {/* Right: CTA Button */}
        <div className="flex-shrink-0">
          <a href="https://www.techandguard.co.za" target="_blank" rel="noopener noreferrer" onClick={handleBannerClick}>
            <Button 
              className="bg-secondary hover:bg-secondary/90 text-foreground font-semibold gap-2 whitespace-nowrap"
            >
              Explore Now
              <ArrowRight className="w-4 h-4" />
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}