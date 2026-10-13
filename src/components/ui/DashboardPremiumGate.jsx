// src/components/ui/DashboardPremiumGate.jsx
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Crown, Sparkles } from 'lucide-react';
import PropTypes from 'prop-types';

// ============================================================
// 🔧 SOFT-CODED CONFIGURATION
// ============================================================

const CONFIG = {
  // Feature flags
  ENABLE_UPSELL: import.meta.env.VITE_ENABLE_PREMIUM_UPSELL !== 'false',

  // Messages
  MESSAGES: {
    TITLE: import.meta.env.VITE_PREMIUM_GATE_TITLE || '{featureName} — Premium',
    DESCRIPTION: import.meta.env.VITE_PREMIUM_GATE_DESC || 'Your 3-day free trial has ended. Upgrade to continue accessing this feature.',
    BUTTON: import.meta.env.VITE_PREMIUM_GATE_BUTTON || 'Upgrade Now',
    LOADING: import.meta.env.VITE_PREMIUM_GATE_LOADING || 'Checking access...',
    TRIAL_TITLE: import.meta.env.VITE_PREMIUM_GATE_TRIAL_TITLE || '{featureName} — Free Trial',
    TRIAL_DESC: import.meta.env.VITE_PREMIUM_GATE_TRIAL_DESC || 'You are on a free trial. Enjoy this feature for {daysLeft} more day(s)!',
    TRIAL_BUTTON: import.meta.env.VITE_PREMIUM_GATE_TRIAL_BUTTON || 'Start Exploring',
  },
};

// ============================================================
// Main Component
// ============================================================

/**
 * Wraps premium-only dashboard sections.
 * Shows a lock card if user is not premium.
 *
 * @param {Object} props
 * @param {boolean} props.isPremium - Whether the user has premium access
 * @param {boolean} props.isLoading - Whether premium status is loading
 * @param {string} props.featureName - Name of the feature being gated
 * @param {React.ReactNode} props.children - Content to show if premium
 * @param {boolean} props.isOnTrial - Whether the user is on a trial
 * @param {number} props.trialDaysLeft - Days left in trial
 * @param {string} props.customTitle - Override the default title
 * @param {string} props.customDescription - Override the default description
 * @param {string} props.customButtonText - Override the default button text
 * @param {string} props.size - Size of the gate card ('sm' | 'md' | 'lg')
 *
 * @example
 * <DashboardPremiumGate
 *   isPremium={isPremium}
 *   isLoading={premLoading}
 *   featureName="AI Study Planner"
 *   isOnTrial={isOnTrial}
 *   trialDaysLeft={trialDaysLeft}
 * >
 *   <AIStudyPlanner user={user} />
 * </DashboardPremiumGate>
 */
export default function DashboardPremiumGate({
  isPremium,
  isLoading,
  featureName,
  children,
  isOnTrial = false,
  trialDaysLeft = 0,
  customTitle,
  customDescription,
  customButtonText,
  size = 'md',
}) {
  // ============================================================
  // Early Returns
  // ============================================================

  // Show nothing while loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        <span className="ml-3 text-sm text-muted-foreground">{CONFIG.MESSAGES.LOADING}</span>
      </div>
    );
  }

  // If premium, render children
  if (isPremium) {
    return children;
  }

  // If premium upsell is disabled, show nothing
  if (!CONFIG.ENABLE_UPSELL) {
    return null;
  }

  // ============================================================
  // Size Configuration
  // ============================================================

  const sizeClasses = {
    sm: 'py-6 px-4',
    md: 'py-8 px-6',
    lg: 'py-12 px-8',
  };

  const iconSizes = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  const iconContainerSizes = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  const titleSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
  };

  // ============================================================
  // Content Configuration
  // ============================================================

  // Determine which message to show
  const isTrialActive = isOnTrial && trialDaysLeft > 0;

  const title = customTitle || (isTrialActive
    ? CONFIG.MESSAGES.TRIAL_TITLE.replace('{featureName}', featureName)
    : CONFIG.MESSAGES.TITLE.replace('{featureName}', featureName));

  const description = customDescription || (isTrialActive
    ? CONFIG.MESSAGES.TRIAL_DESC.replace('{daysLeft}', trialDaysLeft)
    : CONFIG.MESSAGES.DESCRIPTION);

  const buttonText = customButtonText || (isTrialActive
    ? CONFIG.MESSAGES.TRIAL_BUTTON
    : CONFIG.MESSAGES.BUTTON);

  const icon = isTrialActive ? Sparkles : Lock;
  const iconColor = isTrialActive ? 'text-blue-600' : 'text-amber-600';
  const iconBg = isTrialActive ? 'bg-blue-100' : 'bg-amber-100';
  const Icon = icon;
  const borderColor = isTrialActive ? 'border-blue-200' : 'border-amber-200';
  const bgColor = isTrialActive ? 'bg-blue-50/50' : 'bg-amber-50/50';

  // ============================================================
  // Render
  // ============================================================

  return (
    <Card className={`${borderColor} ${bgColor} border`}>
      <CardContent className={`${sizeClasses[size]} text-center`}>
        <div className={`${iconContainerSizes[size]} ${iconBg} rounded-2xl flex items-center justify-center mx-auto mb-3`}>
          <Icon className={`${iconSizes[size]} ${iconColor}`} />
        </div>

        <h3 className={`font-playfair font-bold ${titleSizes[size]} mb-1`}>
          {title}
        </h3>

        <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-4">
          {description}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
          <Link to="/premium">
            <Button className="bg-primary hover:bg-primary/90 gap-2 shadow-sm hover:shadow-md transition-all duration-300" size="sm">
              <Crown className="w-4 h-4" /> {buttonText}
            </Button>
          </Link>

          {isTrialActive && (
            <Link to="/premium">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Learn More
              </Button>
            </Link>
          )}
        </div>

        {isTrialActive && trialDaysLeft > 0 && (
          <p className="text-xs text-blue-600 mt-3 font-medium">
            ⏳ {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} remaining in your trial
          </p>
        )}

        {!isTrialActive && !isPremium && (
          <p className="text-[10px] text-muted-foreground/60 mt-3">
            🔒 Upgrade to unlock {featureName} and all premium features
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// PropTypes
// ============================================================

DashboardPremiumGate.propTypes = {
  /** Whether the user has premium access */
  isPremium: PropTypes.bool.isRequired,
  /** Whether premium status is loading */
  isLoading: PropTypes.bool,
  /** Name of the feature being gated */
  featureName: PropTypes.string.isRequired,
  /** Content to show if premium */
  children: PropTypes.node.isRequired,
  /** Whether the user is on a trial */
  isOnTrial: PropTypes.bool,
  /** Days left in trial */
  trialDaysLeft: PropTypes.number,
  /** Override the default title */
  customTitle: PropTypes.string,
  /** Override the default description */
  customDescription: PropTypes.string,
  /** Override the default button text */
  customButtonText: PropTypes.string,
  /** Size of the gate card ('sm' | 'md' | 'lg') */
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
};

DashboardPremiumGate.defaultProps = {
  isLoading: false,
  isOnTrial: false,
  trialDaysLeft: 0,
  customTitle: undefined,
  customDescription: undefined,
  customButtonText: undefined,
  size: 'md',
};
