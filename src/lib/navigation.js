// One route model for sign-in, onboarding and both responsive navigation surfaces.
export const TUTOR_ROLES = ['sace_tutor', 'student_tutor', 'tutor_pending', 'tutor'];
export function getDashboardPath(user) {
  if (user?.is_super_admin === true || user?.role === 'admin') return '/admin';
  if (user?.role === 'parent') return '/parent-dashboard';
  if (user?.role === 'school_counselor') return '/counselor';
  if (TUTOR_ROLES.includes(user?.role)) return '/tutor-dashboard';
  return '/student-dashboard';
}
export function getAccountDestination(user) {
  if (!user) return '/login';
  if (user.is_super_admin !== true && !user.onboarding_complete) return '/onboarding';
  return getDashboardPath(user);
}
const item = (label, path, icon) => ({ label, path, icon });
export function getNavigation(user) {
  const dashboard = item('Dashboard', getDashboardPath(user), 'dashboard');
  const subjects = item('Subjects', '/subjects', 'book');
  const tutors = item('Tutors', '/tutors', 'users');
  const resources = item('Resources', '/search', 'book');
  const forum = item('Forum', '/forum', 'forum');
  const common = [item('Home', '/', 'home'), item('Videos', '/videos', 'book'), item('Study rooms', '/study-rooms', 'users'), item('Premium', '/premium', 'star')];
  if (user?.is_super_admin || user?.role === 'admin') return {
    primary: [dashboard, item('CAPS Admin', '/caps-admin', 'book'), resources, item('Counselor', '/counselor', 'users')],
    secondary: [...common, subjects, tutors, forum, item('Bookings', '/bookings', 'users'), item('Payout log', '/payout-log', 'dashboard'), item('Practice', '/quiz', 'practice'), item('Bursaries', '/bursaries', 'book'), item('Opportunities', '/opportunities', 'book')],
  };
  if (user?.role === 'school_counselor') return { primary: [dashboard, resources], secondary: [item('Home', '/', 'home')] };
  if (user?.role === 'parent') return {
    primary: [dashboard, tutors, item('Opportunities', '/opportunities', 'book'), forum],
    secondary: [item('Link a learner', '/parent-dashboard?section=child', 'users'), item('Progress reports', '/parent-dashboard?section=progress', 'dashboard'), item('Bursaries', '/bursaries', 'book'), ...common],
  };
  if (TUTOR_ROLES.includes(user?.role)) return {
    primary: [dashboard, resources, item('CAPS Docs', '/resources-library', 'book'), forum],
    secondary: [subjects, item('My bookings', '/tutor-dashboard?section=bookings', 'users'), ...common],
  };
  return {
    primary: [dashboard, subjects, item('Practice', '/quiz', 'practice'), tutors],
    secondary: [resources, item('Bookings', '/bookings', 'users'), forum, item('Bursaries', '/bursaries', 'book'), item('Opportunities', '/opportunities', 'book'), ...common],
  };
}
export function isNavigationActive(location, path) {
  const [pathname, query] = path.split('?');
  if (query) return location.pathname === pathname && new URLSearchParams(location.search).get('section') === new URLSearchParams(query).get('section');
  return location.pathname === pathname || (pathname !== '/' && location.pathname.startsWith(`${pathname}/`));
}
