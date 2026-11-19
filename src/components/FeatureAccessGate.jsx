import { Button } from '@/components/ui/button';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';

export default function FeatureAccessGate({ featureKey, children }) {
  const { isEnabled, loading, error, getLockedMessage, retry } = useFeatureFlags();
  if (loading) return <div role="status" className="p-8 text-center">Checking feature access…</div>;
  if (error) return <div className="space-y-3 p-8 text-center">
    <p role="alert">Unable to verify feature access.</p>
    <Button variant="outline" onClick={() => retry()}>Try again</Button>
  </div>;
  if (!isEnabled(featureKey)) return <div role="alert" className="p-8 text-center">{getLockedMessage(featureKey)}</div>;
  return children;
}
