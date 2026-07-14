// src/components/ui/TrialBanner.jsx
import { Link } from 'react-router-dom';
import { Sparkles, X, Clock, Crown, Zap } from 'lucide-react';
import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

// ============================================================
// 🔧 SOFT-CODED CONFIGURATION
// ============================================================

const CONFIG = {
  // Feature flags
  ENABLE_DISMISS: import.meta.env.VITE_TRIAL_ENABLE_DISMISS !== 'false',

  // Messages
  MESSAGES: {
    TITLE: import.meta.env.VITE_TRIAL_TITLE || '🎉 You\'re on a {trialDays}-day free trial',
    DAYS_LEFT: import.meta.env.VITE_TRIAL_DAYS_LEFT || '{days} days left.',
    LAST_DAY: import.meta.env.VITE_TRIAL_LAST_DAY || 'last day!',
    DESCRIPTION: import.meta.env.VITE_TRIAL_DESCRIPTION || 'Enjoy full premium access.',
    UPGRADE: import.meta.env.VITE_TRIAL_UPGRADE || 'Upgrade to keep it →',
    UPGRADE_NOW: import.meta.env.VITE_TRIAL_UPGRADE_NOW || 'Upgrade Now',
    EXPIRED_TITLE: import.meta.env.VITE_TRIAL_EXPIRED_TITLE || '⏰ Your free trial has ended',
    EXPIRED_DESC: import.meta.env.VITE_TRIAL_EXPIRED_DESC || 'Upgrade now to continue accessing premium features.',
  },

  // Banner styles
  STYLES: {
    ACTIVE: import.meta.env.VITE_TRIAL_ACTIVE_STYLE || 'bg-gradient-to-r from-amber-400 to-amber-500 text-white',
    URGENT: import.meta.env.VITE_TRIAL_URGENT_STYLE || 'bg-gradient-to-r from-red-500 to-orange-500 text-white',
    EXPIRED: import.meta.env.VITE_TRIAL_EXPIRED_STYLE || 'bg-gradient-to-r from-gray-500 to-gray-700 text-white',
    DEFAULT: import.meta.env.VITE_TRIAL_DEFAULT_STYLE || 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground',
  },

  // Animation
  ANIMATION: import.meta.env.VITE_TRIAL_ANIMATION || 'slide-down',

  // Dismissal
  DISMISS_DURATION: Number(import.meta.env.VITE_TRIAL_DISMISS_DURATION) || 0, // 0 = never auto-dismiss
};

// ============================================================
// Sub-Components
// ============================================================

const TrialBadge = ({ daysLeft }) => {
  const isUrgent = daysLeft <= 2;
  const color = isUrgent ? 'bg-red-500/20 text-red-100' : 'bg-white/20 text-white';

  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${color}`}>
      {isUrgent ? '⚠️ Urgent' : '✨ Active'}
    </span>
  );
};

// ============================================================
// Main Component
// ============================================================

/**
 * TrialBanner - Shows a dismissible banner when the user is on a free trial.
 *
 * @param {Object} props
 * @param {number} props.trialDaysLeft - Days left in the trial (0 = expired)
 * @param {string} props.variant - Banner style ('active' | 'urgent' | 'expired' | 'default')
 * @param {string} props.position - Banner position ('top' | 'bottom')
 * @param {boolean} props.dismissible - Whether the banner can be dismissed
 * @param {string} props.customTitle - Override the title
 * @param {string} props.customDescription - Override the description
 * @param {string} props.customUpgradeText - Override the upgrade button text
 * @param {string} props.className - Additional CSS classes
 * @param {function} props.onDismiss - Callback when banner is dismissed
 * @param {function} props.onUpgrade - Callback when upgrade button is clicked
 *
 * @example
 * <TrialBanner trialDaysLeft={5} />
 * <TrialBanner trialDaysLeft={1} variant="urgent" />
 * <TrialBanner trialDaysLeft={0} variant="expired" />
 */
export default function TrialBanner({
  trialDaysLeft,
  variant = 'active',
  position = 'top',
  dismissible = true,
  customTitle,
  customDescription,
  customUpgradeText,
  className = '',
  onDismiss,
  onUpgrade,
}) {
  // ============================================================
  // State
  // ============================================================

  const [dismissed, setDismissed] = useState(false);

  // ============================================================
  // Effect: Auto-dismiss after duration
  // ============================================================

  useEffect(() => {
    if (CONFIG.DISMISS_DURATION > 0 && !dismissed) {
      const timer = setTimeout(() => {
        setDismissed(true);
        onDismiss?.();
      }, CONFIG.DISMISS_DURATION * 1000);

      return () => clearTimeout(timer);
    }
  }, [dismissed, onDismiss]);

  // ============================================================
  // Early Returns
  // ============================================================

  // Don't show if dismissed or no days left (unless expired variant)
  if (dismissed) return null;
  if (trialDaysLeft === undefined || trialDaysLeft === null) return null;

  // If trial has expired, show expired banner
  const isExpired = trialDaysLeft <= 0;

  // ============================================================
  // Configuration
  // ============================================================

  const getStyle = () => {
    if (variant === 'urgent' || (trialDaysLeft <= 2 && !isExpired)) {
      return CONFIG.STYLES.URGENT;
    }
    if (isExpired) {
      return CONFIG.STYLES.EXPIRED;
    }
    const styles = {
      active: CONFIG.STYLES.ACTIVE,
      default: CONFIG.STYLES.DEFAULT,
    };
    return styles[variant] || styles.default;
  };

  const getTitle = () => {
    if (customTitle) return customTitle;
    if (isExpired) return CONFIG.MESSAGES.EXPIRED_TITLE;
    return CONFIG.MESSAGES.TITLE.replace('{trialDays}', import.meta.env.VITE_TRIAL_DEFAULT_DAYS || '3');
  };

  const getDescription = () => {
    if (customDescription) return customDescription;
    if (isExpired) return CONFIG.MESSAGES.EXPIRED_DESC;

    const daysLeftText = trialDaysLeft === 1
      ? CONFIG.MESSAGES.LAST_DAY
      : CONFIG.MESSAGES.DAYS_LEFT.replace('{days}', trialDaysLeft);

    return `${daysLeftText} ${CONFIG.MESSAGES.DESCRIPTION}`;
  };

  const getUpgradeText = () => {
    if (customUpgradeText) return customUpgradeText;
    return isExpired ? CONFIG.MESSAGES.UPGRADE_NOW : CONFIG.MESSAGES.UPGRADE;
  };

  const getIcon = () => {
    if (isExpired) return Clock;
    if (trialDaysLeft <= 2) return Zap;
    return Sparkles;
  };

  const Icon = getIcon();
  const style = getStyle();
  const title = getTitle();
  const description = getDescription();
  const upgradeText = getUpgradeText();
  const isDismissible = dismissible && CONFIG.ENABLE_DISMISS;

  // ============================================================
  // Handlers
  // ============================================================

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  const handleUpgrade = () => {
    onUpgrade?.();
  };

  // ============================================================
  // Animation Classes
  // ============================================================

  const animationClasses = {
    'slide-down': 'animate-slide-down',
    'slide-up': 'animate-slide-up',
    'fade-in': 'animate-fade-in',
    'bounce-in': 'animate-bounce-in',
  };

  const animationClass = animationClasses[CONFIG.ANIMATION] || '';

  // ============================================================
  // Position Classes
  // ============================================================

  const positionClasses = {
    top: 'sticky top-0 z-50',
    bottom: 'fixed bottom-0 z-50',
  };

  // ============================================================
  // Render
  // ============================================================

  return (
    <div
      className={`w-full ${style} px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm font-medium shadow-md ${positionClasses[position]} ${className} ${animationClass}`}
      role="banner"
      aria-label={isExpired ? 'Trial expired' : 'Free trial active'}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="flex-shrink-0 mt-0.5">
          <Icon className="w-5 h-5" />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-semibold">{title}</span>
          <span className="opacity-90">{description}</span>

          {!isExpired && <TrialBadge daysLeft={trialDaysLeft} />}

          <Link
            to="/premium"
            className="underline underline-offset-2 hover:opacity-80 transition-opacity font-semibold whitespace-nowrap"
            onClick={handleUpgrade}
          >
            {upgradeText}
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {isDismissible && (
          <button
            onClick={handleDismiss}
            className="hover:opacity-70 transition-opacity p-1 rounded-full hover:bg-white/10"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// PropTypes
// ============================================================

TrialBanner.propTypes = {
  /** Days left in the trial (0 = expired) */
  trialDaysLeft: PropTypes.number.isRequired,
  /** Banner style variant */
  variant: PropTypes.oneOf(['active', 'urgent', 'expired', 'default']),
  /** Banner position */
  position: PropTypes.oneOf(['top', 'bottom']),
  /** Whether the banner can be dismissed */
  dismissible: PropTypes.bool,
  /** Override the title */
  customTitle: PropTypes.string,
  /** Override the description */
  customDescription: PropTypes.string,
  /** Override the upgrade button text */
  customUpgradeText: PropTypes.string,
  /** Additional CSS classes */
  className: PropTypes.string,
  /** Callback when banner is dismissed */
  onDismiss: PropTypes.func,
  /** Callback when upgrade button is clicked */
  onUpgrade: PropTypes.func,
};

TrialBanner.defaultProps = {
  variant: 'active',
  position: 'top',
  dismissible: true,
  customTitle: undefined,
  customDescription: undefined,
  customUpgradeText: undefined,
  className: '',
  onDismiss: undefined,
  onUpgrade: undefined,
};
