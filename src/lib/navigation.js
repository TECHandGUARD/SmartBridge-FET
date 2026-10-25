// One route model for sign-in, onboarding and both responsive navigation surfaces.
export const TUTOR_ROLES = ['sace_tutor', 'student_tutor', 'tutor_pending', 'tutor'];
export function getDashboardPath(user) {
  if (user?.is_super_admin === true || user?.role === 'admin') return '/admin';
  if (user?.staff_access?.enabled === true) return '/staff';
  if (user?.role === 'parent') return '/parent-dashboard';
  if (user?.role === 'school_counselor') return '/counselor';
  if (TUTOR_ROLES.includes(user?.role)) return '/tutor-dashboard';
  return '/student-dashboard';
}
export function getAccountDestination(user) {
  if (!user) return '/login';
  if (user.is_super_admin !== true && user?.staff_access?.enabled !== true && !user.onboarding_complete) return '/onboarding';
  return getDashboardPath(user);
}
const item = (label, path, icon) => ({ label, path, icon });
export function getNavigation(user) {
  const dashboard = item('Dashboard', getDashboardPath(user), 'dashboard');
  const subjects = item('Subjects', '/subjects', 'book');
  const tutors = item('Tutors', '/tutors', 'users');
  const resources = item('Learning Hub', '/learning-hub', 'book');
  const practice = item('Practice & Assessments', '/practice-hub', 'practice');
  const communication = item('Communication', '/communication', 'forum');
  const careers = item('Career Opportunities', '/career-hub', 'book');
  const forum = item('Forum', '/forum', 'forum');
  const common = [item('Invite a friend','/refer','users'), item('News & events','/news','book'), item('Home', '/', 'home'), item('Premium', '/premium', 'star')];
  if (user?.is_super_admin || user?.role === 'admin') return {
    primary: [dashboard, item('CAPS Admin', '/caps-admin', 'book'), resources, item('Counselor', '/counselor', 'users')],
    secondary: [communication, ...common, subjects, tutors, forum, item('Bookings', '/bookings', 'users'), item('Payout log', '/payout-log', 'dashboard'), practice, careers],
  };
  if (user?.staff_access?.enabled === true) return {primary:[dashboard,resources],secondary:[item('Home','/','home')]};
  if (user?.role === 'school_counselor') return { primary: [dashboard, resources], secondary: [item('Home', '/', 'home')] };
  if (user?.role === 'parent') return {
    primary: [dashboard, tutors, careers, communication],
    secondary: [item('Link a learner', '/parent-dashboard?section=child', 'users'), item('Progress reports', '/parent-dashboard?section=progress', 'dashboard'), ...common],
  };
  if (TUTOR_ROLES.includes(user?.role)) return {
    primary: [dashboard, practice, resources, communication],
    secondary: [subjects, item('My bookings', '/tutor-dashboard?section=bookings', 'users'), ...common],
  };
  return {
    primary: [dashboard, resources, practice, tutors],
    secondary: [communication, item('Bookings', '/bookings', 'users'), forum, careers, ...common],
  };
}
export function isNavigationActive(location, path) {
  const [pathname, query] = path.split('?');
  if (query) return location.pathname === pathname && new URLSearchParams(location.search).get('section') === new URLSearchParams(query).get('section');
  return location.pathname === pathname || (pathname !== '/' && location.pathname.startsWith(`${pathname}/`));
}
