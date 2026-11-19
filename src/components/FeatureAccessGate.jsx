import { useAuth } from '@/lib/AuthContext';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';

export default function FeatureAccessGate({ featureKey, children }) {
  const { user } = useAuth();
  const { isEnabled, loading, error, getLockedMessage } = useFeatureFlags(user);
  if (loading) return <div role="status" className="p-8 text-center">Checking feature access…</div>;
  if (error) return <div role="alert" className="p-8 text-center">Unable to verify feature access. Please try again later.</div>;
  if (!isEnabled(featureKey)) return <div role="alert" className="p-8 text-center">{getLockedMessage(featureKey)}</div>;
  return children;
}
