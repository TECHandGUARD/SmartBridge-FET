import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Crown } from 'lucide-react';

/**
 * Wraps premium-only dashboard sections.
 * Shows a lock card if user is not premium.
 * Usage: <DashboardPremiumGate isPremium={isPremium} isLoading={loading} featureName="AI Study Planner">
 *          <YourPremiumComponent />
 *        </DashboardPremiumGate>
 */
export default function DashboardPremiumGate({ isPremium, isLoading, featureName, children }) {
  if (isLoading) return null;
  if (isPremium) return children;

  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardContent className="py-8 text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-3">
          <Lock className="w-6 h-6 text-amber-600" />
        </div>
        <h3 className="font-playfair font-bold text-base mb-1">{featureName} — Premium</h3>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-4">
          Your 3-day free trial has ended. Upgrade to continue accessing this feature.
        </p>
        <Link to="/premium">
          <Button className="bg-primary gap-2" size="sm">
            <Crown className="w-4 h-4" /> Upgrade Now
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}