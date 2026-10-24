import { useSearchParams } from 'react-router-dom';
import { isDashboardSectionEnabled } from './release-scope';
const SECTIONS = {
  student: ['subjects', 'progress', 'ai', 'goals', 'simulations', 'bookmarks', 'messages', 'applications'],
  parent: ['child', 'progress', 'subjects', 'tutors', 'reports', 'premium', 'messages'],
  tutor: ['classroom', 'lesson-studio', 'upload', 'availability', 'students', 'earnings', 'messages', 'bookings', 'reviews', 'sessions'],
};
/** @returns {[string|null, (key:string)=>void]} */
export function useDashboardSection(role) {
  const [params, setParams] = useSearchParams();
  const value = params.get('section');
  const activeSection = SECTIONS[role].includes(value) && isDashboardSectionEnabled(role,value) ? value : null;
  const toggleSection = key => {
    if (!SECTIONS[role].includes(key) || !isDashboardSectionEnabled(role,key)) return;
    setParams(previous => {
      const next = new URLSearchParams(previous);
      if (key === activeSection) next.delete('section');
      else next.set('section', key);
      return next;
    });
  };
  return [activeSection, toggleSection];
}
