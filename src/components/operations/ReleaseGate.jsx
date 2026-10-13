import PropTypes from 'prop-types';
import { isReleaseFeatureEnabled } from '@/lib/release-scope';
export default function ReleaseGate({ feature, children }) {
  if (isReleaseFeatureEnabled(feature)) return children;
  return <div role="status" className="rounded-xl border bg-muted/30 p-5 text-sm text-muted-foreground">
    This feature is not available in the first release.
  </div>;
}
ReleaseGate.propTypes = { feature: PropTypes.string.isRequired, children: PropTypes.node };
