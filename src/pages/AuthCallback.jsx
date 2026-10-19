import {meetingSignInDestination,pendingMeetingReturn} from '@/lib/meeting-navigation';
import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
export default function AuthCallback() {
  const { user, isLoadingAuth, authError } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!isLoadingAuth && user) navigate(meetingSignInDestination(user,pendingMeetingReturn()), { replace: true });
  }, [user, isLoadingAuth, navigate]);
  return <main className="p-8 text-center" role="status">
    <p>{isLoadingAuth ? 'Completing sign in…' : authError?.message || (!user ? 'The sign-in link is invalid or has expired. Please sign in again.' : 'Opening your account…')}</p>
    {!isLoadingAuth && !user && <Link to="/login">Return to sign in</Link>}
  </main>;
}
