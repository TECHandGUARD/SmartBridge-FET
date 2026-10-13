import { useSearchParams } from 'react-router-dom';
const SECTIONS = {
  student: ['subjects', 'progress', 'ai', 'goals', 'simulations', 'bookmarks', 'messages', 'applications'],
  parent: ['child', 'progress', 'subjects', 'tutors', 'reports', 'premium'],
  tutor: ['upload', 'availability', 'students', 'earnings', 'messages', 'bookings', 'reviews', 'sessions'],
};
export function useDashboardSection(role) {
  const [params, setParams] = useSearchParams();
  const value = params.get('section');
  const activeSection = SECTIONS[role].includes(value) ? value : null;
  const toggleSection = key => {
    if (!SECTIONS[role].includes(key)) return;
    setParams(previous => {
      const next = new URLSearchParams(previous);
      if (key === activeSection) next.delete('section');
      else next.set('section', key);
      return next;
    });
  };
  return [activeSection, toggleSection];
}
