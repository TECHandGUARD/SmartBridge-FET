import { Link } from 'react-router-dom';
import { Lock, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PremiumGate() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock className="w-10 h-10 text-amber-600" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-3">Premium Feature</h2>
        <p className="text-muted-foreground mb-6">
          Student Opportunities — including university application links, NBT preparation resources, AI guidance, and prospectuses — is available exclusively to Premium subscribers.
        </p>
        <Button asChild className="bg-amber-500 hover:bg-amber-600 text-white font-semibold gap-2">
          <Link to="/premium">
            <Star className="w-4 h-4 fill-current" />
            Upgrade to Premium
          </Link>
        </Button>
      </div>
    </div>
  );
}