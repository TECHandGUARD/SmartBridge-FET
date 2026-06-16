import { Link } from 'react-router-dom';
import { Star, Lock } from 'lucide-react';

/**
 * PremiumBadge — visual indicator for premium-locked content.
 * variant: "badge" (inline tag), "overlay" (full card overlay), "lock" (inline lock with upgrade link)
 */
export default function PremiumBadge({ variant = 'badge', className = '' }) {
  if (variant === 'badge') {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-amber-400 to-amber-500 text-white shadow-sm ${className}`}>
        <Star className="w-2.5 h-2.5 fill-current" /> PREMIUM
      </span>
    );
  }

  if (variant === 'overlay') {
    return (
      <div className={`absolute inset-0 bg-gradient-to-br from-amber-900/70 to-black/60 flex flex-col items-center justify-center gap-2 rounded-inherit ${className}`}>
        <div className="w-10 h-10 rounded-full bg-amber-400/20 border-2 border-amber-400 flex items-center justify-center">
          <Lock className="w-5 h-5 text-amber-300" />
        </div>
        <span className="text-white font-bold text-xs tracking-wide">PREMIUM</span>
        <Link
          to="/premium"
          className="mt-1 px-3 py-1 rounded-full bg-amber-400 hover:bg-amber-300 text-amber-900 font-bold text-[10px] transition-colors"
          onClick={e => e.stopPropagation()}
        >
          Upgrade →
        </Link>
      </div>
    );
  }

  if (variant === 'lock') {
    return (
      <Link
        to="/premium"
        className={`inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 hover:text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1 transition-colors ${className}`}
      >
        <Lock className="w-3 h-3" />
        Premium — Upgrade
        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
      </Link>
    );
  }

  return null;
}