// src/components/ui/PremiumBadge.jsx
import { Link } from 'react-router-dom';
import { Star, Lock, Sparkles, Crown } from 'lucide-react';
import PropTypes from 'prop-types';

// ============================================================
// 🔧 SOFT-CODED CONFIGURATION
// ============================================================

const CONFIG = {
  // Labels
  LABELS: {
    BADGE: import.meta.env.VITE_PREMIUM_BADGE_LABEL || 'PREMIUM',
    LOCK: import.meta.env.VITE_PREMIUM_LOCK_LABEL || 'Premium — Upgrade',
    UPGRADE: import.meta.env.VITE_PREMIUM_UPGRADE_LABEL || 'Upgrade →',
    UNLOCK: import.meta.env.VITE_PREMIUM_UNLOCK_LABEL || 'Unlock',
  },

  // Feature flags
  ENABLE_UPGRADE_LINK: import.meta.env.VITE_ENABLE_PREMIUM_UPGRADE_LINK !== 'false',

  // Badge styles
  BADGE_STYLES: {
    DEFAULT: import.meta.env.VITE_PREMIUM_BADGE_STYLE || 'bg-gradient-to-r from-amber-400 to-amber-500 text-white',
    GOLD: import.meta.env.VITE_PREMIUM_BADGE_GOLD_STYLE || 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white',
    DARK: import.meta.env.VITE_PREMIUM_BADGE_DARK_STYLE || 'bg-gradient-to-r from-slate-700 to-slate-900 text-white',
    PRIMARY: import.meta.env.VITE_PREMIUM_BADGE_PRIMARY_STYLE || 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground',
  },
};

// ============================================================
// Sub-Components
// ============================================================

const BadgeVariant = ({ label, icon: Icon, className = '' }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm ${className}`}>
    <Icon className="w-2.5 h-2.5 fill-current" /> {label}
  </span>
);

const OverlayVariant = ({ label, buttonText, className = '', onUpgrade }) => (
  <div className={`absolute inset-0 bg-gradient-to-br from-amber-900/70 to-black/60 flex flex-col items-center justify-center gap-2 rounded-inherit ${className}`}>
    <div className="w-10 h-10 rounded-full bg-amber-400/20 border-2 border-amber-400 flex items-center justify-center animate-pulse">
      <Lock className="w-5 h-5 text-amber-300" />
    </div>
    <span className="text-white font-bold text-xs tracking-wide">{label}</span>
    {CONFIG.ENABLE_UPGRADE_LINK && (
      <Link
        to="/premium"
        className="mt-1 px-3 py-1 rounded-full bg-amber-400 hover:bg-amber-300 text-amber-900 font-bold text-[10px] transition-all hover:scale-105"
        onClick={(e) => {
          e.stopPropagation();
          onUpgrade?.();
        }}
      >
        {buttonText}
      </Link>
    )}
  </div>
);

const LockVariant = ({ label, icon: Icon, className = '', size = 'sm' }) => {
  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  return (
    <Link
      to="/premium"
      className={`inline-flex items-center gap-1.5 font-semibold text-amber-600 hover:text-amber-700 bg-amber-50 border border-amber-200 rounded-lg transition-all hover:shadow-md ${sizeClasses[size]} ${className}`}
    >
      <Lock className={`w-3 h-3 ${size === 'lg' ? 'w-4 h-4' : ''}`} />
      {label}
      <Icon className={`w-3 h-3 fill-amber-400 text-amber-400 ${size === 'lg' ? 'w-4 h-4' : ''}`} />
    </Link>
  );
};

// ============================================================
// Main Component
// ============================================================

/**
 * PremiumBadge — visual indicator for premium-locked content.
 * 
 * @param {Object} props
 * @param {'badge'|'overlay'|'lock'|'trial'} props.variant - Display variant
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.label - Custom label text (overrides default)
 * @param {string} props.buttonText - Custom button text (overlay variant only)
 * @param {string} props.style - Badge style ('default' | 'gold' | 'dark' | 'primary')
 * @param {string} props.size - Size for lock variant ('sm' | 'md' | 'lg')
 * @param {function} props.onUpgrade - Callback when upgrade button is clicked
 * @param {boolean} props.showIcon - Whether to show the icon
 * 
 * @example
 * <PremiumBadge variant="badge" />
 * <PremiumBadge variant="overlay" label="PREMIUM" buttonText="Unlock Now" />
 * <PremiumBadge variant="lock" size="md" />
 * <PremiumBadge variant="trial" label="FREE TRIAL" style="gold" />
 */
export default function PremiumBadge({
  variant = 'badge',
  className = '',
  label,
  buttonText,
  style = 'default',
  size = 'sm',
  onUpgrade,
  showIcon = true,
}) {
  // ============================================================
  // Configuration
  // ============================================================

  const getLabel = () => {
    if (label) return label;
    return CONFIG.LABELS.BADGE;
  };

  const getButtonText = () => {
    if (buttonText) return buttonText;
    return CONFIG.LABELS.UPGRADE;
  };

  const getLockLabel = () => {
    if (label) return label;
    return CONFIG.LABELS.LOCK;
  };

  const getBadgeStyle = () => {
    const styles = {
      default: CONFIG.BADGE_STYLES.DEFAULT,
      gold: CONFIG.BADGE_STYLES.GOLD,
      dark: CONFIG.BADGE_STYLES.DARK,
      primary: CONFIG.BADGE_STYLES.PRIMARY,
    };
    return styles[style] || styles.default;
  };

  const getIcon = () => {
    if (variant === 'trial') return Sparkles;
    if (variant === 'lock') return Star;
    return Star;
  };

  const Icon = getIcon();

  // ============================================================
  // Trial Variant
  // ============================================================

  if (variant === 'trial') {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-blue-400 to-blue-500 text-white shadow-sm ${className}`}>
        <Sparkles className="w-2.5 h-2.5" /> {label || 'FREE TRIAL'}
      </span>
    );
  }

  // ============================================================
  // Badge Variant
  // ============================================================

  if (variant === 'badge') {
    return (
      <BadgeVariant
        label={getLabel()}
        icon={Icon}
        className={`${getBadgeStyle()} ${className}`}
      />
    );
  }

  // ============================================================
  // Overlay Variant
  // ============================================================

  if (variant === 'overlay') {
    return (
      <OverlayVariant
        label={getLabel()}
        buttonText={getButtonText()}
        className={className}
        onUpgrade={onUpgrade}
      />
    );
  }

  // ============================================================
  // Lock Variant
  // ============================================================

  if (variant === 'lock') {
    return (
      <LockVariant
        label={getLockLabel()}
        icon={Icon}
        className={className}
        size={size}
      />
    );
  }

  // ============================================================
  // Fallback
  // ============================================================

  return null;
}

// ============================================================
// PropTypes
// ============================================================

PremiumBadge.propTypes = {
  /** Display variant */
  variant: PropTypes.oneOf(['badge', 'overlay', 'lock', 'trial']),
  /** Additional CSS classes */
  className: PropTypes.string,
  /** Custom label text */
  label: PropTypes.string,
  /** Custom button text (overlay variant only) */
  buttonText: PropTypes.string,
  /** Badge style */
  style: PropTypes.oneOf(['default', 'gold', 'dark', 'primary']),
  /** Size for lock variant */
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  /** Callback when upgrade button is clicked */
  onUpgrade: PropTypes.func,
  /** Whether to show the icon */
  showIcon: PropTypes.bool,
};

PremiumBadge.defaultProps = {
  variant: 'badge',
  className: '',
  label: undefined,
  buttonText: undefined,
  style: 'default',
  size: 'sm',
  onUpgrade: undefined,
  showIcon: true,
};
