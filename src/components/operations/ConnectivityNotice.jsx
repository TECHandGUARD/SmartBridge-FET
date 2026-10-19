import { useEffect, useState } from 'react';

export default function ConnectivityNotice() {
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  if (!offline) return null;
  return <div role="status" aria-live="polite" className="sticky top-0 z-[100] border-b border-amber-400 bg-amber-100 px-4 py-3 text-center text-sm font-medium text-amber-950">
    You are offline. SmartBridge needs an internet connection for AI answers, bookings and most learning tools. Reconnect to continue.
  </div>;
}
