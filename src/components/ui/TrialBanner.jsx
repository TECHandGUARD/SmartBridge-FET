import { Link } from 'react-router-dom';
import { Sparkles, X } from 'lucide-react';
import { useState } from 'react';

/**
 * Shows a dismissible banner when the user is on a free trial.
 */
export default function TrialBanner({ trialDaysLeft }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || !trialDaysLeft) return null;

  return (
    <div className="w-full bg-gradient-to-r from-amber-400 to-amber-500 text-white px-4 py-2 flex items-center justify-between gap-3 text-sm font-medium shadow-sm">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 flex-shrink-0" />
        <span>
          🎉 You're on a <strong>3-day free trial</strong> —{' '}
          {trialDaysLeft === 1 ? 'last day!' : `${trialDaysLeft} days left.`}{' '}
          Enjoy full premium access.
        </span>
        <Link
          to="/premium"
          className="underline underline-offset-2 hover:text-amber-900 transition-colors whitespace-nowrap"
        >
          Upgrade to keep it →
        </Link>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="flex-shrink-0 hover:opacity-70 transition-opacity"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}